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
      <svg width="20" height="20" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" /></svg>
    </button>
  );
}

export function RecipeCard({ r, have, soon = [] }: { r: Recipe; have: Set<string>; soon?: string[] }) {
  const a = availability(r, have);
  return (
    <a class="card" href={`#/recipe/${r.id}`}>
      <Heart id={r.id} />
      <span class={`pill ${a.tone}`}>{a.label}</span>
      <h2>{r.title}</h2>
      {r.alt && <p class="alt">{r.alt}</p>}
      <p class="meta">{r.cuisine !== 'other' && <>{cap(r.cuisine)} · </>}{fmtTime(r.minutes)} · {cap(r.difficulty)}</p>
      {a.missing.length > 0 && a.missing.length <= 3 && (
        <p class="missing">Missing: {a.missing.join(', ')}</p>
      )}
      {soon.length > 0 && <p class="soon-note">Uses up: {soon.join(', ')}</p>}
      <div class="tags">
        {r.diets.filter((d) => ['vegan', 'vegetarian', 'gluten-free'].includes(d)).slice(0, 2).map((d) => <span key={d} class="tag">{cap(d)}</span>)}
        {r.rating ? <span class="tag star">★ {r.rating.toFixed(1)}</span> : null}
      </div>
    </a>
  );
}
