"""Sanity checks for title cleaning. Run: python3 scripts/test_titles.py [--sample N]  (sample needs data/raw/recipes.csv)"""
import csv, random, sys
from pathlib import Path
from titles import clean_title

CASES = {
    "Lobel's Guide To Grilling The Perfect Steak": "Grilled Steak",
    "Pete's Scratch Pancakes": "Pancakes",
    "The Best Belgian Waffles": "Belgian Waffles",
    "Easy Peezy Pizza Dough (Bread Machine Pizza Dough)": "Pizza Dough",
    "Fudge Crinkles (A Great 4 Ingredient Cake Mix Cookie)": "Fudge Crinkles",
    "Devil's Food Cake": "Devil's Food Cake",
    "Shepherd's Pie": "Shepherd's Pie",
    "Mom's Gingersnaps": "Gingersnaps",
    "Spinach &amp; Feta Quiche": "Spinach & Feta Quiche",
    "Beef Tips On Rice - Pressure Cooker": "Beef Tips on Rice",
    "How To Cook Spaghetti Squash": "Spaghetti Squash",
    "Super Bowl Dip": "Super Bowl Dip",
    "7 Layer Dip": "7 Layer Dip",
    "Slow Cooker Latin Chicken W/ Sweet Potatoes And Black Beans": "Slow Cooker Latin Chicken with Sweet Potatoes and Black Beans",
    "Olive Garden's Zuppa Toscana": "Zuppa Toscana",
    "Tilapia A La Portuguesa": "Tilapia à la Portuguesa",
    "Instant Pancake Mix (And Instant Pancakes) By Alton Brown": "Instant Pancake Mix",
}
bad = [(k, clean_title(k), v) for k, v in CASES.items() if clean_title(k) != v]
for k, got, want in bad:
    print(f"FAIL {k!r}\n   got  {got!r}\n   want {want!r}")
print(f"{len(CASES) - len(bad)}/{len(CASES)} cases pass")

if "--sample" in sys.argv:
    n = int(sys.argv[sys.argv.index("--sample") + 1])
    csv.field_size_limit(sys.maxsize)
    names = [r["Name"] for _, r in zip(range(200000), csv.DictReader(open(Path(__file__).parent.parent / "data/raw/recipes.csv", encoding="utf-8", newline="")))]
    random.seed(5)
    for t in random.sample(names, n):
        c = clean_title(t)
        if c.lower() != t.lower():
            print(f"{t!r:75} -> {c}")
sys.exit(1 if bad else 0)
