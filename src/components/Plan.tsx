import { recipes } from '../data';
import { plan, clearPlan, nextDays, addToGrocery } from '../store';
import { onHand, missingFor } from '../match';
import { fmtTime } from './RecipeCard';

export function Plan() {
  const days = nextDays(7);
  const byId = new Map(recipes.value.map((r) => [r.id, r]));
  const have = onHand.value;

  const planned = days.map((d) => ({ ...d, recipe: byId.get(plan.value[d.date]) })).filter((d) => d.recipe);
  const weekMissing = [...new Set(planned.flatMap((d) => missingFor(d.recipe!, have)))];

  return (
    <section class="pantry planpage">
      <p class="eyebrow">This week</p>
      <h1>Meal plan</h1>
      <p class="sub">Pick a recipe's day from its page, and it shows up here for both of you.</p>

      <ul class="days">
        {days.map((d) => {
          const r = byId.get(plan.value[d.date]);
          const missing = r ? missingFor(r, have) : [];
          return (
            <li key={d.date} class="day">
              <div class="dayname"><strong>{d.weekday}</strong><span>{d.short}</span></div>
              {r ? (
                <div class="daymeal">
                  <a class="daytitle" href={`#/recipe/${r.id}`}>{r.title}</a>
                  <span class="meta">{fmtTime(r.minutes)}</span>
                  <span class={`pill ${missing.length ? 'close' : 'ready'}`}>{missing.length ? `Need ${missing.length} more` : 'Ready to cook'}</span>
                  <button class="x" onClick={() => clearPlan(d.date)} aria-label={`Remove ${r.title} from ${d.weekday}`}>remove</button>
                </div>
              ) : (
                <div class="daymeal empty-day"><a href="#/recipes">Find something</a></div>
              )}
            </li>
          );
        })}
      </ul>

      {planned.length > 0 && (
        <div class="weekbar">
          {weekMissing.length > 0 ? (
            <>
              <p class="sub">{weekMissing.length} ingredient{weekMissing.length === 1 ? '' : 's'} missing for the week: {weekMissing.slice(0, 8).join(', ')}{weekMissing.length > 8 ? '…' : ''}</p>
              <button class="btn" onClick={() => addToGrocery(weekMissing)}>Add to grocery list</button>
            </>
          ) : <p class="sub">You have everything for the week.</p>}
        </div>
      )}
    </section>
  );
}
