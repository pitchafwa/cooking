import { signal, computed, effect } from '@preact/signals';
import type { Recipe } from '../types';
import { recipes } from '../data';
import { favorites, pantry, useSoon } from '../store';
import { onHand, missingById, soonCovers, soonUsed, hasPricey, suggestPurchases, isBaking } from '../match';
import { searchRecipes } from '../search';
import { RecipeCard } from './RecipeCard';

/** what the user has typed (immediate) vs. what drives the search (debounced) */
const typed = signal('');
const query = signal('');
let debounce: ReturnType<typeof setTimeout> | undefined;
const setTyped = (v: string) => {
  typed.value = v;
  clearTimeout(debounce);
  debounce = setTimeout(() => (query.value = v), v ? 140 : 0);
};
const cuisine = signal('');
const meal = signal('');
const main = signal('');
const maxTime = signal(0);
const difficulty = signal('');
const vibes = signal<string[]>([]);
const diets = signal<string[]>([]);
const avail = signal<'any' | 'ready' | 'two' | 'five'>('any');
const sort = signal<'match' | 'quick' | 'rated' | 'soon'>('match');
const skipPricey = signal(false);
/** what the "worth picking up" panel optimizes for */
const buyFor = signal<'meals' | 'baking' | 'all'>('meals');
/** show recipes that would become cookable after buying exactly these */
const focus = signal<string[]>([]);
const showFilters = signal(false);
const shown = signal(60);

// Any change to the search or filters restarts pagination.
effect(() => {
  [query.value, cuisine.value, meal.value, main.value, maxTime.value, difficulty.value, vibes.value, diets.value, avail.value, skipPricey.value, focus.value];
  shown.value = 60;
});

const pretty = (s: string) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const optionsOf = (pick: (r: Recipe) => string | string[]) =>
  computed(() => [...new Set(recipes.value.flatMap((r) => [pick(r)].flat()))].filter(Boolean).sort());
const cuisineOpts = optionsOf((r) => r.cuisine);
const mealOpts = optionsOf((r) => r.meals);
const mainOpts = optionsOf((r) => r.main);
const vibeOpts = optionsOf((r) => r.vibes);

const toggle = (s: typeof vibes, v: string) => (s.value = s.value.includes(v) ? s.value.filter((x) => x !== v) : [...s.value, v]);
const activeCount = computed(() =>
  [cuisine.value, meal.value, main.value, maxTime.value, difficulty.value].filter(Boolean).length +
  vibes.value.length + diets.value.length + (avail.value !== 'any' ? 1 : 0) + (skipPricey.value ? 1 : 0));

function reset() {
  shown.value = 60;
  cuisine.value = meal.value = main.value = difficulty.value = '';
  maxTime.value = 0; vibes.value = []; diets.value = []; avail.value = 'any'; skipPricey.value = false; focus.value = [];
}

// ---- cached pipeline: each step recomputes only when its own inputs change ----

const searched = computed(() => searchRecipes(recipes.value, query.value));

/** everything except the pantry-based filters; the "what to buy" panel works from this set */
const base = computed(() =>
  searched.value.filter(
    (r) =>
      (!cuisine.value || r.cuisine === cuisine.value) &&
      (!meal.value || r.meals.includes(meal.value)) &&
      (!main.value || r.main === main.value) &&
      (!maxTime.value || r.minutes <= maxTime.value) &&
      (!difficulty.value || r.difficulty === difficulty.value) &&
      vibes.value.every((v) => r.vibes.includes(v)) &&
      diets.value.every((d) => r.diets.includes(d)),
  ));

const ranked = computed(() => {
  const miss = missingById.value;
  const covers = soonCovers.value;
  const maxMissing = { any: Infinity, ready: 0, two: 2, five: 5 }[avail.value];
  let list = base.value.filter((r) => {
    const m = miss.get(r.id)!;
    if (skipPricey.value && hasPricey(m)) return false;
    if (focus.value.length) return m.length > 0 && m.every((n) => focus.value.includes(n));
    return m.length <= maxMissing;
  });
  // Text search keeps relevance order; otherwise sort by the chosen option.
  if (!query.value.trim()) {
    const soonCount = new Map<string, number>();
    if (sort.value === 'soon') list.forEach((r) => soonCount.set(r.id, soonUsed(r, covers).length));
    list = [...list].sort((a, b) =>
      sort.value === 'quick' ? a.minutes - b.minutes
      : sort.value === 'rated' ? (b.rating ?? 0) - (a.rating ?? 0)
      : sort.value === 'soon' ? soonCount.get(b.id)! - soonCount.get(a.id)! || miss.get(a.id)!.length - miss.get(b.id)!.length
      : miss.get(a.id)!.length - miss.get(b.id)!.length || (b.rating ?? 0) - (a.rating ?? 0));
  }
  return list;
});

