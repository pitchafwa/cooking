import { useEffect, useState } from 'preact/hooks';
import { recipes, fetchDetail } from '../data';
import type { RecipeDetailData } from '../types';
import { onHand } from '../match';
import { Heart, fmtTime } from './RecipeCard';

const nyt = (q: string) => `https://cooking.nytimes.com/search?q=${encodeURIComponent(q)}`;

export function RecipeDetail({ id }: { id: string }) {
  const r = recipes.value.find((x) => x.id === id);
  const [d, setD] = useState<RecipeDetailData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setD(null); setFailed(false);
    if (r) fetchDetail(r).then(setD).catch(() => setFailed(true));
  }, [id]);
  if (!r) return <p class="empty">Recipe not found. <a href="#/recipes">Back to recipes</a></p>;
  const have = onHand.value;
  const missing = r.ings.filter((n) => !have.has(n)).length;
  const cap = (s: string) => s.replace(/-/g, ' ');
  const title = (s: string) => cap(s).replace(/^./, (c) => c.toUpperCase());

  return (
    <article class="detail">
      <a class="back" href="#/recipes">← All recipes</a>
      <div class="detail-head">
        <h1>{r.title}</h1>
        <Heart id={r.id} />
      </div>
      {r.alt && <p class="alt">Originally “{r.alt}”</p>}
      <p class="meta">
        {title(r.cuisine)} · {fmtTime(r.minutes)} · {title(r.difficulty)}
        {d?.servings ? ` · serves ${d.servings}` : ''}
        {r.rating ? ` · ★ ${r.rating.toFixed(1)}` : ''}
      </p>
      {d?.description && <p class="desc">{d.description}</p>}
      <div class="tags">
        {[...r.diets, ...r.vibes].map((t) => <span key={t} class="tag">{cap(t)}</span>)}
      </div>

      <div class="cols">
        <section>
          <h2>Ingredients <span class={`pill ${missing ? 'close' : 'ready'}`}>{missing ? `${missing} missing` : 'all on hand ✓'}</span></h2>
          {d?.ings.some((i) => i.qty) && <p class="note">Amounts show the number only — units are in the method.</p>}
          <ul class="ings">
            {r.ings.map((name, n) => (
              <li key={name} class={have.has(name) ? 'have' : 'lack'}>
                <span aria-hidden="true">{have.has(name) ? '✓' : '○'}</span> {d?.ings[n]?.qty && <b class="qty">{d.ings[n].qty}</b>} {d?.ings[n]?.text ?? name}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Method</h2>
          {failed ? <p class="empty">Couldn't load the method. Check your connection.</p>
            : !d ? <p class="empty">Loading…</p>
            : <ol class="steps">{d.steps.map((s, n) => <li key={n}>{s}</li>)}</ol>}
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
          {d && <>Source: {d.source.url ? <a href={d.source.url} target="_blank" rel="noopener">{d.source.name}</a> : d.source.name}</>}
        </p>
      </section>
    </article>
  );
}
