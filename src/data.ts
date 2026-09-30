import { signal } from '@preact/signals';
import type { Recipe } from './types';

export const recipes = signal<Recipe[]>([]);
export const loadState = signal<'loading' | 'ready' | 'error'>('loading');

export async function loadRecipes() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/recipes.json`);
    if (!res.ok) throw new Error(String(res.status));
    recipes.value = (await res.json()) as Recipe[];
    loadState.value = 'ready';
  } catch {
    loadState.value = 'error';
  }
}
