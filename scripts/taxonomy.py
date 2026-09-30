"""Shared rules for turning raw recipe data into the app's schema.

Used by make_sample.py and build_recipes.py so both produce identical tags.
Ingredient names are "canonical": lowercase, singular, no prep words.
"""
import re

PLANT_PREFIXES = ("coconut", "almond", "soy", "oat", "peanut", "cashew", "rice", "cocoa", "shea")
MEAT_WORDS = ("chicken", "beef", "pork", "bacon", "ham", "sausage", "turkey", "lamb", "steak",
              "prosciutto", "pancetta", "chorizo", "veal", "duck", "salami", "pepperoni")
SEAFOOD_WORDS = ("salmon", "tuna", "shrimp", "fish", "cod", "anchovy", "crab", "lobster",
                 "scallop", "tilapia", "halibut", "clam", "mussel", "prawn", "sardine")
DAIRY_WORDS = ("milk", "butter", "cheese", "cheddar", "parmesan", "mozzarella", "feta", "ricotta",
               "cream", "yogurt", "yoghurt", "ghee", "gouda", "brie", "gruyere", "mascarpone",
               "buttermilk", "half-and-half")
DAIRY_FREE_EXACT = {"cream of tartar", "peanut butter", "almond butter", "cocoa butter"}
GLUTEN_WORDS = ("flour", "bread", "pasta", "spaghetti", "penne", "macaroni", "noodle", "tortilla",
                "soy sauce", "couscous", "breadcrumb", "barley", "bulgur", "pita", "oat", "cracker",
                "lasagna", "fettuccine", "linguine", "bun", "bagel", "seitan", "panko")
GLUTEN_FREE_EXCEPTIONS = ("buckwheat flour", "rice flour", "almond flour", "coconut flour",
                          "corn flour", "chickpea flour", "rice noodle", "corn tortilla", "tamari",
                          "cornmeal")

# Ingredients most households treat as always-available.
DEFAULT_STAPLES = ["salt", "black pepper", "water", "olive oil", "vegetable oil"]

# (label, keywords) checked in order; first hit decides a recipe's "main ingredient".
MAIN_GROUPS = [
    ("Chicken", ("chicken",)),
    ("Beef", ("beef", "steak", "veal")),
    ("Pork", ("pork", "bacon", "ham", "sausage", "prosciutto", "pancetta", "chorizo")),
    ("Turkey & lamb", ("turkey", "lamb", "duck")),
    ("Fish & seafood", SEAFOOD_WORDS),
    ("Tofu", ("tofu", "tempeh")),
    ("Beans & lentils", ("bean", "lentil", "chickpea")),
    ("Pasta", ("pasta", "spaghetti", "penne", "macaroni", "lasagna", "fettuccine", "linguine")),
    ("Rice & noodles", ("rice", "noodle")),
    ("Potato", ("potato",)),
    ("Grains & baking", ("flour", "oat", "bread", "tortilla", "couscous", "quinoa", "dough")),
    ("Eggs", ("egg",)),
    ("Cheese", ("cheese", "cheddar", "parmesan", "mozzarella", "feta", "ricotta", "gruyere")),
    ("Fruit", ("banana", "strawberry", "apple", "blueberry", "lemon", "lime", "orange", "peach",
               "mango", "raspberry", "pear", "cherry", "berry")),
    ("Vegetables", ("broccoli", "spinach", "mushroom", "carrot", "zucchini", "squash", "cabbage",
                    "cauliflower", "tomato", "pepper", "eggplant", "kale", "pumpkin", "corn",
                    "pea", "asparagus", "cucumber", "avocado", "onion", "celery")),
]


def _has(name, words):
    # whole-word match (allowing plurals) so "egg" doesn't match "eggplant"
    return any(re.search(r"\b" + re.escape(w) + r"(e?s)?\b", name) for w in words)


def is_dairy(name):
    if name in DAIRY_FREE_EXACT or name.startswith(PLANT_PREFIXES):
        return False
    return _has(name, DAIRY_WORDS)


def is_gluten(name):
    if _has(name, GLUTEN_FREE_EXCEPTIONS):
        return False
    return _has(name, GLUTEN_WORDS)


def infer_diets(names):
    meat = any(_has(n, MEAT_WORDS) for n in names)
    sea = any(_has(n, SEAFOOD_WORDS) for n in names)
    dairy = any(is_dairy(n) for n in names)
    egg = any(_has(n, ("egg",)) for n in names)
    honey = any("honey" in n or "gelatin" in n for n in names)
    diets = []
    if not meat and not sea:
        diets.append("vegetarian")
        if not dairy and not egg and not honey:
            diets.append("vegan")
    elif not meat:
        diets.append("pescatarian")
    if not any(is_gluten(n) for n in names):
        diets.append("gluten-free")
    if not dairy:
        diets.append("dairy-free")
    return diets


def infer_main(names):
    names = [n for n in names if n not in DEFAULT_STAPLES]
    for label, words in MAIN_GROUPS:
        if any(_has(n, words) for n in names):
            return label
    return "Other"


def infer_difficulty(minutes, n_steps, n_ingredients):
    score = n_steps + n_ingredients / 2 + minutes / 30
    if score <= 8:
        return "easy"
    if score <= 13:
        return "medium"
    return "involved"
