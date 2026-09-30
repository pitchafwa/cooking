import { signal } from '@preact/signals';
import type { Recipe, RecipeDetailData } from './types';
import { setCanonRules } from './ingredients';
import { buildSearchIndex } from './search';

export const recipes = signal<Recipe[]>([]);
export const loadState = signal<'loading' | 'ready' | 'error'>('loading');

const url = (p: string) => `${import.meta.env.BASE_URL}data/${p}`;

export async function loadRecipes() {
  fetch(url('canon.json')).then((r) => r.json()).then(setCanonRules).catch(() => { /* typed names just skip alias rules */ });
  try {
    const res = await fetch(url('recipes.json'));
    if (!res.ok) throw new Error(String(res.status));
    recipes.value = (await res.json()) as Recipe[];
    loadState.value = 'ready';
    // build the search index while the browser is idle so the first keystroke is fast
    const warm = () => buildSearchIndex(recipes.value);
    if ('requestIdleCallback' in window) requestIdleCallback(warm); else setTimeout(warm, 50);
  } catch {
    loadState.value = 'error';
  }
}

const shards = new Map<number, Promise<Record<string, RecipeDetailData>>>();

export async function fetchDetail(r: Recipe): Promise<RecipeDetailData> {
  if (!shards.has(r.b)) {
    shards.set(r.b, fetch(url(`details/${r.b}.json`)).then((res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    }).catch((e) => { shards.delete(r.b); throw e; }));
  }
  const d = (await shards.get(r.b)!)[r.id];
  if (!d) throw new Error('missing');
  return d;
}
