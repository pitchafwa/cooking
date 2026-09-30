"""Build public/data/recipes.json from the Food.com "recipes and reviews" dataset.

Usage:
  python3 scripts/build_recipes.py --recipes data/raw/recipes.csv --limit 15000

Dataset: https://www.kaggle.com/datasets/irkaal/foodcom-recipes-and-reviews
(Food.com recipes, scraped 2020; download via the Kaggle page or
https://www.kaggle.com/api/v1/datasets/download/irkaal/foodcom-recipes-and-reviews).
Credit Food.com; personal, non-commercial use.

Ingredient quantities in this dataset have no units ("1 1/2" for sugar), so the
UI shows them as a bare number and the units live in the method text.

Prints the most frequent canonical ingredient names afterwards so ALIASES can be
extended iteratively.
"""
import argparse, ast, csv, json, re, sys
from collections import Counter, defaultdict
from pathlib import Path
from taxonomy import infer_diets, infer_main, infer_difficulty
from dataset_io import write_dataset, write_canon
from titles import clean_title, display_original

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
    "diced tomatoes": "canned tomato", "crushed tomatoes": "canned tomato", "canned diced tomatoes": "canned tomato",
    "whole tomatoes": "canned tomato", "tomatoes": "tomato", "roma tomatoes": "tomato", "plum tomatoes": "tomato",
    "soya sauce": "soy sauce", "low sodium soy sauce": "soy sauce", "fresh ginger": "ginger", "ginger root": "ginger",
    "lemon juice": "lemon", "fresh lemon juice": "lemon", "lime juice": "lime", "fresh lime juice": "lime",
    "fresh parsley": "parsley", "flat-leaf parsley": "parsley", "fresh basil": "basil", "fresh cilantro": "cilantro",
    "coriander": "cilantro", "coriander leaves": "cilantro", "vanilla extract": "vanilla", "pure vanilla extract": "vanilla",
    "rolled oats": "oats", "old-fashioned oats": "oats", "quick-cooking oats": "oats", "bicarbonate of soda": "baking soda",
    "chicken stock": "chicken broth", "vegetable stock": "vegetable broth", "beef stock": "beef broth",
    "red pepper flakes": "chili flakes", "crushed red pepper": "chili flakes", "red bell pepper": "bell pepper",
    "green bell pepper": "bell pepper", "yellow bell pepper": "bell pepper", "greek yogurt": "yogurt",
    "plain yogurt": "yogurt", "natural yogurt": "yogurt", "white rice": "rice", "long-grain rice": "rice",
    "ground cinnamon": "cinnamon", "ground cumin": "cumin", "ground ginger": "ginger", "ground clove": "clove",
    "ground cloves": "clove", "ground nutmeg": "nutmeg", "ground pepper": "black pepper", "white pepper": "black pepper",
    "cracked black pepper": "black pepper", "green pepper": "bell pepper", "green chily": "green chile",
    "green chilies": "green chile", "chili flakes": "chili flake", "chili flake": "chili flake",
    "red pepper flakes": "chili flake", "crushed red pepper flakes": "chili flake", "crushed red pepper flake": "chili flake",
    "chicken breast halve": "chicken breast", "chicken breast halves": "chicken breast", "bay leave": "bay leaf",
    "bay leaves": "bay leaf", "confectioners' sugar": "powdered sugar", "confectioners sugar": "powdered sugar",
    "icing sugar": "powdered sugar", "celery rib": "celery", "celery stalk": "celery", "parsley flake": "parsley",
    "dill weed": "dill", "kernel corn": "corn", "sweet onion": "onion", "bread flour": "flour", "wheat flour": "flour",
    "unbleached flour": "flour", "cayenne pepper": "cayenne", "white vinegar": "vinegar", "distilled white vinegar": "vinegar",
    "salt and pepper": "salt", "seasoning salt": "salt", "dry white wine": "white wine", "dry red wine": "red wine",
    "cooked rice": "rice", "brown rice": "rice", "scallion": "green onion", "chicken breast half": "chicken breast",
    "boneless chicken thighs": "chicken thigh", "chicken thigh": "chicken thigh", "chocolate chips": "chocolate chip",
    "semi-sweet chocolate chips": "chocolate chip", "semisweet chocolate chips": "chocolate chip",
    "tomato puree": "tomato sauce", "unsweetened cocoa powder": "cocoa powder", "unsweetened cocoa": "cocoa powder",
    "cocoa": "cocoa powder", "sour cream": "sour cream", "cream cheese": "cream cheese",
    "sun-dried tomatoes": "sun-dried tomato", "sun dried tomatoes": "sun-dried tomato", "sun-dried tomato": "sun-dried tomato",
    "garbanzo beans": "chickpea", "garbanzo bean": "chickpea", "gingerroot": "ginger", "catsup": "ketchup", "soymilk": "soy milk",
    "half-and-half cream": "half-and-half", "unsweetened applesauce": "applesauce", "white bread flour": "flour",
    "self raising flour": "self-rising flour", "self-raising flour": "self-rising flour", "cornflour": "cornstarch",
    "old fashioned oats": "oat", "old-fashioned oats": "oat", "quick oats": "oat", "quick-cooking oats": "oat", "quick oat": "oat",
    "rolled oat": "oat", "old fashioned oat": "oat", "ground cayenne pepper": "cayenne", "flat leaf parsley": "parsley",
    "italian parsley": "parsley", "apple cider vinegar": "cider vinegar", "creamy peanut butter": "peanut butter",
    "crunchy peanut butter": "peanut butter", "chunky peanut butter": "peanut butter", "velveeta cheese": "american cheese",
    "egg substitute": "egg", "sherry wine": "sherry", "pepper": "black pepper",
    "basmati rice": "rice", "jasmine rice": "rice", "spaghetti pasta": "spaghetti", "maple syrup": "maple syrup",
}
DESCRIPTOR_WORDS = [
    "fresh", "freshly", "large", "small", "medium", "chopped", "minced", "diced", "sliced", "boneless", "skinless",
    "unsalted", "salted", "extra", "virgin", "low-sodium", "reduced-sodium", "lowfat", "low-fat", "nonfat", "fat-free",
    "fat free", "whole", "cooked", "frozen", "finely", "roughly", "ripe", "organic", "lean", "dried", "optional", "packed",
    "room temperature", "softened", "melted", "shredded", "grated", "sharp", "mild", "extra-sharp", "good quality",
    "plain", "fine", "coarse", "light", "dark", "good", "reduced fat", "reduced-fat", "low sodium", "hot", "warm",
    "cold", "boiling", "thinly", "thick", "crumbled", "unbleached", "all-purpose", "all purpose",
]
DESCRIPTORS = re.compile(r"\b(" + "|".join(re.escape(w) for w in DESCRIPTOR_WORDS) + r")\b")
EXTRA_DESCRIPTORS = re.compile(r"(?!)")  # merged into DESCRIPTOR_WORDS; kept so canon() stays readable

