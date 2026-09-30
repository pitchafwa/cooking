import { signal } from '@preact/signals';
import type { Recipe, RecipeDetailData } from './types';

export const recipes = signal<Recipe[]>([]);
export const loadState = signal<'loading' | 'ready' | 'error'>('loading');

const url = (p: string) => `${import.meta.env.BASE_URL}data/${p}`;

export async function loadRecipes() {
  try {
    const res = await fetch(url('recipes.json'));
    if (!res.ok) throw new Error(String(res.status));
    const rows = (await res.json()) as (Omit<Recipe, 'ingredients'> & { ings: string[] })[];
    recipes.value = rows.map(({ ings, ...r }) => ({ ...r, ingredients: ings.map((name) => ({ name, text: name })) }));
    loadState.value = 'ready';
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
