"""Build public/data/recipes.json from the Food.com Kaggle dataset.

Usage:
  python3 scripts/build_recipes.py --recipes data/raw/RAW_recipes.csv \
      --interactions data/raw/RAW_interactions.csv --limit 4000

Dataset: https://www.kaggle.com/datasets/shuyangli94/food-com-recipes-and-user-interactions
License: CC BY-NC-SA 4.0 (credit Food.com; non-commercial; share-alike).

NOTE: RAW_recipes.csv lists ingredient *names* only (no quantities); amounts
appear inside the step text. Recipes get `text` == the ingredient name.

Prints the most frequent ingredient names that fell through the alias table, so
ALIASES can be extended iteratively.
"""
import argparse, ast, csv, json, re, sys
from collections import Counter, defaultdict
from pathlib import Path
from taxonomy import infer_diets, infer_main, infer_difficulty

csv.field_size_limit(sys.maxsize)

ALIASES = {
    "extra virgin olive oil": "olive oil", "extra-virgin olive oil": "olive oil", "canola oil": "vegetable oil",
    "cooking oil": "vegetable oil", "oil": "vegetable oil", "salad oil": "vegetable oil",
    "all-purpose flour": "flour", "all purpose flour": "flour", "plain flour": "flour", "white flour": "flour",
    "kosher salt": "salt", "sea salt": "salt", "table salt": "salt", "coarse salt": "salt",
    "pepper": "black pepper", "ground black pepper": "black pepper", "freshly ground black pepper": "black pepper",
    "garlic clove": "garlic", "garlic cloves": "garlic", "minced garlic": "garlic", "garlic powder": "garlic powder",
    "scallion": "green onion", "scallions": "green onion", "spring onion": "green onion", "green onions": "green onion",
    "yellow onion": "onion", "white onion": "onion", "red onion": "red onion", "onions": "onion",
    "granulated sugar": "sugar", "white sugar": "sugar", "caster sugar": "sugar", "light brown sugar": "brown sugar",
    "dark brown sugar": "brown sugar", "powdered sugar": "powdered sugar", "confectioners sugar": "powdered sugar",
    "unsalted butter": "butter", "salted butter": "butter", "margarine": "butter",
    "whole milk": "milk", "skim milk": "milk", "2% milk": "milk", "low-fat milk": "milk",
    "eggs": "egg", "egg yolk": "egg", "egg white": "egg", "egg yolks": "egg", "egg whites": "egg", "large egg": "egg",
    "boneless skinless chicken breast": "chicken breast", "chicken breasts": "chicken breast",
    "boneless chicken breast": "chicken breast", "chicken thighs": "chicken thigh",
    "lean ground beef": "ground beef", "ground chuck": "ground beef", "hamburger": "ground beef",
    "parmesan cheese": "parmesan", "grated parmesan cheese": "parmesan", "parmigiano-reggiano": "parmesan",
    "cheddar cheese": "cheddar", "sharp cheddar cheese": "cheddar", "mozzarella cheese": "mozzarella",
    "feta cheese": "feta", "heavy cream": "cream", "heavy whipping cream": "cream", "whipping cream": "cream",
    "diced tomatoes": "canned tomatoes", "crushed tomatoes": "canned tomatoes", "canned diced tomatoes": "canned tomatoes",
    "whole tomatoes": "canned tomatoes", "tomatoes": "tomato", "roma tomatoes": "tomato", "plum tomatoes": "tomato",
    "soya sauce": "soy sauce", "low sodium soy sauce": "soy sauce", "fresh ginger": "ginger", "ginger root": "ginger",
    "lemon juice": "lemon", "fresh lemon juice": "lemon", "lime juice": "lime", "fresh lime juice": "lime",
    "fresh parsley": "parsley", "flat-leaf parsley": "parsley", "fresh basil": "basil", "fresh cilantro": "cilantro",
    "coriander": "cilantro", "coriander leaves": "cilantro", "vanilla extract": "vanilla", "pure vanilla extract": "vanilla",
    "rolled oats": "oats", "old-fashioned oats": "oats", "quick-cooking oats": "oats", "bicarbonate of soda": "baking soda",
    "chicken stock": "chicken broth", "vegetable stock": "vegetable broth", "beef stock": "beef broth",
    "red pepper flakes": "chili flakes", "crushed red pepper": "chili flakes", "red bell pepper": "bell pepper",
    "green bell pepper": "bell pepper", "yellow bell pepper": "bell pepper", "greek yogurt": "yogurt",
    "plain yogurt": "yogurt", "natural yogurt": "yogurt", "white rice": "rice", "long-grain rice": "rice",
    "basmati rice": "rice", "jasmine rice": "rice", "spaghetti pasta": "spaghetti", "maple syrup": "maple syrup",
}
DESCRIPTORS = re.compile(
    r"\b(fresh|freshly|large|small|medium|chopped|minced|diced|sliced|boneless|skinless|unsalted|salted|"
    r"extra|virgin|low-sodium|reduced-sodium|lowfat|low-fat|nonfat|fat-free|fat free|whole|cooked|frozen|"
    r"finely|roughly|ripe|organic|lean|dried|optional|packed|room temperature|softened|melted|shredded|grated)\b")