CUISINE_KW = {
    "italian": "italian", "mexican": "mexican", "tex mex": "mexican", "indian": "indian", "chinese": "chinese",
    "thai": "thai", "japanese": "japanese", "korean": "korean", "french": "french", "greek": "greek",
    "spanish": "spanish", "middle eastern": "middle-eastern", "moroccan": "middle-eastern", "lebanese": "middle-eastern",
    "turkish": "middle-eastern", "german": "german", "british": "british", "english": "british", "scottish": "british",
    "irish": "british", "vietnamese": "vietnamese", "caribbean": "caribbean", "cuban": "caribbean", "african": "african",
    "brazilian": "latin-american", "peruvian": "latin-american", "south american": "latin-american",
    "southern u.s.": "american", "southwestern u.s.": "american", "northeastern u.s.": "american",
    "midwest": "american", "pacific northwest": "american", "cajun": "american", "creole": "american",
    "hawaiian": "american", "amish": "american", "canadian": "american", "asian": "asian", "european": "european",
    "polish": "european", "russian": "european", "hungarian": "european", "scandinavian": "european",
    "swiss": "european", "portuguese": "european", "dutch": "european", "austrian": "european", "australian": "american",
}
SPECIFIC_FIRST = ["italian", "mexican", "indian", "chinese", "thai", "japanese", "korean", "french", "greek", "spanish"]
DESSERT_CATS = {"dessert", "bar cookie", "drop cookies", "cookie & brownie", "pie", "candy", "cheesecake",
                "frozen desserts", "cake", "brownies", "pies", "tarts", "custards", "sweet"}
BREAD_CATS = {"breads", "quick breads", "yeast breads", "bread machine", "scones", "muffins", "biscuits"}
SIDE_CATS = {"vegetable", "potato", "rice", "beans", "corn", "onions", "greens", "grains", "pasta shells", "spaghetti"}
EXCLUDE_CATS = {"beverages", "smoothies", "punch beverage", "cocktails", "coffee beverages", "tea", "shakes", "candy"}
EXCLUDE_KW = {"beverages", "smoothies", "cocktails", "drinks"}
GENERIC_DESC = re.compile(r"^make and share this .* recipe from food\.com\.?$", re.I)

CHEESES = ("cheddar", "parmesan", "mozzarella", "feta", "swiss", "provolone", "ricotta", "goat", "blue cheese",
           "monterey jack", "gruyere", "pepper jack", "gouda", "brie", "romano", "asiago", "colby", "havarti", "muenster")
