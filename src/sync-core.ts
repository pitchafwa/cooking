/**
 * Sync logic, independent of Firebase so it can be tested with a fake server.
 *
 * Remote shape: one shared document. Plain lists (pantry, favorites, useSoon) merge with add/remove so two people
 * adding at once both keep their items; grocery items live in a map keyed by name so edits don't clobber each other.
 */
import { effect, batch } from '@preact/signals';
import { pantry, favorites, useSoon, grocery, assumeStaples, type GroceryItem } from './store';

export interface RemoteItem { done: boolean; stocked?: boolean; at: number }
export interface RemoteState {
  pantry: string[]; favorites: string[]; useSoon: string[]; assumeStaples?: boolean;
  grocery: Record<string, RemoteItem>;
}
export type SetField = 'pantry' | 'favorites' | 'useSoon';
export type Op =
  | { t: 'add'; field: SetField; values: string[] }
  | { t: 'remove'; field: SetField; values: string[] }
  | { t: 'item'; name: string; item: RemoteItem }
  | { t: 'drop'; name: string }
  | { t: 'staples'; value: boolean };

export interface Adapter {
  /** calls onState with the full remote state now and after every change (including our own writes) */
  subscribe(onState: (s: RemoteState) => void, onError: (e: unknown) => void): () => void;
  write(ops: Op[]): Promise<void>;
}
export interface Hooks { onSynced(): void; onError(e: unknown): void }

const MERGED_KEY = 'hub:merged';
const SET_FIELDS: SetField[] = ['pantry', 'favorites', 'useSoon'];

export const emptyRemote = (): RemoteState => ({ pantry: [], favorites: [], useSoon: [], grocery: {} });

export function readLocal(): { pantry: string[]; favorites: string[]; useSoon: string[]; assumeStaples: boolean; grocery: GroceryItem[] } {
  return { pantry: pantry.value, favorites: favorites.value, useSoon: useSoon.value, assumeStaples: assumeStaples.value, grocery: grocery.value };
}

export function diff(remote: RemoteState, local: ReturnType<typeof readLocal>, now = Date.now()): Op[] {
  const ops: Op[] = [];
  for (const field of SET_FIELDS) {
    const r = new Set(remote[field]), l = new Set(local[field]);
    const add = local[field].filter((x) => !r.has(x));
    const remove = remote[field].filter((x) => !l.has(x));
    if (remove.length) ops.push({ t: 'remove', field, values: remove });
    if (add.length) ops.push({ t: 'add', field, values: add });
  }
  if (local.assumeStaples !== (remote.assumeStaples ?? true)) ops.push({ t: 'staples', value: local.assumeStaples });
  const names = new Set<string>();
  local.grocery.forEach((g, i) => {
    names.add(g.name);
    const r = remote.grocery[g.name];
    if (!r || r.done !== g.done || !!r.stocked !== !!g.stocked) {
      ops.push({ t: 'item', name: g.name, item: { done: g.done, ...(g.stocked ? { stocked: true } : {}), at: r?.at ?? now + i } });
    }
  });
  for (const name of Object.keys(remote.grocery)) if (!names.has(name)) ops.push({ t: 'drop', name });
  return ops;
}

export function applyOps(remote: RemoteState, ops: Op[]): RemoteState {
  const next: RemoteState = { ...remote, pantry: [...remote.pantry], favorites: [...remote.favorites], useSoon: [...remote.useSoon], grocery: { ...remote.grocery } };
  for (const op of ops) {
    if (op.t === 'add') next[op.field] = [...new Set([...next[op.field], ...op.values])];
    else if (op.t === 'remove') next[op.field] = next[op.field].filter((x) => !op.values.includes(x));
    else if (op.t === 'item') next.grocery[op.name] = op.item;
    else if (op.t === 'drop') delete next.grocery[op.name];
    else next.assumeStaples = op.value;
  }
  return next;
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Put remote state into the local signals (only touching what changed). */
function setLocal(s: RemoteState) {
  batch(() => {
    const sorted = (x: string[]) => [...x].sort();
    if (!sameList(pantry.value, sorted(s.pantry))) pantry.value = sorted(s.pantry);
    if (!sameList(favorites.value, s.favorites)) favorites.value = [...s.favorites];
    if (!sameList(useSoon.value, s.useSoon)) useSoon.value = [...s.useSoon];
    const staples = s.assumeStaples ?? true;
    if (assumeStaples.value !== staples) assumeStaples.value = staples;
    const items: GroceryItem[] = Object.entries(s.grocery)
      .sort((a, b) => a[1].at - b[1].at)
      .map(([name, r]) => ({ name, done: r.done, ...(r.stocked ? { stocked: true } : {}) }));
    if (JSON.stringify(items) !== JSON.stringify(grocery.value)) grocery.value = items;
  });
}

/** First time this device connects, keep what's already here: union local data into the household's. */
function mergeLocal(s: RemoteState): RemoteState {
  const local = readLocal();
  const merged = applyOps(s, [
    ...SET_FIELDS.map((field) => ({ t: 'add' as const, field, values: local[field] })),
    ...local.grocery.filter((g) => !s.grocery[g.name]).map((g, i) => ({ t: 'item' as const, name: g.name, item: { done: g.done, ...(g.stocked ? { stocked: true } : {}), at: Date.now() + i } })),
  ]);
  return merged;
}

const hasMerged = () => { try { return localStorage.getItem(MERGED_KEY) === '1'; } catch { return false; } };
const markMerged = () => { try { localStorage.setItem(MERGED_KEY, '1'); } catch { /* ignore */ } };

/** Start syncing. Returns a function that stops it. */
export function connect(adapter: Adapter, hooks: Hooks): () => void {
  let remote: RemoteState | null = null;

  // Send whatever differs between local and remote.
  const push = () => {
    const local = readLocal(); // read first so the effect subscribes even before the first snapshot
    if (!remote) return;
    const ops = diff(remote, local);
    if (!ops.length) return;
    remote = applyOps(remote, ops); // optimistic, so repeated runs don't re-send
    adapter.write(ops).catch(hooks.onError);
  };
  // Local edits -> remote (re-runs whenever any synced signal changes)
  const stopEffect = effect(push);

  // Remote -> local
  const unsubscribe = adapter.subscribe((s) => {
    const first = remote === null;
    if (first && !hasMerged()) {
      remote = s;
      setLocal(mergeLocal(s));
      push(); // signals may not have changed, so push local-only data explicitly
      markMerged();
    } else {
      remote = s;
      setLocal(s);
    }
    if (first) hooks.onSynced();
  }, hooks.onError);

  return () => { stopEffect(); unsubscribe(); };
}
