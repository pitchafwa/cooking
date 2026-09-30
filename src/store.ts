import { signal, effect, Signal } from '@preact/signals';
import { canon } from './ingredients';

/** A signal mirrored to localStorage. Phase 4 swaps this for Firestore sync. */
function persisted<T>(key: string, initial: T): Signal<T> {
  let value = initial;
  try {
    const raw = localStorage.getItem('hub:' + key);
    if (raw) value = JSON.parse(raw) as T;
  } catch { /* private mode or corrupt data: fall back to the default */ }
  const s = signal<T>(value);
  effect(() => {
    try { localStorage.setItem('hub:' + key, JSON.stringify(s.value)); } catch { /* ignore */ }
  });
  return s;
}

export const DEFAULT_STAPLES = ['salt', 'black pepper', 'water', 'olive oil', 'vegetable oil'];

export const pantry = persisted<string[]>('pantry', []);
export const favorites = persisted<string[]>('favorites', []);
/** pantry items flagged "use soon" */
export const useSoon = persisted<string[]>('useSoon', []);
export const assumeStaples = persisted<boolean>('assumeStaples', true);

export function addToPantry(name: string) {
  const n = canon(name);
  if (n && !pantry.value.includes(n)) pantry.value = [...pantry.value, n].sort();
}
/** Accepts "eggs, milk, flour" style input. */
export const addMany = (text: string) => text.split(/[,\n;]+/).forEach(addToPantry);
export function removeFromPantry(name: string) {
  pantry.value = pantry.value.filter((p) => p !== name);
  useSoon.value = useSoon.value.filter((p) => p !== name);
}
export const toggleUseSoon = (name: string) =>
  (useSoon.value = useSoon.value.includes(name) ? useSoon.value.filter((p) => p !== name) : [...useSoon.value, name]);

export function toggleFavorite(id: string) {
  favorites.value = favorites.value.includes(id) ? favorites.value.filter((f) => f !== id) : [...favorites.value, id];
}
