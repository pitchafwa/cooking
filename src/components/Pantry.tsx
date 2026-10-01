import { signal } from '@preact/signals';
import { recipes } from '../data';
import { pantry, addMany, addToPantry, removeFromPantry, toggleUseSoon, useSoon, assumeStaples, DEFAULT_STAPLES } from '../store';
import { missingById } from '../match';
import { CATEGORIES, COMMON_PANTRY, categoryOf } from '../ingredients';

const draft = signal('');
const showQuick = signal(true);

export function Pantry() {
  const counts = new Map<string, number>();
  recipes.value.forEach((r) => r.ings.forEach((n) => counts.set(n, (counts.get(n) ?? 0) + 1)));
  const known = [...counts].filter(([, c]) => c >= 3).map(([n]) => n).sort();
  let ready = 0;
  for (const m of missingById.value.values()) if (m.length === 0) ready++;
  const submit = (e: Event) => { e.preventDefault(); addMany(draft.value); draft.value = ''; };
  const quick = COMMON_PANTRY.filter((c) => !pantry.value.includes(c));

  return (
    <section class="pantry">
      <p class="eyebrow">Kitchen</p>
      <h1>What's in the kitchen</h1>
      <p class="sub">You can cook <strong>{ready.toLocaleString()}</strong> recipe{ready === 1 ? '' : 's'} right now. <a href="#/recipes">See them →</a></p>

      <form class="add" onSubmit={submit}>
        <input
          list="known-ings" value={draft.value} placeholder="Add what you bought (commas ok: eggs, milk, basil)…"
          onInput={(e) => (draft.value = (e.target as HTMLInputElement).value)} aria-label="Add ingredients"
        />
        <datalist id="known-ings">{known.map((k) => <option key={k} value={k} />)}</datalist>
        <button class="btn" type="submit">Add</button>
      </form>

      {quick.length > 0 && (
        <div class="quick">
          <button class="linkish" onClick={() => (showQuick.value = !showQuick.value)}>{showQuick.value ? '▾' : '▸'} Quick add common items</button>
          {showQuick.value && (
            <div class="chipset">
              {quick.map((q) => <button key={q} class="fchip" onClick={() => addToPantry(q)}>+ {q}</button>)}
            </div>
          )}
        </div>
      )}

      {pantry.value.length === 0 ? (
        <p class="empty">Nothing here yet. Add what you have and recipes will appear.</p>
      ) : (
        <>
          <p class="hint">Mark anything that needs using up soon — we'll find recipes that use it. Tap “ran out” when it's gone.</p>
          {CATEGORIES.map((cat) => {
            const items = pantry.value.filter((p) => categoryOf(p) === cat);
            return items.length === 0 ? null : (
              <div key={cat} class="aisle">
                <h2>{cat} <small>{items.length}</small></h2>
                <ul class="chips">
                  {items.map((p) => {
                    const soon = useSoon.value.includes(p);
                    return (
                      <li key={p} class={soon ? 'chip soon' : 'chip'}>
                        {p}
                        <button class="tog" aria-pressed={soon} aria-label={`Use ${p} soon`} title="Use soon" onClick={() => toggleUseSoon(p)}>use soon</button>
                        <button aria-label={`Ran out of ${p}`} title="Ran out" onClick={() => removeFromPantry(p)}>ran out ×</button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </>
      )}

      <label class="staples">
        <input type="checkbox" checked={assumeStaples.value} onChange={(e) => (assumeStaples.value = (e.target as HTMLInputElement).checked)} />
        Assume I always have {DEFAULT_STAPLES.join(', ')}
      </label>
      <p class="hint">Good to know: owning cheddar counts as having “cheese”, and any broth, pasta shape or onion variety covers the generic one.</p>
    </section>
  );
}
