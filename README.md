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
The app loads `public/data/recipes.json` (slim search index) and, when a recipe opens, `public/data/details/<n>.json`
(steps, quantities, source). Both are generated and committed, so CI only needs `npm run build`.

Rebuild from the [Food.com recipes & reviews dataset](https://www.kaggle.com/datasets/irkaal/foodcom-recipes-and-reviews):
```
curl -L -o data/raw/d.zip https://www.kaggle.com/api/v1/datasets/download/irkaal/foodcom-recipes-and-reviews
unzip data/raw/d.zip recipes.csv -d data/raw
npm run data:build -- --recipes data/raw/recipes.csv --limit 15000
```
Keeps well-rated recipes (>=4 reviews, >=4.4 stars), normalizes ingredient names (`ALIASES` in
`scripts/build_recipes.py`), and infers cuisine/diet/vibe/difficulty tags (`scripts/taxonomy.py`).
Known limits of the source: quantities have no units, and only line up with ingredients for ~30% of recipes.

After changing ingredient rules in either `scripts/build_recipes.py` or `src/ingredients.ts`, run
`python3 scripts/check_canon_parity.py` to confirm the pipeline and the browser normalize names identically.

`npm run data:sample` overwrites the data with a tiny 38-recipe fixture (handy for offline work).

## Deploy
Repo Settings → Pages → Source: **GitHub Actions**. Pushes to `main` (and the current dev branch) deploy automatically.

## Status
Phase 1 done (browse, fuzzy search, filters, pantry-aware badges, basic pantry, favorites, recipe detail) on 15k Food.com recipes.
Phase 2 done: typed names are normalized ("Eggs" -> egg), owning cheddar covers "cheese" (and similar substitutions),
pantry grouped by aisle with quick-add and "use soon" flags, a "worth picking up" panel (best single item / best 3-item
trip to unlock recipes), and a skip-pricey-extras toggle.
Next: grocery list (3), cloud sync (4), polish (5).
