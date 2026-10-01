import { signal } from '@preact/signals';
import { recipes } from '../data';
import { grocery, addManyToGrocery, toggleGrocery, removeFromGrocery, clearBought, pantry } from '../store';
import { CATEGORIES, categoryOf } from '../ingredients';

const draft = signal('');
const copied = signal(false);

export function Grocery() {
  const counts = new Map<string, number>();
  recipes.value.forEach((r) => r.ings.forEach((n) => counts.set(n, (counts.get(n) ?? 0) + 1)));
  const known = [...counts].filter(([, c]) => c >= 3).map(([n]) => n).sort();
  const todo = grocery.value.filter((g) => !g.done);
  const bought = grocery.value.filter((g) => g.done);
  const submit = (e: Event) => { e.preventDefault(); addManyToGrocery(draft.value); draft.value = ''; };
  const copy = async () => {
    const text = CATEGORIES.map((c) => {
      const items = todo.filter((g) => categoryOf(g.name) === c);
      return items.length ? `${c}\n${items.map((g) => `- ${g.name}`).join('\n')}` : '';
    }).filter(Boolean).join('\n\n');
    try { await navigator.clipboard.writeText(text); copied.value = true; setTimeout(() => (copied.value = false), 1800); } catch { /* clipboard blocked */ }
  };

  return (
    <section class="pantry grocery">
      <p class="eyebrow">Shopping</p>
      <h1>Grocery list</h1>
      <p class="sub">
        Tick things off in the store and they move straight into your pantry.
        {todo.length > 0 && <> {todo.length} to get.</>}
      </p>

      <form class="add" onSubmit={submit}>
        <input
          list="grocery-known" value={draft.value} placeholder="Add items (commas ok: lemons, butter, basil)"
          onInput={(e) => (draft.value = (e.target as HTMLInputElement).value)} aria-label="Add grocery items"
        />
        <datalist id="grocery-known">{known.map((k) => <option key={k} value={k} />)}</datalist>
        <button class="btn" type="submit">Add</button>
      </form>

      {todo.length === 0 && bought.length === 0 && (
        <p class="empty">Nothing on the list. Add items here, from a recipe, or from "Worth picking up".</p>
      )}

      {CATEGORIES.map((cat) => {
        const items = todo.filter((g) => categoryOf(g.name) === cat);
        return items.length === 0 ? null : (
          <div key={cat} class="aisle">
            <h2>{cat} <small>{items.length}</small></h2>
            <ul class="glist">
              {items.map((g) => (
                <li key={g.name}>
                  <label class="check">
                    <input type="checkbox" checked={false} onChange={() => toggleGrocery(g.name)} />
                    <span class="box" aria-hidden="true" />
                    <span class="gname">{g.name}</span>
                  </label>
                  <button class="x" aria-label={`Remove ${g.name}`} onClick={() => removeFromGrocery(g.name)}>remove</button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {bought.length > 0 && (
        <div class="aisle bought">
          <h2>In the basket <small>{bought.length}</small></h2>
          <ul class="glist">
            {bought.map((g) => (
              <li key={g.name}>
                <label class="check">
                  <input type="checkbox" checked onChange={() => toggleGrocery(g.name)} />
                  <span class="box" aria-hidden="true" />
                  <span class="gname">{g.name}</span>
                </label>
                <span class="stocked">{pantry.value.includes(g.name) ? 'in pantry' : ''}</span>
              </li>
            ))}
          </ul>
          <button class="btn ghost" onClick={clearBought}>Clear bought items</button>
        </div>
      )}

      {todo.length > 0 && (
        <p class="copyrow"><button class="linkish" onClick={copy}>{copied.value ? 'Copied' : 'Copy list as text'}</button></p>
      )}
    </section>
  );
}