HERBS = ("basil", "thyme", "oregano", "cilantro", "parsley", "mint", "sage", "tarragon", "dill", "rosemary", "chive")
STRIP_SUFFIXES = ("floret", "halve", "fillet")
RICE_HEADS = ("long grain", "long-grain", "white", "brown", "basmati", "jasmine", "cooked", "instant", "converted",
              "long grain white", "long-grain white", "long-grain brown", "parboiled", "wild")
CITRUS = ("lemon", "lime", "orange")
CITRUS_PARTS = ("zest", "rind", "peel", "wedge", "slice", "juice")
POTATO_SKIP = ("sweet", "mashed", "instant", "starch")


def r_vector(s):
    """Parse an R vector literal: c("a", NA, "b") or a bare "a" or NA."""
    s = (s or "").strip()
    if not s or s == "NA":
        return []
    out = []
    for m in re.finditer(r'"((?:[^"\\]|\\.)*)"|\bNA\b', s):
        out.append(None if m.group(1) is None else m.group(1).replace('\\"', '"').replace("\\\\", "\\"))
    return out


def iso_minutes(s):
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?", (s or "").strip())
    if not m or not any(m.groups()):
        return None
    d, h, mi = (int(x or 0) for x in m.groups())
    return d * 1440 + h * 60 + mi


def canon(raw):
    n = re.sub(r"\(.*?\)", "", raw.strip().lower().split(",")[0]).strip()
    hit = ALIASES.get(n)
    if hit is None:
        n = re.sub(r"\s+", " ", DESCRIPTORS.sub("", n)).strip(" ,-")
        hit = ALIASES.get(n)
    n = hit if hit is not None else n
    n = re.sub(r"chilies$", "chile", n)
    m = re.fullmatch(r"(\w+) (?:leaves|leave|leaf)", n)
    if m and m.group(1) in HERBS:
        n = m.group(1)
    if n.endswith("ies") and len(n) > 4:
        n = n[:-3] + "y"
    elif n.endswith("oes"):
        n = n[:-2]
    elif n.endswith("s") and not n.endswith(("ss", "us", "hummus", "molasses", "asparagus")) and len(n) > 3:
        n = n[:-1]
    n = ALIASES.get(n, n)
    words = n.split(" ")
    if len(words) > 1 and words[-1] in STRIP_SUFFIXES:
        n = " ".join(words[:-1])
    if n.endswith(" pasta") and n != "pasta":
        n = n[: -len(" pasta")]
    m = re.fullmatch(r"(.+) rice", n)
    if m and m.group(1) in RICE_HEADS:
        n = "rice"
    m = re.fullmatch(r"(lemon|lime|orange) (?:zest|rind|peel|wedge|slice|juice)", n)
    if m:
        n = m.group(1)
    if n.endswith(" potato") and not any(w in n for w in POTATO_SKIP):
        n = "potato"
    if n.endswith(" cheese") and n != "cream cheese":
        n = next((c for c in CHEESES if c.replace(" cheese", "") in n), n)
    return n


def meals_for(cat, kws):
    c = cat.lower()
    m = set()
    if c in DESSERT_CATS or "dessert" in kws:
        m.add("dessert")
    if c in BREAD_CATS:
        m.add("bread")
    if c in SIDE_CATS:
        m.add("side")
    if c in {"breakfast", "brunch"} or "breakfast" in kws or "brunch" in kws:
        m.add("breakfast")
    if c in {"lunch/snacks", "sandwiches"}:
        m |= {"lunch", "snack"}
    if "soup" in c or "stew" in c or "chowder" in c or "chili" in c:
        m.add("soup")
    if "salad" in c and "dressing" not in c:
        m.add("salad")
    if "sauce" in c or "dressing" in c or "spread" in c:
        m.add("sauce")
    if c in {"one dish meal", "chicken", "chicken breast", "pork", "meat", "steak", "poultry", "curries",
             "savory pies", "casserole", "pasta", "whole chicken", "roast beef", "lamb/sheep", "stew", "pot roast",
             "seafood", "fish", "salmon", "lobster", "crab", "shrimp", "tuna", "meatloaf", "ham", "stir fry"} or \
            "main dish" in kws or "one dish meal" in kws:
        m.add("dinner")
    return sorted(m) or ["dinner"]


def vibes_for(minutes, difficulty, meals, kws):
    v = []
    if "breakfast" in meals:
        v.append("sunday-morning")
        if difficulty != "involved" and minutes <= 40:
            v.append("breakfast-in-bed")
    if "weeknight" in kws or (minutes <= 45 and difficulty == "easy" and "dinner" in meals):
        v.append("weeknight")
    if "lunch" in meals and minutes <= 25:
        v.append("workday-lunch")
    if {"romantic", "valentine's day", "elegant", "date night"} & kws or (difficulty == "involved" and "dinner" in meals and minutes <= 120):
        v.append("date-night")
    if {"comfort food", "one dish meal", "stew"} & kws or "soup" in meals:
        v.append("comfort-food")
    if {"healthy", "low fat", "very low carbs", "no cook"} & kws or "salad" in meals:
        v.append("light-and-fresh")
    if {"freezer", "make ahead", "crock pot slow cooker"} & kws:
        v.append("meal-prep")
    if {"for large groups", "kid friendly", "potluck", "party"} & kws:
        v.append("crowd-pleaser")
    if "inexpensive" in kws:
        v.append("budget-friendly")
    if {"christmas", "thanksgiving", "easter", "halloween", "4th of july", "new year"} & kws:
        v.append("holiday")
    return v


