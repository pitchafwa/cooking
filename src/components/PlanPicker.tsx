import { signal } from '@preact/signals';
import { plan, setPlan, nextDays } from '../store';

const open = signal(false);

/** "Add to plan": choose which of the next 7 days to cook this recipe. */
export function PlanPicker({ id }: { id: string }) {
  const days = nextDays(7);
  const on = days.filter((d) => plan.value[d.date] === id);
  return (
    <div class="planpicker">
      <button class="btn ghost" aria-expanded={open.value} onClick={() => (open.value = !open.value)}>
        {on.length ? `Planned: ${on.map((d) => d.weekday).join(', ')}` : 'Add to plan'}
      </button>
      {open.value && (
        <div class="chipset" role="group" aria-label="Choose a day">
          {days.map((d) => (
            <button key={d.date} class={plan.value[d.date] === id ? 'fchip on' : 'fchip'} aria-pressed={plan.value[d.date] === id}
              onClick={() => { setPlan(d.date, id); open.value = false; }}>
              {d.weekday} <small>{d.short}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
