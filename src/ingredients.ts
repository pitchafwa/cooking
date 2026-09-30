/**
 * Ingredient knowledge shared by the pantry, matching and (later) the grocery list.
 *  - canon():            typed/raw name -> canonical name (mirrors scripts/build_recipes.py)
 *  - generalizations():  what else owning an item lets you cook ("cheddar" also covers "cheese")
 *  - categoryOf():       grocery-store style grouping
 *  - costTier():         1 cheap, 2 normal, 3 pricey
 */

interface CanonRules {
  aliases: Record<string, string>;
  descriptors: string[];
  cheeses: string[];
  herbs: string[];
  stripSuffixes: string[];
  riceHeads: string[];
  potatoSkip: string[];
}

let rules: CanonRules | null = null;
let descriptorRe: RegExp | null = null;
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function setCanonRules(r: CanonRules) {
  rules = r;
  descriptorRe = new RegExp('\\b(' + r.descriptors.map(escapeRe).join('|') + ')\\b', 'g');
}

/** Port of canon() in scripts/build_recipes.py. Keep the two in sync (see scripts/parity check in README). */
export function canon(raw: string): string {
  let n = raw.trim().toLowerCase().split(',')[0].replace(/\(.*?\)/g, '').trim();
  if (!rules || !descriptorRe) return n.replace(/\s+/g, ' ');
  const R = rules;
  const alias = (k: string) => (has(R.aliases, k) ? R.aliases[k] : undefined);

  let hit = alias(n);
  if (hit === undefined) {
    n = n.replace(descriptorRe, '').replace(/\s+/g, ' ').replace(/^[ ,-]+|[ ,-]+$/g, '');
    hit = alias(n);
  }
  if (hit !== undefined) n = hit;
  n = n.replace(/chilies$/, 'chile');
  const leaf = /^(\w+) (?:leaves|leave|leaf)$/.exec(n);
  if (leaf && R.herbs.includes(leaf[1])) n = leaf[1];

  if (n.endsWith('ies') && n.length > 4) n = n.slice(0, -3) + 'y';
  else if (n.endsWith('oes')) n = n.slice(0, -2);
  else if (n.endsWith('s') && !['ss', 'us', 'hummus', 'molasses', 'asparagus'].some((e) => n.endsWith(e)) && n.length > 3) n = n.slice(0, -1);
  n = alias(n) ?? n;

  const words = n.split(' ');
  if (words.length > 1 && R.stripSuffixes.includes(words[words.length - 1])) n = words.slice(0, -1).join(' ');
  if (n.endsWith(' pasta') && n !== 'pasta') n = n.slice(0, -' pasta'.length);
  const rice = /^(.+) rice$/.exec(n);
  if (rice && R.riceHeads.includes(rice[1])) n = 'rice';
  const citrus = /^(lemon|lime|orange) (?:zest|rind|peel|wedge|slice|juice)$/.exec(n);
  if (citrus) n = citrus[1];
  if (n.endsWith(' potato') && !R.potatoSkip.some((w) => n.includes(w))) n = 'potato';
  if (n.endsWith(' cheese') && n !== 'cream cheese') n = R.cheeses.find((c) => n.includes(c.replace(' cheese', ''))) ?? n;
  return n;
}

// ---------- substitutions ----------

const PROTEINS = ['chicken', 'beef', 'pork', 'turkey', 'ham', 'lamb', 'sausage', 'bacon', 'salmon', 'shrimp'];
const NOT_MEAT = /\b(broth|bouillon|stock|soup|seasoning|flavou?r|base)\b/;
const PASTA = new Set(['spaghetti', 'penne', 'macaroni', 'linguine', 'fettuccine', 'rotini', 'ziti', 'orzo', 'rigatoni',
  'elbow macaroni', 'angel hair', 'bow tie', 'lasagna noodle', 'shell', 'farfalle', 'noodle', 'egg noodle', 'vermicelli']);
const BROTHS = ['broth', 'chicken broth', 'beef broth', 'vegetable broth'];
const TOMATO_PROCESSED = /\b(canned|sun-dried|stewed|crushed|paste|sauce|juice|puree)\b/;

