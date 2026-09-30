export type Difficulty = 'easy' | 'medium' | 'involved';

export interface Ingredient {
  /** canonical name, matched against the pantry */
  name: string;
  /** display text, e.g. "2 cloves garlic" */
  text: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string | null;
  cuisine: string;
  minutes: number;
  difficulty: Difficulty;
  meals: string[];
  vibes: string[];
  diets: string[];
  main: string;
  servings?: number;
  rating?: number | null;
  ratingCount?: number | null;
  ingredients: Ingredient[];
  steps: string[];
  source: { name: string; url?: string };
}
