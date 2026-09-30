import Fuse from 'fuse.js';
import type { Recipe } from './types';

let fuse: Fuse<Recipe> | null = null;
let indexed: Recipe[] | null = null;

const keys = [
  { name: 'title', weight: 0.6 },
  { name: 'ingredients.name', weight: 0.2 },
  { name: 'cuisine', weight: 0.08 },
  { name: 'main', weight: 0.06 },
  { name: 'vibes', weight: 0.03 },
  { name: 'meals', weight: 0.03 },
];

/** Typo-tolerant search. Every word in the query must fuzzy-match somewhere. */
export function searchRecipes(all: Recipe[], query: string): Recipe[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return all;
  if (indexed !== all) {
    fuse = new Fuse(all, { keys, threshold: 0.32, ignoreLocation: true, includeScore: true, minMatchCharLength: 2 });
    indexed = all;
  }
  const expr = { $and: tokens.map((t) => ({ $or: keys.map((k) => ({ [k.name]: t })) })) };
  return fuse!.search(expr as never).map((r) => r.item);
}
