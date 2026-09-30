export type Difficulty = 'easy' | 'medium' | 'involved';

/** Slim record from the search index (recipes.json). */
export interface Recipe {
  id: string;
  title: string;
  /** original Food.com title when we renamed it to the dish name */
  alt?: string;
  /** shard number for fetching RecipeDetailData */
  b: number;
  cuisine: string;
  minutes: number;
  difficulty: Difficulty;
  meals: string[];
  vibes: string[];
  diets: string[];
  main: string;
  rating?: number | null;
  ratingCount?: number | null;
  /** canonical ingredient names; display text and quantities arrive with the details */
  ings: string[];
}

/** Lazily fetched from details/<b>.json when a recipe opens. */
export interface RecipeDetailData {
  steps: string[];
  ings: { text: string; qty?: string }[];
  description?: string;
  servings?: number;
  source: { name: string; url?: string };
}