/** Other recipe-ingredient names that owning `name` should satisfy. */
export function generalizations(name: string): string[] {
  const out: string[] = [];
  const words = name.split(' ');
  if (!NOT_MEAT.test(name)) for (const p of PROTEINS) if (words.includes(p) && name !== p) out.push(p);
  if (name === 'cream cheese' || name === 'cottage cheese') { /* not interchangeable with "cheese" */ }
  else if (name.endsWith(' cheese') || ['cheddar', 'mozzarella', 'parmesan', 'swiss', 'provolone', 'feta', 'ricotta', 'gouda', 'brie',
    'monterey jack', 'gruyere', 'romano', 'asiago', 'colby', 'goat', 'pepper jack', 'havarti', 'muenster'].includes(name)) out.push('cheese');
  if (name.endsWith(' onion') && name !== 'green onion') out.push('onion');
  if (name.endsWith(' tomato') && !TOMATO_PROCESSED.test(name)) out.push('tomato');
  if (name.endsWith(' mushroom')) out.push('mushroom');
  if (name.endsWith(' lettuce')) out.push('lettuce');
  if (name.endsWith(' apple')) out.push('apple');
  if (name.endsWith(' vinegar')) out.push('vinegar');
  if (name.endsWith(' wine') && name !== 'rice wine') out.push('wine');
  if (PASTA.has(name)) out.push('pasta');
  if (BROTHS.includes(name)) out.push(...BROTHS.filter((b) => b !== name));
  if (name === 'olive oil') out.push('vegetable oil');
  if (name === 'vegetable oil') out.push('olive oil');
  if (name.endsWith(' rice') && name !== 'wild rice') out.push('rice');
  if (name === 'half-and-half') out.push('cream');
  return out;
}

// ---------- grocery categories ----------

export const CATEGORIES = ['Produce', 'Meat & seafood', 'Dairy & eggs', 'Pasta, rice & grains', 'Baking',
  'Spices & seasonings', 'Sauces, oils & canned', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];

const w = (...words: string[]) => new RegExp('\\b(' + words.join('|') + ')(e?s)?\\b');
const CATEGORY_RULES: [Category, RegExp][] = [
  ['Sauces, oils & canned', w('sauce', 'paste', 'oil', 'vinegar', 'ketchup', 'mustard', 'mayonnaise', 'salsa', 'broth', 'stock', 'bouillon',
    'wine', 'dressing', 'syrup', 'jam', 'jelly', 'canned', 'peanut butter', 'tahini', 'hummus', 'sherry', 'brandy', 'rum', 'bourbon',
    'vodka', 'beer', 'pesto', 'relish', 'pickle', 'olive', 'caper', 'coconut milk', 'soy milk', 'tomato puree', 'applesauce')],
  ['Baking', w('flour', 'sugar', 'baking powder', 'baking soda', 'yeast', 'cocoa', 'chocolate', 'chocolate chip', 'vanilla', 'cornstarch',
    'extract', 'shortening', 'oat', 'pudding', 'marshmallow', 'gelatin', 'molasses', 'honey', 'cream of tartar', 'sprinkle', 'coconut', 'raisin')],
  ['Meat & seafood', w('chicken', 'beef', 'pork', 'bacon', 'ham', 'sausage', 'turkey', 'lamb', 'steak', 'salmon', 'tuna', 'shrimp', 'fish',
    'cod', 'crab', 'prosciutto', 'pancetta', 'scallop', 'clam', 'lobster', 'ribs?', 'roast', 'kielbasa', 'pepperoni', 'salami', 'anchovy', 'tilapia', 'veal')],
  ['Dairy & eggs', w('egg', 'milk', 'butter', 'cheese', 'cheddar', 'parmesan', 'mozzarella', 'feta', 'ricotta', 'cream', 'yogurt', 'margarine',
    'half-and-half', 'buttermilk', 'sour cream', 'ghee', 'swiss', 'provolone', 'monterey jack', 'gruyere', 'brie', 'gouda', 'romano', 'asiago', 'goat')],
  ['Pasta, rice & grains', w('pasta', 'spaghetti', 'penne', 'macaroni', 'linguine', 'fettuccine', 'noodle', 'rice', 'quinoa', 'couscous', 'barley',
    'bread', 'tortilla', 'cracker', 'cereal', 'lentil', 'bean', 'chickpea', 'orzo', 'rotini', 'ziti', 'panko', 'breadcrumb', 'cornmeal', 'tofu', 'bun', 'pita')],
  ['Spices & seasonings', w('salt', 'black pepper', 'cayenne', 'cinnamon', 'cumin', 'paprika', 'oregano', 'thyme', 'nutmeg', 'chili powder', 'curry',
    'garlic powder', 'onion powder', 'allspice', 'clove', 'turmeric', 'cardamom', 'bay leaf', 'seasoning', 'chili flake', 'pepper flake', 'rosemary',
    'sage', 'tarragon', 'dill', 'mustard seed', 'cumin seed', 'sesame seed', 'poppy seed', 'caraway seed', 'fennel seed', 'celery seed',
    'poultry seasoning', 'garam masala', 'saffron', 'coriander', 'mustard powder', 'ground mustard', 'lemon pepper', 'parsley flake', 'herb')],
  ['Produce', w('garlic', 'onion', 'tomato', 'potato', 'carrot', 'celery', 'pepper', 'lettuce', 'spinach', 'kale', 'broccoli', 'cauliflower',
    'mushroom', 'lemon', 'lime', 'orange', 'apple', 'banana', 'berry', 'strawberry', 'blueberry', 'raspberry', 'cucumber', 'zucchini', 'squash',
    'corn', 'avocado', 'ginger', 'basil', 'parsley', 'cilantro', 'mint', 'cabbage', 'eggplant', 'pea', 'jalapeno', 'chile', 'chive', 'leek',
    'shallot', 'asparagus', 'pumpkin', 'beet', 'pear', 'peach', 'mango', 'pineapple', 'cherry', 'grape', 'radish', 'turnip', 'parsnip', 'sprout',
    'arugula', 'romaine', 'sweet potato', 'yam', 'rhubarb', 'fig', 'date', 'melon', 'cantaloupe', 'watermelon', 'plum', 'nectarine', 'lettuce', 'herb')],
];

