import { route } from './router';
import { loadState, recipes } from './data';
import { pantry, favorites, grocery } from './store';
import { Browse } from './components/Browse';
import { RecipeDetail } from './components/RecipeDetail';
import { Pantry } from './components/Pantry';
import { Grocery } from './components/Grocery';
import { SyncPage } from './components/SyncPage';
import { Plan } from './components/Plan';
import { syncState } from './sync';

const TABS = [
  { id: 'recipes', label: 'Recipes' },
  { id: 'pantry', label: 'Pantry' },
  { id: 'grocery', label: 'Grocery' },
  { id: 'plan', label: 'Plan' },
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
  else if (r === 'grocery') page = <Grocery />;
  else if (r === 'plan') page = <Plan />;
  else if (r === 'sync') page = <SyncPage />;
  else if (r === 'favorites') page = <Browse favoritesOnly />;
  else page = <Browse />;

  return (
    <div class="shell">
      <a class="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <header class="top">
        <a class="brand" href="#/recipes">
          <svg class="mark" width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><circle cx="13" cy="13" r="11.5" /><circle cx="13" cy="13" r="4" fill="currentColor" stroke="none" opacity="0.35" /></svg>
          our kitchen
        </a>
        <nav class="tabs">
          {TABS.map((t) => (
            <a key={t.id} href={`#/${t.id}`} class={tab === t.id ? 'tab active' : 'tab'} aria-current={tab === t.id ? 'page' : undefined}>
              {t.label}
              {t.id === 'pantry' && <small>{pantry.value.length}</small>}
              {t.id === 'grocery' && grocery.value.some((g) => !g.done) && <small>{grocery.value.filter((g) => !g.done).length}</small>}
              {t.id === 'favorites' && favorites.value.length > 0 && <small>{favorites.value.length}</small>}
            </a>
          ))}
        </nav>
        <a class={tab === 'sync' ? 'synclink active' : 'synclink'} href="#/sync">
          <i class={`dot ${syncState.value.mode}`} aria-hidden="true" /> Sync
        </a>
      </header>
      <main id="main" tabIndex={-1}>{page}</main>
      <footer class="foot">
        {recipes.value.length.toLocaleString()} recipes
         · Recipes courtesy of <a href="https://www.food.com" target="_blank" rel="noopener">Food.com</a> members
      </footer>
    </div>
  );
}
