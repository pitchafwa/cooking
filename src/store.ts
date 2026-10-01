import { signal, effect, Signal } from '@preact/signals';
import { canon } from './ingredients';

/** A signal mirrored to localStorage. Phase 4 swaps this for Firestore sync. */
function persisted<T>(key: string, initial: T): Signal<T> {
  let value = initial;
  try {
    const raw = localStorage.getItem('hub:' + key);
    if (raw) value = JSON.parse(raw) as T;
  } catch { /* private mode or corrupt data: fall back to the default */ }
  const s = signal<T>(value);
  effect(() => {
    try { localStorage.setItem('hub:' + key, JSON.stringify(s.value)); } catch { /* ignore */ }
  });
  return s;
}

export const DEFAULT_STAPLES = ['salt', 'black pepper', 'water', 'olive oil', 'vegetable oil'];

export const pantry = persisted<string[]>('pantry', []);
export const favorites = persisted<string[]>('favorites', []);
/** pantry items flagged "use soon" */
export const useSoon = persisted<string[]>('useSoon', []);
export const assumeStaples = persisted<boolean>('assumeStaples', true);

/** Add an already-canonical name. */
function pantryAdd(n: string) {
  if (n && !pantry.value.includes(n)) pantry.value = [...pantry.value, n].sort();
}
export const addToPantry = (name: string) => pantryAdd(canon(name));
/** Accepts "eggs, milk, flour" style input. */
export const addMany = (text: string) => text.split(/[,\n;]+/).forEach(addToPantry);
export function removeFromPantry(name: string) {
  pantry.value = pantry.value.filter((p) => p !== name);
  useSoon.value = useSoon.value.filter((p) => p !== name);
}
export const toggleUseSoon = (name: string) =>
  (useSoon.value = useSoon.value.includes(name) ? useSoon.value.filter((p) => p !== name) : [...useSoon.value, name]);

// ---------- grocery list ----------

export interface GroceryItem {
  name: string;
  done: boolean;
  /** checking this off is what put it in the pantry (so un-checking takes it back out) */
  stocked?: boolean;
}
export const grocery = persisted<GroceryItem[]>('grocery', []);

/** Add canonical names (from recipes or the buy panel); skips ones already listed and not yet bought. */
export function addToGrocery(names: string[]) {
  const have = new Set(grocery.value.filter((g) => !g.done).map((g) => g.name));
  const fresh = [...new Set(names)].filter((n) => n && !have.has(n));
  if (fresh.length) grocery.value = [...grocery.value.filter((g) => !fresh.includes(g.name)), ...fresh.map((name) => ({ name, done: false }))];
}
export const addManyToGrocery = (text: string) => addToGrocery(text.split(/[,\n;]+/).map(canon));

/** Checking off at the store stocks the pantry; un-checking undoes that. */
export function toggleGrocery(name: string) {
  grocery.value = grocery.value.map((g) => {
    if (g.name !== name) return g;
    if (!g.done) {
      const stock = !pantry.value.includes(name);
      pantryAdd(name);
      return { ...g, done: true, stocked: stock };
    }
    if (g.stocked) removeFromPantry(name);
    return { name, done: false };
  });
}
export const removeFromGrocery = (name: string) => (grocery.value = grocery.value.filter((g) => g.name !== name));
export const clearBought = () => (grocery.value = grocery.value.filter((g) => !g.done));
export const onList = (name: string) => grocery.value.some((g) => g.name === name && !g.done);

export function toggleFavorite(id: string) {
  favorites.value = favorites.value.includes(id) ? favorites.value.filter((f) => f !== id) : [...favorites.value, id];
}
