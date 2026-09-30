"""Writes the app's data files.

public/data/recipes.json        slim search index (what the browse page needs)
public/data/details/<b>.json    full details, sharded; fetched when a recipe opens
"""
import json, shutil, zlib
from collections import defaultdict
from pathlib import Path

BUCKETS = 64
INDEX_KEYS = ("id", "title", "cuisine", "minutes", "difficulty", "meals", "vibes", "diets", "main", "rating", "ratingCount", "alt")


def write_dataset(recipes, data_dir):
    data_dir = Path(data_dir)
    shutil.rmtree(data_dir / "details", ignore_errors=True)
    (data_dir / "details").mkdir(parents=True)
    index, shards = [], defaultdict(dict)
    for r in recipes:
        b = zlib.crc32(r["id"].encode()) % BUCKETS
        row = {k: r[k] for k in INDEX_KEYS if r.get(k) is not None}
        row["b"] = b
        row["ings"] = [i["name"] for i in r["ingredients"]]
        index.append(row)
        detail = {"steps": r["steps"], "ings": [{"text": i["text"], **({"qty": i["qty"]} if i.get("qty") else {})} for i in r["ingredients"]],
                  "source": r["source"]}
        for k in ("description", "servings"):
            if r.get(k) is not None:
                detail[k] = r[k]
        shards[b][r["id"]] = detail
    dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    (data_dir / "recipes.json").write_text(dump(index))
    for b, d in shards.items():
        (data_dir / "details" / f"{b}.json").write_text(dump(d))
    return len(index)


def write_canon(data_dir, rules):
    """Ship the ingredient-name rules so the pantry normalizes typed names like the pipeline does."""
    (Path(data_dir) / "canon.json").write_text(json.dumps(rules, separators=(",", ":")))
