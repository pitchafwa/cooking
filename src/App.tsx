import { route } from './router';
import { loadState, recipes } from './data';
import { pantry, favorites } from './store';
import { Browse } from './components/Browse';
import { RecipeDetail } from './components/RecipeDetail';
import { Pantry } from './components/Pantry';

const TABS = [
  { id: 'recipes', label: 'Recipes', icon: '🍓' },
  { id: 'pantry', label: 'Pantry', icon: '🫙' },
  { id: 'favorites', label: 'Favorites', icon: '💗' },
];

export function App() {
  const r = route.value;
  const tab = r.startsWith('recipe/') ? 'recipes' : r;

  let page;
  if (loadState.value === 'loading') page = <p class="empty">Gathering the recipes… ✨</p>;
  else if (loadState.value === 'error') page = <p class="empty">Couldn't load recipes. Try refreshing.</p>;
  else if (r.startsWith('recipe/')) page = <RecipeDetail id={r.slice(7)} />;
  else if (r === 'pantry') page = <Pantry />;
  else if (r === 'favorites') page = <Browse favoritesOnly />;
  else page = <Browse />;

  return (
    <div class="shell">
      <header class="top">
        <a class="brand" href="#/recipes">
          <span class="brand-script">our</span> kitchen <span class="sparkle">✦</span>
        </a>
        <nav class="tabs">
          {TABS.map((t) => (
            <a key={t.id} href={`#/${t.id}`} class={tab === t.id ? 'tab active' : 'tab'}>
              <span aria-hidden="true">{t.icon}</span> {t.label}
              {t.id === 'pantry' && <small>{pantry.value.length}</small>}
              {t.id === 'favorites' && favorites.value.length > 0 && <small>{favorites.value.length}</small>}
            </a>
          ))}
        </nav>
      </header>
      <main>{page}</main>
      <footer class="foot">
        {recipes.value.length} recipes
        {recipes.value.some((r) => r.source.name === 'Food.com') && (
          <> · Recipe data from <a href="https://www.food.com" target="_blank" rel="noopener">Food.com</a> (CC BY-NC-SA 4.0)</>
        )}
      </footer>
    </div>
  );
}
