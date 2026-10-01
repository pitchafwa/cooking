import type { Recipe } from './types';
import { isBaking } from './match';

/** Small seeded PRNG so a shuffle is repeatable until the seed changes. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = <T,>(xs: T[], rand: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
/** Take one from each list in turn until all are empty (or `limit` reached). */
function roundRobin<T>(lists: T[][], limit = Infinity): T[] {
  const out: T[] = [];
  for (let round = 0; out.length < limit; round++) {
    let any = false;
    for (const l of lists) if (round < l.length) { out.push(l[round]); any = true; if (out.length >= limit) break; }
    if (!any) break;
  }
  return out;
}

/** Recipes for a component (sauce, mix, dough...) rather than a meal. */
const COMPONENT = /\b(mix|seasoning|rub|coating|sauce|marinade|dressing|spice|jam|jelly|syrup|dip|spread|frosting|glaze|gravy|stock|broth|brine|batter|dough|crust|relish|salsa|chutney|pesto|cocktail|punch|filling|topping|substitute|blend|paste|vinaigrette|icing|compote|pickle|pickles|cleaner|treats?|snack|appetizer|starter|side|smoothie|shake|lemonade)\b/i;
const isMeal = (r: Recipe) => r.ings.length >= 6 && r.minutes >= 15 && r.title.split(/\s+/).length >= 2 && !COMPONENT.test(r.title);

/**
 * A varied set of well-liked dinners: alternates main ingredient (chicken, pasta, fish, vegetables...) and, within
 * each, cuisine, preferring popular recipes but not always the same ones. Same seed -> same order.
 */
export function diverseDinners(all: Recipe[], seed: number, limit = 300): Recipe[] {
  const rand = rng(seed);
  const pool = all.filter((r) => r.meals.includes('dinner') && !isBaking(r) && (r.rating ?? 0) >= 4.5 && r.minutes <= 100 && r.main !== 'Other' && isMeal(r));
  const byMain = new Map<string, Map<string, Recipe[]>>();
  for (const r of pool) {
    const cuisines = byMain.get(r.main) ?? new Map<string, Recipe[]>();
    (cuisines.get(r.cuisine) ?? cuisines.set(r.cuisine, []).get(r.cuisine)!).push(r);
    byMain.set(r.main, cuisines);
  }
  const perMain = [...byMain.values()].map((cuisines) => {
    const lists = [...cuisines.values()].map((rs) =>
      rs.map((r) => ({ r, s: Math.log1p(r.ratingCount ?? 0) + rand() * 2.5 })).sort((a, b) => b.s - a.s).map((x) => x.r));
    return roundRobin(shuffle(lists, rand), limit);
  });
  return roundRobin(shuffle(perMain, rand), limit);
}
