import { signal } from '@preact/signals';
import { recipes } from '../data';
import { pantry, addToPantry, removeFromPantry, assumeStaples, DEFAULT_STAPLES } from '../store';
import { onHand, missingFor } from '../match';

const draft = signal('');

export function Pantry() {
  const known = [...new Set(recipes.value.flatMap((r) => r.ingredients.map((i) => i.name)))].sort();
  const ready = recipes.value.filter((r) => missingFor(r, onHand.value).length === 0).length;
  const submit = (e: Event) => { e.preventDefault(); addToPantry(draft.value); draft.value = ''; };

  return (
    <section class="pantry">
      <h1>What's in the kitchen</h1>
      <p class="sub">You can cook <strong>{ready}</strong> recipe{ready === 1 ? '' : 's'} right now. <a href="#/recipes">See them →</a></p>

      <form class="add" onSubmit={submit}>
        <input
          list="known-ings" value={draft.value} placeholder="Add an ingredient you bought…"
          onInput={(e) => (draft.value = (e.target as HTMLInputElement).value)} aria-label="Add ingredient"
        />
        <datalist id="known-ings">{known.map((k) => <option key={k} value={k} />)}</datalist>
        <button class="btn" type="submit">Add</button>
      </form>

      {pantry.value.length === 0 ? (
        <p class="empty">Nothing here yet. Add what you have and recipes will light up ✨</p>
      ) : (
        <ul class="chips">
          {pantry.value.map((p) => (
            <li key={p} class="chip">
              {p}
              <button aria-label={`Ran out of ${p}`} title="Ran out" onClick={() => removeFromPantry(p)}>ran out ×</button>
            </li>
          ))}
        </ul>
      )}

      <label class="staples">
        <input type="checkbox" checked={assumeStaples.value} onChange={(e) => (assumeStaples.value = (e.target as HTMLInputElement).checked)} />
        Assume I always have {DEFAULT_STAPLES.join(', ')}
      </label>
    </section>
  );
}
