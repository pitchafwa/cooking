import { recipes } from '../data';
import { onHand } from '../match';
import { Heart, fmtTime } from './RecipeCard';

const nyt = (q: string) => `https://cooking.nytimes.com/search?q=${encodeURIComponent(q)}`;

export function RecipeDetail({ id }: { id: string }) {
  const r = recipes.value.find((x) => x.id === id);
  if (!r) return <p class="empty">Recipe not found. <a href="#/recipes">Back to recipes</a></p>;
  const have = onHand.value;
  const missing = r.ingredients.filter((i) => !have.has(i.name)).length;
  const cap = (s: string) => s.replace(/-/g, ' ');
  const title = (s: string) => cap(s).replace(/^./, (c) => c.toUpperCase());

  return (
    <article class="detail">
      <a class="back" href="#/recipes">← All recipes</a>
      <div class="detail-head">
        <h1>{r.title}</h1>
        <Heart id={r.id} />
      </div>
      <p class="meta">
        {title(r.cuisine)} · {fmtTime(r.minutes)} · {title(r.difficulty)}
        {r.servings ? ` · serves ${r.servings}` : ''}
        {r.rating ? ` · ★ ${r.rating.toFixed(1)}` : ''}
      </p>
      {r.description && <p class="desc">{r.description}</p>}
      <div class="tags">
        {[...r.diets, ...r.vibes].map((t) => <span key={t} class="tag">{cap(t)}</span>)}
      </div>

      <div class="cols">
        <section>
          <h2>Ingredients <span class={`pill ${missing ? 'close' : 'ready'}`}>{missing ? `${missing} missing` : 'all on hand ✓'}</span></h2>
          <ul class="ings">
            {r.ingredients.map((i) => (
              <li key={i.name} class={have.has(i.name) ? 'have' : 'lack'}>
                <span aria-hidden="true">{have.has(i.name) ? '✓' : '○'}</span> {i.text}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Method</h2>
          <ol class="steps">{r.steps.map((s, n) => <li key={n}>{s}</li>)}</ol>
        </section>
      </div>

      <section class="links">
        <h2>Want a fancier take?</h2>
        <p>
          <a href={nyt(r.title)} target="_blank" rel="noopener">Find similar on NYT Cooking ↗</a>
          {' · '}
          <a href={`https://www.seriouseats.com/search?q=${encodeURIComponent(r.title)}`} target="_blank" rel="noopener">Serious Eats ↗</a>
        </p>
        <p class="src">
          Source: {r.source.url ? <a href={r.source.url} target="_blank" rel="noopener">{r.source.name}</a> : r.source.name}
        </p>
      </section>
    </article>
  );
}
