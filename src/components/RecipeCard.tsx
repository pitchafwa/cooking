import type { Recipe } from '../types';
import { availability } from '../match';
import { favorites, toggleFavorite } from '../store';

const cap = (s: string) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
export const fmtTime = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}`);

export function Heart({ id }: { id: string }) {
  const on = favorites.value.includes(id);
  return (
    <button
      class={on ? 'heart on' : 'heart'}
      aria-label={on ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={on}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(id); }}
    >
      {on ? '♥' : '♡'}
    </button>
  );
}

export function RecipeCard({ r, have, soon = [] }: { r: Recipe; have: Set<string>; soon?: string[] }) {
  const a = availability(r, have);
  return (
    <a class="card" href={`#/recipe/${r.id}`}>
      <Heart id={r.id} />
      <span class={`pill ${a.tone}`}>{a.tone === 'ready' ? '✓ ' : ''}{a.label}</span>
      <h3>{r.title}</h3>
      {r.alt && <p class="alt">{r.alt}</p>}
      <p class="meta">{cap(r.cuisine)} · {fmtTime(r.minutes)} · {cap(r.difficulty)}</p>
      {a.missing.length > 0 && a.missing.length <= 3 && (
        <p class="missing">Missing: {a.missing.map((m) => m.name).join(', ')}</p>
      )}
      {soon.length > 0 && <p class="soon-note">⏳ Uses up: {soon.join(', ')}</p>}
      <div class="tags">
        {r.diets.filter((d) => ['vegan', 'vegetarian', 'gluten-free'].includes(d)).slice(0, 2).map((d) => <span key={d} class="tag">{cap(d)}</span>)}
        {r.rating ? <span class="tag star">★ {r.rating.toFixed(1)}</span> : null}
      </div>
    </a>
  );
}
