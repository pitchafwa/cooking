import { computed } from '@preact/signals';
import type { Recipe } from './types';
import { recipes } from './data';
import { pantry, useSoon, assumeStaples, DEFAULT_STAPLES } from './store';
import { generalizations, costTier } from './ingredients';

/** Everything we treat as "on hand": pantry items, what they can stand in for, and (optionally) staples. */
export const onHand = computed(() => {
  const s = new Set<string>();
  for (const p of pantry.value) {
    s.add(p);
    generalizations(p).forEach((g) => s.add(g));
  }
  if (assumeStaples.value) DEFAULT_STAPLES.forEach((x) => s.add(x));
  return s;
});

/** recipe id -> names of ingredients we don't have */
export const missingById = computed(() => {
  const have = onHand.value;
  const m = new Map<string, string[]>();
  for (const r of recipes.value) m.set(r.id, r.ings.filter((n) => !have.has(n)));
  return m;
});

/** recipe-ingredient name -> the "use soon" pantry item that covers it */
export const soonCovers = computed(() => {
  const m = new Map<string, string>();
  for (const u of useSoon.value) [u, ...generalizations(u)].forEach((n) => m.has(n) || m.set(n, u));
  return m;
});

export const soonUsed = (r: Recipe, covers: Map<string, string>): string[] =>
  [...new Set(r.ings.map((n) => covers.get(n)).filter((x): x is string => !!x))];

export const missingFor = (r: Recipe, have: Set<string>): string[] => r.ings.filter((n) => !have.has(n));

export interface Availability {
  missing: string[];
  label: string;
  tone: 'ready' | 'close' | 'far';
}

export function availability(r: Recipe, have: Set<string>): Availability {
  const missing = missingFor(r, have);
  if (missing.length === 0) return { missing, label: 'Ready to cook', tone: 'ready' };
  return { missing, label: `Need ${missing.length} more`, tone: missing.length <= 3 ? 'close' : 'far' };
}

/** Mostly-sweet bakes (desserts, breads); everything else counts as a meal. */
export const isBaking = (r: Recipe) =>
  r.meals.some((m) => m === 'dessert' || m === 'bread') && !r.meals.some((m) => ['dinner', 'lunch', 'soup', 'salad', 'breakfast'].includes(m));

export const hasPricey = (names: string[]) => names.some((n) => costTier(n) === 3);

// ---------- "what should I buy?" ----------

export interface Single { name: string; unlocks: number; near: number; tier: number }
export interface Plan { items: string[]; unlocks: number }

/**
 * From the recipes in `list`, find what to buy:
 *  - singles: items that, bought alone, make recipes cookable (ranked by count)
 *  - plan: the best trip of up to `size` items (greedy) and how many recipes it unlocks
 */
export function suggestPurchases(list: Recipe[], missing: Map<string, string[]>, skipPricey: boolean, size = 3) {
  const cands = list
    .map((r) => missing.get(r.id)!)
    .filter((m) => m.length >= 1 && m.length <= size && !(skipPricey && hasPricey(m)));

  const single = new Map<string, { unlocks: number; near: number }>();
  for (const m of cands) for (const n of m) {
    const e = single.get(n) ?? { unlocks: 0, near: 0 };
    if (m.length === 1) e.unlocks++; else e.near++;
    single.set(n, e);
  }
  const singles: Single[] = [...single]
    .map(([name, e]) => ({ name, ...e, tier: costTier(name) }))
    .sort((a, b) => b.unlocks - a.unlocks || b.near - a.near)
    .slice(0, 10);

  // Greedy trip: each round pick the item that finishes the most recipes, breaking ties by recipes it brings closer.
  let remaining = cands.map((m) => new Set(m));
  const items: string[] = [];
  const counts: number[] = [];
  for (let round = 0; round < size; round++) {
    const score = new Map<string, [number, number]>();
    for (const rem of remaining) for (const n of rem) {
      const e = score.get(n) ?? [0, 0];
      if (rem.size === 1) e[0]++; else e[1] += 1 / (rem.size * rem.size);
      score.set(n, e);
    }
    let best: string | null = null, bs: [number, number] = [-1, -1];
    for (const [n, s] of score) if (s[0] > bs[0] || (s[0] === bs[0] && s[1] > bs[1])) { best = n; bs = s; }
    if (!best) break;
    items.push(best);
    remaining.forEach((rem) => rem.delete(best!));
    counts.push(remaining.filter((rem) => rem.size === 0).length);
  }
  while (items.length > 1 && counts[items.length - 1] === counts[items.length - 2]) { items.pop(); counts.pop(); }
  const unlocks = counts[counts.length - 1] ?? 0;
  const plan: Plan | null = items.length && unlocks > 0 ? { items, unlocks } : null;
  return { singles, plan, total: cands.length };
}
