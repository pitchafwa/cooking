import { computed } from '@preact/signals';
import type { Ingredient, Recipe } from './types';
import { pantry, assumeStaples, DEFAULT_STAPLES } from './store';

/** Everything we treat as "on hand": the pantry plus (optionally) common staples. */
export const onHand = computed(() => {
  const s = new Set(pantry.value);
  if (assumeStaples.value) DEFAULT_STAPLES.forEach((x) => s.add(x));
  return s;
});

export const missingFor = (r: Recipe, have: Set<string>): Ingredient[] =>
  r.ingredients.filter((i) => !have.has(i.name));

export interface Availability {
  missing: Ingredient[];
  label: string;
  tone: 'ready' | 'close' | 'far';
}

export function availability(r: Recipe, have: Set<string>): Availability {
  const missing = missingFor(r, have);
  if (missing.length === 0) return { missing, label: 'Ready to cook', tone: 'ready' };
  const label = `Need ${missing.length} more`;
  return { missing, label, tone: missing.length <= 3 ? 'close' : 'far' };
}
