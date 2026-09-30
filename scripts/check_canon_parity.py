"""Verify the TypeScript canon() (src/ingredients.ts) matches build_recipes.canon().

Uses the raw ingredient text stored in public/data/details/*.json, so no CSV is needed.
Run after editing either implementation:  python3 scripts/check_canon_parity.py
"""
import glob, json, random, subprocess, sys, tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_recipes import canon

root = Path(__file__).resolve().parent.parent
raw = {i["text"] for f in glob.glob(str(root / "public/data/details/*.json")) for d in json.load(open(f)).values() for i in d["ings"]}
random.seed(0)
sample = random.sample(sorted(raw), min(8000, len(raw)))
fixture = Path(tempfile.mkdtemp()) / "fixture.json"
fixture.write_text(json.dumps({x: canon(x) for x in sample}))

js = f"""
import fs from 'fs';
import {{ canon, setCanonRules }} from '{root}/src/ingredients.ts';
setCanonRules(JSON.parse(fs.readFileSync('{root}/public/data/canon.json', 'utf8')));
const fx = JSON.parse(fs.readFileSync('{fixture}', 'utf8'));
let bad = 0;
for (const [k, v] of Object.entries(fx)) if (canon(k) !== v) {{ if (bad++ < 15) console.log(JSON.stringify(k), 'py:', v, 'ts:', canon(k)); }}
console.log(`mismatches: ${{bad}} of ${{Object.keys(fx).length}}`);
process.exit(bad ? 1 : 0);
"""
sys.exit(subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", js]).returncode)
