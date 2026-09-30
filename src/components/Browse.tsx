import { signal, computed } from '@preact/signals';
import { recipes } from '../data';
import { favorites } from '../store';
import { onHand, missingFor } from '../match';
import { searchRecipes } from '../search';
import { RecipeCard } from './RecipeCard';

const query = signal('');
const cuisine = signal('');
const meal = signal('');
const main = signal('');
const maxTime = signal(0);
const difficulty = signal('');
const vibes = signal<string[]>([]);
const diets = signal<string[]>([]);
const avail = signal<'any' | 'ready' | 'two' | 'five'>('any');
const sort = signal<'match' | 'quick' | 'rated'>('match');
const showFilters = signal(false);

const pretty = (s: string) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const options = (pick: (r: (typeof recipes.value)[number]) => string | string[]) =>
  [...new Set(recipes.value.flatMap((r) => [pick(r)].flat()))].filter(Boolean).sort();

const toggle = (s: typeof vibes, v: string) => (s.value = s.value.includes(v) ? s.value.filter((x) => x !== v) : [...s.value, v]);
const activeCount = computed(() =>
  [cuisine.value, meal.value, main.value, maxTime.value, difficulty.value].filter(Boolean).length +
  vibes.value.length + diets.value.length + (avail.value !== 'any' ? 1 : 0));

function reset() {
  cuisine.value = meal.value = main.value = difficulty.value = '';
  maxTime.value = 0; vibes.value = []; diets.value = []; avail.value = 'any';
}

function Select({ label, sig, opts }: { label: string; sig: typeof cuisine; opts: string[] }) {
  return (
    <label class="field">
      <span>{label}</span>
      <select value={sig.value} onChange={(e) => (sig.value = (e.target as HTMLSelectElement).value)}>
        <option value="">Any</option>
        {opts.map((o) => <option key={o} value={o}>{pretty(o)}</option>)}
      </select>
    </label>
  );
}

function Chips({ label, sig, opts }: { label: string; sig: typeof vibes; opts: string[] }) {
  return (
    <div class="field">
      <span>{label}</span>
      <div class="chipset">
        {opts.map((o) => (
          <button key={o} type="button" class={sig.value.includes(o) ? 'fchip on' : 'fchip'} aria-pressed={sig.value.includes(o)} onClick={() => toggle(sig, o)}>
            {pretty(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Browse({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const have = onHand.value;
  let list = searchRecipes(recipes.value, query.value);
  if (favoritesOnly) list = list.filter((r) => favorites.value.includes(r.id));

  const miss = new Map(list.map((r) => [r.id, missingFor(r, have).length]));
  const maxMissing = { any: Infinity, ready: 0, two: 2, five: 5 }[avail.value];
  list = list.filter(
    (r) =>
      (!cuisine.value || r.cuisine === cuisine.value) &&
      (!meal.value || r.meals.includes(meal.value)) &&
      (!main.value || r.main === main.value) &&
      (!maxTime.value || r.minutes <= maxTime.value) &&
      (!difficulty.value || r.difficulty === difficulty.value) &&
      vibes.value.every((v) => r.vibes.includes(v)) &&
      diets.value.every((d) => r.diets.includes(d)) &&
      miss.get(r.id)! <= maxMissing,
  );

  // Text search keeps relevance order; otherwise sort by the chosen option.
  if (!query.value.trim()) {
    list = [...list].sort((a, b) =>
      sort.value === 'quick' ? a.minutes - b.minutes
      : sort.value === 'rated' ? (b.rating ?? 0) - (a.rating ?? 0)
      : miss.get(a.id)! - miss.get(b.id)! || (b.rating ?? 0) - (a.rating ?? 0));
  }

  return (
    <section>
      <h1 class="page-title">{favoritesOnly ? 'Our favorites 💗' : 'What shall we cook?'}</h1>
      <div class="searchbar">
        <input
          type="search" value={query.value} placeholder="Search recipes or ingredients…"
          onInput={(e) => (query.value = (e.target as HTMLInputElement).value)} aria-label="Search recipes"
        />
        <button class="btn ghost" onClick={() => (showFilters.value = !showFilters.value)} aria-expanded={showFilters.value}>
          Filters{activeCount.value ? ` (${activeCount.value})` : ''}
        </button>
      </div>

      <div class="seg" role="group" aria-label="Pantry match">
        {([['any', 'Anything'], ['ready', 'Cook now'], ['two', 'Need ≤ 2'], ['five', 'Need ≤ 5']] as const).map(([k, l]) => (
          <button key={k} class={avail.value === k ? 'on' : ''} onClick={() => (avail.value = k)}>{l}</button>
        ))}
      </div>

      {showFilters.value && (
        <div class="filters">
          <Select label="Cuisine" sig={cuisine} opts={options((r) => r.cuisine)} />
          <Select label="Meal" sig={meal} opts={options((r) => r.meals)} />
          <Select label="Main ingredient" sig={main} opts={options((r) => r.main)} />
          <label class="field">
            <span>Time</span>
            <select value={maxTime.value} onChange={(e) => (maxTime.value = Number((e.target as HTMLSelectElement).value))}>
              <option value="0">Any</option><option value="15">15 min or less</option>
              <option value="30">30 min or less</option><option value="60">Under an hour</option>
            </select>
          </label>
          <Select label="Effort" sig={difficulty} opts={['easy', 'medium', 'involved']} />
          <label class="field">
            <span>Sort</span>
            <select value={sort.value} onChange={(e) => (sort.value = (e.target as HTMLSelectElement).value as typeof sort.value)}>
              <option value="match">Best pantry match</option><option value="quick">Quickest</option><option value="rated">Top rated</option>
            </select>
          </label>
          <Chips label="Diet" sig={diets} opts={['vegetarian', 'vegan', 'gluten-free', 'dairy-free']} />
          <Chips label="Vibe" sig={vibes} opts={options((r) => r.vibes)} />
          <button class="btn ghost" onClick={reset}>Clear filters</button>
        </div>
      )}

      <p class="count">{list.length} recipe{list.length === 1 ? '' : 's'}</p>
      {list.length === 0 ? (
        <p class="empty">
          {favoritesOnly && !favorites.value.length ? 'Tap the ♡ on a recipe to keep it here.' : 'Nothing matches — try loosening a filter ✨'}
        </p>
      ) : (
        <div class="grid">{list.slice(0, 120).map((r) => <RecipeCard key={r.id} r={r} have={have} />)}</div>
      )}
    </section>
  );
}