const buyVisible = computed(() => !focus.value.length && avail.value !== 'ready' && pantry.value.length > 0);
const buy = computed(() =>
  buyVisible.value
    ? suggestPurchases(base.value.filter((r) => buyFor.value === 'all' || (buyFor.value === 'baking') === isBaking(r)), missingById.value, skipPricey.value)
    : null);

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
  const covers = soonCovers.value;
  let list = ranked.value;
  if (favoritesOnly) {
    const fav = new Set(favorites.value);
    list = list.filter((r) => fav.has(r.id));
  }

  return (
    <section>
      <h1 class="page-title">{favoritesOnly ? 'Our favorites 💗' : 'What shall we cook?'}</h1>
      <div class="searchbar">
        <input
          type="search" value={typed.value} placeholder="Search recipes or ingredients…"
          onInput={(e) => setTyped((e.target as HTMLInputElement).value)} aria-label="Search recipes"
        />
        <button class="btn ghost" onClick={() => (showFilters.value = !showFilters.value)} aria-expanded={showFilters.value}>
          Filters{activeCount.value ? ` (${activeCount.value})` : ''}
        </button>
      </div>

      <div class="seg" role="group" aria-label="Pantry match">
        {([['any', 'Anything'], ['ready', 'Cook now'], ['two', 'Need ≤ 2'], ['five', 'Need ≤ 5']] as const).map(([k, l]) => (
          <button key={k} class={avail.value === k ? 'on' : ''} onClick={() => { avail.value = k; focus.value = []; }}>{l}</button>
        ))}
      </div>

      <label class="toggle"><input type="checkbox" checked={skipPricey.value} onChange={(e) => (skipPricey.value = (e.target as HTMLInputElement).checked)} /> Skip recipes that need pricey extras</label>

      {focus.value.length > 0 && (
        <p class="focus">Showing recipes you can make after buying <strong>{focus.value.join(' + ')}</strong>
          <button class="btn ghost" onClick={() => (focus.value = [])}>Clear ✕</button></p>
      )}
      {!favoritesOnly && buy.value && <BuyPanel buy={buy.value} />}

      {showFilters.value && (
        <div class="filters">
          <Select label="Cuisine" sig={cuisine} opts={cuisineOpts.value} />
          <Select label="Meal" sig={meal} opts={mealOpts.value} />
          <Select label="Main ingredient" sig={main} opts={mainOpts.value} />
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
              <option value="match">Best pantry match</option>{useSoon.value.length > 0 && <option value="soon">Use up what's on its way out</option>}<option value="quick">Quickest</option><option value="rated">Top rated</option>
            </select>
          </label>
          <Chips label="Diet" sig={diets} opts={['vegetarian', 'vegan', 'gluten-free', 'dairy-free']} />
          <Chips label="Vibe" sig={vibes} opts={vibeOpts.value} />
          <button class="btn ghost" onClick={reset}>Clear filters</button>
        </div>
      )}

      <p class="count">{list.length} recipe{list.length === 1 ? '' : 's'}</p>
      {list.length === 0 ? (
        <p class="empty">
          {favoritesOnly && !favorites.value.length ? 'Tap the ♡ on a recipe to keep it here.' : 'Nothing matches — try loosening a filter ✨'}
        </p>
      ) : (
        <>
          <div class="grid">{list.slice(0, shown.value).map((r) => <RecipeCard key={r.id} r={r} have={have} soon={soonUsed(r, covers)} />)}</div>
          {list.length > shown.value && (
            <p class="more"><button class="btn ghost" onClick={() => (shown.value += 60)}>Show more ({list.length - shown.value} left)</button></p>
          )}
        </>
      )}
    </section>
  );
}

type Buy = NonNullable<ReturnType<typeof suggestPurchases>>;
const dollars = (tier: number) => '$'.repeat(tier);

function BuyPanel({ buy }: { buy: Buy }) {
  const { singles, plan } = buy;
  return (
    <div class="buy">
      <h2>Worth picking up 🛒</h2>
      <div class="seg small" role="group" aria-label="What to optimize for">
        {([['meals', 'For meals'], ['baking', 'For baking'], ['all', 'Everything']] as const).map(([k, l]) => (
          <button key={k} class={buyFor.value === k ? 'on' : ''} onClick={() => (buyFor.value = k)}>{l}</button>
        ))}
      </div>
      {!singles.length && !plan && <p class="sub">Nothing within a few ingredients for this mix. Try another tab or loosen the filters.</p>}
      {plan && (
        <p class="plan">
          Best trip: <strong>{plan.items.join(' + ')}</strong> opens up <strong>{plan.unlocks}</strong> recipe{plan.unlocks === 1 ? '' : 's'}.{' '}
          <button class="linkish" onClick={() => { focus.value = plan.items; avail.value = 'any'; }}>Show them →</button>
        </p>
      )}
      {singles.some((x) => x.unlocks > 0) && (
        <>
          <p class="sub">Buy just one thing:</p>
          <div class="chipset">
            {singles.filter((x) => x.unlocks > 0).slice(0, 8).map((x) => (
              <button key={x.name} class="fchip buychip" onClick={() => { focus.value = [x.name]; avail.value = 'any'; }}>
                {x.name} <span class="tier">{dollars(x.tier)}</span> <b>+{x.unlocks}</b>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
