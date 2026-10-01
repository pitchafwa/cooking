import { route } from './router';
import { loadState, recipes } from './data';
import { pantry, favorites } from './store';
import { Browse } from './components/Browse';
import { RecipeDetail } from './components/RecipeDetail';
import { Pantry } from './components/Pantry';

const TABS = [
  { id: 'recipes', label: 'Recipes' },
  { id: 'pantry', label: 'Pantry' },
  { id: 'favorites', label: 'Favorites' },
];

export function App() {
  const r = route.value;
  const tab = r.startsWith('recipe/') ? 'recipes' : r;

  let page;
  if (loadState.value === 'loading') page = <p class="empty">Gathering the recipes…</p>;
  else if (loadState.value === 'error') page = <p class="empty">Couldn't load recipes. Try refreshing.</p>;
  else if (r.startsWith('recipe/')) page = <RecipeDetail id={r.slice(7)} />;
  else if (r === 'pantry') page = <Pantry />;
  else if (r === 'favorites') page = <Browse favoritesOnly />;
  else page = <Browse />;

  return (
    <div class="shell">
      <header class="top">
        <a class="brand" href="#/recipes">
          <svg class="mark" width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><circle cx="13" cy="13" r="11.5" /><circle cx="13" cy="13" r="4" fill="currentColor" stroke="none" opacity="0.35" /></svg>
          our kitchen
        </a>
        <nav class="tabs">
          {TABS.map((t) => (
            <a key={t.id} href={`#/${t.id}`} class={tab === t.id ? 'tab active' : 'tab'}>
              {t.label}
              {t.id === 'pantry' && <small>{pantry.value.length}</small>}
              {t.id === 'favorites' && favorites.value.length > 0 && <small>{favorites.value.length}</small>}
            </a>
          ))}
        </nav>
      </header>
      <main>{page}</main>
      <footer class="foot">
        {recipes.value.length.toLocaleString()} recipes
         · Recipes courtesy of <a href="https://www.food.com" target="_blank" rel="noopener">Food.com</a> members
      </footer>
    </div>
  );
}