export function categoryOf(name: string): Category {
  for (const [cat, re] of CATEGORY_RULES) if (re.test(name)) return cat;
  return 'Other';
}

// ---------- rough price tiers (for "skip pricey extras") ----------

const PRICEY = w('saffron', 'pine nut', 'shrimp', 'scallop', 'lobster', 'crab', 'lamb', 'steak', 'salmon', 'prosciutto', 'pancetta', 'truffle',
  'pecan', 'walnut', 'cashew', 'almond', 'pistachio', 'macadamia', 'wine', 'brandy', 'rum', 'bourbon', 'vodka', 'sherry', 'marsala', 'gruyere',
  'brie', 'goat', 'mascarpone', 'tenderloin', 'brisket', 'ribeye', 'filet', 'duck', 'veal', 'caviar', 'vanilla bean', 'cardamom', 'halibut',
  'sea bass', 'mahi', 'swordfish', 'oyster', 'mussel', 'asiago', 'romano', 'fontina', 'creme fraiche', 'miso', 'tahini', 'maple syrup', 'beer',
  'quail', 'rack', 'crab meat', 'lump', 'cod');
const CHEAP = w('salt', 'black pepper', 'water', 'flour', 'sugar', 'egg', 'rice', 'pasta', 'spaghetti', 'macaroni', 'potato', 'onion', 'carrot',
  'celery', 'cabbage', 'bean', 'lentil', 'oat', 'bread', 'tortilla', 'milk', 'margarine', 'vegetable oil', 'cornstarch', 'baking powder',
  'baking soda', 'vinegar', 'garlic', 'banana', 'apple', 'lettuce', 'cucumber', 'corn', 'pea', 'ketchup', 'mustard', 'mayonnaise', 'cornmeal', 'butter');

export function costTier(name: string): 1 | 2 | 3 {
  if (PRICEY.test(name)) return 3;
  if (CHEAP.test(name)) return 1;
  return 2;
}

/** Things most kitchens stock; offered as one-tap adds on a fresh pantry. */
export const COMMON_PANTRY = ['egg', 'milk', 'butter', 'flour', 'sugar', 'brown sugar', 'baking powder', 'baking soda', 'vanilla', 'garlic',
  'onion', 'potato', 'carrot', 'celery', 'lemon', 'tomato', 'rice', 'spaghetti', 'bread', 'cheddar', 'parmesan', 'sour cream', 'chicken breast',
  'ground beef', 'bacon', 'chicken broth', 'soy sauce', 'ketchup', 'mustard', 'mayonnaise', 'honey', 'cinnamon', 'paprika', 'cumin', 'oregano',
  'chili powder', 'garlic powder', 'cornstarch', 'oat', 'canned tomato'];