TAG_CUISINE = {
    "italian": "italian", "mexican": "mexican", "indian": "indian", "chinese": "chinese", "thai": "thai",
    "japanese": "japanese", "korean": "korean", "french": "french", "greek": "greek", "spanish": "spanish",
    "middle-eastern": "middle-eastern", "moroccan": "middle-eastern", "lebanese": "middle-eastern",
    "american": "american", "southern-united-states": "american", "southwestern-united-states": "american",
    "north-american": "american", "cajun": "american", "german": "german", "british": "british",
    "english": "british", "vietnamese": "vietnamese", "caribbean": "caribbean", "brazilian": "latin-american",
    "asian": "asian",
}
TAG_MEAL = {
    "breakfast": "breakfast", "brunch": "breakfast", "lunch": "lunch", "main-dish": "dinner", "dinner-party": "dinner",
    "desserts": "dessert", "dessert": "dessert", "snacks": "snack", "appetizers": "snack", "side-dishes": "side",
    "soups-stews": "soup", "soup": "soup", "salads": "salad", "salad": "salad",
}
EXCLUDE_TAGS = {"beverages", "cocktails", "smoothies", "drinks"}


def canon(raw):
    n = raw.strip().lower()
    n = ALIASES.get(n, n)
    n = DESCRIPTORS.sub("", n)
    n = re.sub(r"\s+", " ", n).strip(" ,-")
    n = ALIASES.get(n, n)
    if n.endswith("ies") and len(n) > 4:
        n = n[:-3] + "y"
    elif n.endswith("oes"):
        n = n[:-2]
    elif n.endswith("s") and not n.endswith(("ss", "us", "hummus")) and len(n) > 3:
        n = n[:-1]
    return ALIASES.get(n, n)


def vibes_for(minutes, difficulty, meals, tags):
    v = []
    if "breakfast" in meals:
        v += ["sunday-morning", "breakfast-in-bed"] if difficulty != "involved" else ["sunday-morning"]
    if minutes <= 45 and difficulty == "easy" and "dinner" in meals:
        v.append("weeknight")
    if "lunch" in meals and minutes <= 20:
        v.append("workday-lunch")
    if {"romantic", "special-occasion", "elegant", "date-night"} & tags or (difficulty == "involved" and "dinner" in meals):
        v.append("date-night")
    if {"comfort-food", "one-dish-meal"} & tags or "soup" in meals:
        v.append("comfort-food")
    if {"low-calorie", "healthy", "low-fat"} & tags or "salad" in meals:
        v.append("light-and-fresh")
    if {"crock-pot-slow-cooker", "freezer", "make-ahead"} & tags:
        v.append("meal-prep")
    if {"for-large-groups", "kid-friendly", "potluck"} & tags:
        v.append("crowd-pleaser")
    return v


def title_case(s):
    return re.sub(r"\b([a-z])([a-z']*)", lambda m: m.group(1).upper() + m.group(2), s)


def sentence(s):
    s = s.strip()
    return s[:1].upper() + s[1:]


def load_ratings(path):
    tot, cnt = defaultdict(float), Counter()
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                r = float(row["rating"])
            except ValueError:
                continue
            if r > 0:  # 0 means "reviewed without rating"
                tot[row["recipe_id"]] += r
                cnt[row["recipe_id"]] += 1
    return {k: (tot[k] / cnt[k], cnt[k]) for k in cnt}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--recipes", required=True)
    ap.add_argument("--interactions")
    ap.add_argument("--limit", type=int, default=4000)
    ap.add_argument("--min-ratings", type=int, default=5)
    ap.add_argument("--min-rating", type=float, default=4.3)
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "public/data/recipes.json"))
    a = ap.parse_args()

    ratings = load_ratings(a.interactions) if a.interactions else {}
    candidates, unmapped = [], Counter()
    with open(a.recipes, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                tags = set(ast.literal_eval(row["tags"]))
                raw_ings = ast.literal_eval(row["ingredients"])
                steps = ast.literal_eval(row["steps"])
                minutes = int(row["minutes"])
            except (ValueError, SyntaxError):
                continue
            if tags & EXCLUDE_TAGS or not (3 <= len(raw_ings) <= 16) or len(steps) < 2 or not (1 <= minutes <= 480):
                continue
            avg, n = ratings.get(row["id"], (None, 0))
            if ratings and (n < a.min_ratings or avg < a.min_rating):
                continue
            candidates.append((n, avg, row, tags, raw_ings, steps, minutes))

    candidates.sort(key=lambda c: (c[0], c[1] or 0), reverse=True)
    out = []
    for n, avg, row, tags, raw_ings, steps, minutes in candidates[: a.limit]:
        names = list(dict.fromkeys(canon(i) for i in raw_ings if canon(i)))
        meals = sorted({TAG_MEAL[t] for t in tags if t in TAG_MEAL}) or ["dinner"]
        cuisine = next((TAG_CUISINE[t] for t in tags if t in TAG_CUISINE), "other")
        diff = infer_difficulty(minutes, len(steps), len(names))
        slug = re.sub(r"[^a-z0-9]+", "-", row["name"].lower()).strip("-")
        out.append({
            "id": f"f-{row['id']}", "title": title_case(" ".join(row["name"].split())),
            "description": (row.get("description") or "").strip()[:280] or None,
            "cuisine": cuisine, "minutes": minutes, "difficulty": diff, "meals": meals,
            "vibes": vibes_for(minutes, diff, meals, tags), "diets": infer_diets(names),
            "main": infer_main(names), "rating": round(avg, 2) if avg else None, "ratingCount": n or None,
            "ingredients": [{"name": x, "text": x.capitalize()} for x in names],
            "steps": [sentence(s) for s in steps],
            "source": {"name": "Food.com", "url": f"https://www.food.com/recipe/{slug}-{row['id']}"},
        })
        for raw in raw_ings:
            if canon(raw) == raw.strip().lower():
                unmapped[raw.strip().lower()] += 1

    Path(a.out).write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {len(out)} recipes -> {a.out}")
    print("top ingredient names passed through unchanged (extend ALIASES if any are variants):")
    for name, c in unmapped.most_common(40):
        print(f"  {c:5d}  {name}")


if __name__ == "__main__":
    main()
