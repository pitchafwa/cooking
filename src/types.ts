export type Difficulty = 'easy' | 'medium' | 'involved';

export interface Ingredient {
  /** canonical name, matched against the pantry */
  name: string;
  /** display text from the source, e.g. "garlic cloves" */
  text: string;
  /** quantity from the source (no units in the dataset), e.g. "1 1/2" */
  qty?: string;
}

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
  /** names only at index time; text/qty arrive with the details */
  ingredients: Ingredient[];
}

/** Lazily fetched from details/<b>.json when a recipe opens. */
export interface RecipeDetailData {
  steps: string[];
  ings: { text: string; qty?: string }[];
  description?: string;
  servings?: number;
  source: { name: string; url?: string };
}
