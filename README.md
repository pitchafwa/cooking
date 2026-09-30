# Our Kitchen 🌸

A cozy cooking hub: track your pantry, find recipes you can make with what you have, and keep favorites.
Static web app (Vite + Preact + TypeScript) hosted on GitHub Pages.

## Develop
```
npm install
npm run dev        # http://localhost:5173
npm run build
```

## Recipe data
`public/data/recipes.json` is what the app loads.

- `npm run data:sample` — regenerate the small hand-made sample set (default, 38 recipes).
- `npm run data:build -- --recipes data/raw/RAW_recipes.csv --interactions data/raw/RAW_interactions.csv --limit 4000`
  — build from the [Food.com dataset](https://www.kaggle.com/datasets/shuyangli94/food-com-recipes-and-user-interactions)
  (CC BY-NC-SA 4.0). Download the CSVs into `data/raw/` (git-ignored). Keeps the best-rated recipes, normalizes
  ingredient names, and infers cuisine/diet/vibe/difficulty tags (`scripts/taxonomy.py`).

## Deploy
Repo Settings → Pages → Source: **GitHub Actions**. Pushes to `main` deploy automatically.

## Status
Phase 1 done (browse, fuzzy search, filters, pantry-aware badges, basic pantry, favorites, recipe detail).
See the project plan in the chat history for phases 2–5 (smarter recommendations, grocery list, cloud sync, polish).