def title_case(s):
    return re.sub(r"\b([a-z])([a-z']*)", lambda m: m.group(1).upper() + m.group(2), s.lower())


def sentence(s):
    s = " ".join(s.split())
    return s[:1].upper() + s[1:]


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--recipes", required=True)
    ap.add_argument("--limit", type=int, default=15000)
    ap.add_argument("--top", type=int, default=150, help="how many common ingredient names to print")
    ap.add_argument("--min-reviews", type=int, default=4)
    ap.add_argument("--min-rating", type=float, default=4.4)
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "public/data"))
    a = ap.parse_args()

    candidates = []
    with open(a.recipes, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rating, reviews = num(row["AggregatedRating"]), num(row["ReviewCount"])
            if not rating or not reviews or reviews < a.min_reviews or rating < a.min_rating:
                continue
            parts, qtys, steps = r_vector(row["RecipeIngredientParts"]), r_vector(row["RecipeIngredientQuantities"]), r_vector(row["RecipeInstructions"])
            minutes = iso_minutes(row["TotalTime"])
            cat = (row["RecipeCategory"] or "").strip()
            kws = {k.lower() for k in r_vector(row["Keywords"]) if k}
            if not minutes or not (3 <= len(parts) <= 18) or len(steps) < 2 or cat.lower() in EXCLUDE_CATS or kws & EXCLUDE_KW:
                continue
            candidates.append((reviews, rating, row, parts, qtys, steps, minutes, cat, kws))

    candidates.sort(key=lambda c: (c[0], c[1]), reverse=True)
    out, freq = [], Counter()
    for reviews, rating, row, parts, qtys, steps, minutes, cat, kws in candidates[: a.limit]:
        aligned = len(qtys) == len(parts)
        ings, seen = [], set()
        for i, raw in enumerate(parts):
            if not raw:
                continue
            name = canon(raw)
            if not name or name in seen:
                continue
            seen.add(name)
            q = qtys[i] if aligned and qtys[i] else None
            ings.append({"name": name, "text": raw.strip(), **({"qty": q} if q else {})})
            freq[name] += 1
        names = [i["name"] for i in ings]
        meals = meals_for(cat, kws)
        cuisines = [CUISINE_KW[k] for k in kws if k in CUISINE_KW]
        cuisine = next((c for c in SPECIFIC_FIRST if c in cuisines), cuisines[0] if cuisines else "other")
        diff = infer_difficulty(minutes, len(steps), len(names))
        title = clean_title(row["Name"])
        alt = display_original(row["Name"])
        alt = None if alt.lower() == title.lower() else alt
        slug = re.sub(r"[^a-z0-9]+", "-", row["Name"].lower()).strip("-")
        desc = " ".join((row["Description"] or "").split())
        servings = num(row["RecipeServings"])
        out.append({
            "id": f"f-{int(row['RecipeId'])}", "title": title, "alt": alt,
            "description": None if not desc or desc == "NA" or GENERIC_DESC.match(desc) else desc[:280],
            "cuisine": cuisine, "minutes": minutes, "difficulty": diff, "meals": meals,
            "vibes": vibes_for(minutes, diff, meals, kws), "diets": infer_diets(names),
            "main": infer_main(names), "servings": int(servings) if servings else None,
            "rating": round(rating, 2), "ratingCount": int(reviews),
            "ingredients": ings, "steps": [sentence(s) for s in steps if s],
            "source": {"name": "Food.com", "url": f"https://www.food.com/recipe/{slug}-{int(row['RecipeId'])}"},
        })

    n = write_dataset(out, a.out)
    write_canon(a.out, {"aliases": ALIASES, "descriptors": DESCRIPTOR_WORDS, "cheeses": list(CHEESES), "herbs": list(HERBS), "stripSuffixes": list(STRIP_SUFFIXES), "riceHeads": list(RICE_HEADS), "potatoSkip": list(POTATO_SKIP)})
    print(f"{len(candidates)} passed filters; wrote {n} recipes -> {a.out}")
    print("most common canonical ingredients (check for un-merged variants):")
    print(", ".join(f"{n}({c})" for n, c in freq.most_common(a.top)))


if __name__ == "__main__":
    main()
