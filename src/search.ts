import type { Recipe } from './types';

/**
 * Typo-tolerant search over a prebuilt word index (built once after load, ~100 ms).
 * Each query word must match somewhere; title hits outrank ingredient/tag hits.
 * Per keystroke this touches the vocabulary (~10k words), not all 15k recipes.
 */
const stem = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
const words = (s: string) =>
  (s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]+/g) ?? []).map(stem);

// field weight codes stored alongside each posting
const FIELD_WEIGHT = [0, 1, 0.3, 0.25, 0.2]; // 1 title, 2 original title, 3 ingredient, 4 tags

interface Index {
  source: Recipe[];
  vocab: string[];
  postings: Map<string, number[]>; // word -> recipeIndex * 10 + field code
}
let index: Index | null = null;

export function buildSearchIndex(all: Recipe[]) {
  const postings = new Map<string, number[]>();
  all.forEach((r, i) => {
    const seen = new Map<string, number>(); // word -> best (lowest) field code for this recipe
    const add = (ws: string[], code: number) => ws.forEach((w) => { if (!seen.has(w) || seen.get(w)! > code) seen.set(w, code); });
    add(words(r.title), 1);
    if (r.alt) add(words(r.alt), 2);
    r.ings.forEach((n) => add(words(n), 3));
    add(words([r.cuisine, r.main, ...r.meals, ...r.vibes].join(' ')), 4);
    seen.forEach((code, w) => {
      const list = postings.get(w);
      if (list) list.push(i * 10 + code); else postings.set(w, [i * 10 + code]);
    });
  });
  index = { source: all, vocab: [...postings.keys()], postings };
}

/** Levenshtein distance with an early exit once it exceeds `max`. */
function within(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** recipe index -> best score for one query word */
function matchWord(idx: Index, t: string): Map<number, number> {
  const out = new Map<number, number>();
  const hit = (w: string, q: number) => {
    for (const p of idx.postings.get(w)!) {
      const i = Math.floor(p / 10);
      const s = q * FIELD_WEIGHT[p % 10];
      if (s > (out.get(i) ?? 0)) out.set(i, s);
    }
  };
  let any = false;
  for (const w of idx.vocab) {
    if (w === t) { hit(w, 1); any = true; }
    else if (t.length >= 2 && w.startsWith(t)) { hit(w, 0.8); any = true; }
  }
  if (!any && t.length >= 4) {
    const max = t.length >= 7 ? 2 : 1;
    for (const w of idx.vocab) {
      const d = within(t, w, max);
      if (d <= max) hit(w, 0.55 - 0.1 * d);
    }
  }
  return out;
}

let lastKey = '';
let lastResult: Recipe[] = [];

export function searchRecipes(all: Recipe[], query: string): Recipe[] {
  const tokens = words(query);
  if (!tokens.length) return all;
  if (!index || index.source !== all) buildSearchIndex(all);
  const idx = index!;
  const key = tokens.join(' ');
  if (key === lastKey && idx.source === all) return lastResult;

  let scores: Map<number, number> | null = null;
  for (const t of tokens) {
    const m = matchWord(idx, t);
    if (!scores) scores = m;
    else {
      const next = new Map<number, number>();
      for (const [i, s] of scores) { const v = m.get(i); if (v !== undefined) next.set(i, s + v); }
      scores = next;
    }
    if (!scores.size) break;
  }
  const ranked = [...(scores ?? [])].sort((a, b) =>
    b[1] - a[1] || (all[b[0]].ratingCount ?? 0) - (all[a[0]].ratingCount ?? 0)).map(([i]) => all[i]);
  lastKey = key; lastResult = ranked;
  return ranked;
}
