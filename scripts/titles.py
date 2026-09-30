"""Turn Food.com titles into the name of the dish ("Lobel's Guide To Grilling The Perfect Steak" -> "Grilled Steak").

Purely rule-based and deterministic. The original title is kept by the pipeline as `alt` so nothing is lost and
near-identical recipes can still be told apart. Run `python3 scripts/test_titles.py` after changing rules.
"""
import html, re

# Possessives that are part of the dish name, not a person/brand.
KEEP_POSSESSIVE = {"devil's", "shepherd's", "farmer's", "baker's", "hunter's", "angel's", "lady's", "bird's", "brewer's",
                   "butcher's", "cook's", "gardener's", "cowboy's", "pirate's", "poor man's", "rich man's", "lazy man's",
                   "man's", "woman's", "sailor's", "miner's", "fisherman's", "monk's", "nun's", "witch's", "gypsy's",
                   "beggar's", "lover's", "mother's", "father's", "valentine's", "st. patrick's", "new year's", "reuben's",
                   "joe's", "tso's", "general tso's", "sloppy joe's", "hunter's", "maid's", "bride's", "drunkard's", "thief's", "tailor's", "crofter's", "ploughman's",
                   "plowman's", "sheppard's", "scholar's", "baby's", "children's", "kid's", "kids'"}
FAMILY = r"(?:grandma|grandmother|grandpa|grandmama|granny|gran|nana|nanna|mom|mommy|mama|mother|dad|daddy|papa|aunt|auntie|aunty|uncle|my|our|mimi|gamma|oma|opa)"

METHOD_PARTS = re.compile(
    r"^(?:pressure cooker|crock[- ]?pot|slow cooker|bread[- ]?maker|bread machine|microwave|oven|stove ?top|grill|instant pot|"
    r"air fryer|rice cooker|oamc|rsc|ww|weight watchers|low[- ]?fat|low[- ]?carb|low[- ]?cal(?:orie)?|vegan|vegetarian|diabetic|"
    r"gluten[- ]free|dairy[- ]free|sugar[- ]free|paleo|keto|healthy|lightened[- ]up|light|copycat|step by step|with photos?|"
    r"a\.?k\.?a\.?.*|aka.*|or .*|\d+ .*)$", re.I)

HYPE_PHRASES = [
    r"world'?s best", r"the best", r"best ever", r"best of the best", r"to die for", r"prize[- ]winning", r"award[- ]winning",
    r"blue[- ]ribbon", r"melt[- ]in[- ](?:your|the)[- ]mouth", r"mouth[- ]?watering", r"finger[- ]licking", r"easy[- ]peas(?:y|e)",
    r"easy[- ]peezy", r"easy as pie", r"better than (?:any|anything|sex|restaurant)\w*", r"out of this world", r"stupid easy",
    r"so easy", r"so good", r"so simple", r"no[- ]fail", r"fool[- ]?proof", r"restaurant[- ]style", r"restaurant[- ]quality",
    r"made from scratch", r"from scratch", r"home[- ]?made", r"home[- ]?style", r"super (?=easy|quick|simple|fast|duper|delicious|yummy|good)",
    r"make[- ]anytime", r"a must[- ]try", r"you'?ll love", r"you won'?t believe",
]
HYPE_WORDS = {
    "best", "ultimate", "amazing", "awesome", "delicious", "fabulous", "fantastic", "incredible", "yummy", "yum", "favorite", "favourite",
    "famous", "perfect", "perfectly", "wonderful", "outstanding", "heavenly", "easiest", "easy", "quick", "quickie", "simple", "simplest",
    "fast", "speedy", "classic", "traditional", "basic", "authentic", "real", "great", "good", "tasty", "gourmet", "copycat", "scratch",
    "my", "our", "the", "wow", "mmm", "mmmm", "yumm", "yummo", "lovely", "divine", "fantabulous", "winning", "ultra", "kickin",
    "unbelievable", "unbelievably", "very", "even", "easier", "quicker", "simpler", "nearly", "sensational", "spectacular", "decadent", "luscious", "scrumptious", "magnificent", "superb",  # "supreme" is a dish word
}
# hype words that are part of a real dish name when followed by these words
GUARD = {"simple": {"syrup"}, "quick": {"bread", "breads", "oats", "pickle", "pickles", "pickled"}, "great": {"northern"},
         "easy": {"over"}, "real": {"estate"}, "fast": {"food"}}
TRAILING_NOISE = {"wow", "yum", "yummy", "mmm", "mmmm", "delicious", "recipe", "recipes", "ever", "yumm", "please", "eh", "yay", "ii", "iii", "iv", "i"}
CONNECTORS = {"and", "or", "with", "for", "of", "in", "on", "to", "like", "by", "plus", "from", "a", "an", "at", "as"}
GERUND = {"making": "", "cooking": "", "preparing": "", "baking": "baked", "grilling": "grilled", "roasting": "roasted",
          "frying": "fried", "broiling": "broiled", "smoking": "smoked", "braising": "braised", "poaching": "poached",
          "steaming": "steamed", "searing": "seared", "sauteing": "sauteed", "boiling": "boiled", "barbecuing": "barbecued"}
SMALL_WORDS = {"a", "an", "and", "or", "the", "of", "with", "in", "on", "for", "to", "at", "by", "from", "over", "n"}

ARTICLE = re.compile(
    r"^(?:(?:[\w.&'-]+ ){0,2}guide to|(?:the )?technique (?:for|of|to)|how to|how do you|tips? (?:for|on|to)|(?:the )?secrets? (?:to|of|for)|the art of|"
    r"a beginner'?s guide to|everything you need to know about|learn(?:ing)? (?:how )?to|what to do with|the science of)\s*"
    r"(?P<verb>making|cooking|preparing|baking|grilling|roasting|frying|broiling|smoking|braising|poaching|steaming|searing|"
    r"boiling|barbecuing|make|cook|prepare|bake|grill|roast|fry|broil|smoke|braise|poach|steam|sear|boil)?\s*"
    r"(?:(?:a|an|the|your|perfect|perfectly|great|best|ultimate|better|good|proper|real|easy|simple|quick) )*(?P<rest>.+)$", re.I)
VERB_PARTICIPLE = {"make": "", "cook": "", "prepare": "", "bake": "baked", "grill": "grilled", "roast": "roasted", "fry": "fried",
                   "broil": "broiled", "smoke": "smoked", "braise": "braised", "poach": "poached", "steam": "steamed",
                   "sear": "seared", "boil": "boiled", "barbecue": "barbecued"}


def title_case(s):
    words = s.lower().split(" ")
    out = []
    for i, w in enumerate(words):
        if i and w in SMALL_WORDS:
            out.append(w)
        else:
            out.append(re.sub(r"(^|[-/(])([a-z])", lambda m: m.group(1) + m.group(2).upper(), w[:1].upper() + w[1:] if w else w))
    return re.sub(r"\ba la\b", "à la", " ".join(out), flags=re.I)


def _strip_possessive_name(s):
    m = re.match(r"^((?:[A-Za-z.&-]+ ){0,3}[A-Za-z.&-]+'s)\s+(?=\S)", s)
    if not m:
        return s
    lead = m.group(1).lower()
    if lead in KEEP_POSSESSIVE or any(lead.endswith(" " + k) or lead == k for k in KEEP_POSSESSIVE):
        return s
    rest = s[m.end():]
    # don't strip when the remainder would be a single stopword-ish fragment
    return rest if len(rest.split()) >= 1 else s


def _pick_subtitle_part(parts):
    """'Scarborough Fair - Savoury Bacon ... Pudding' -> the descriptive part; drop method/equipment tags."""
    keep = [p for p in parts if p.strip() and not METHOD_PARTS.match(p.strip())]
    if not keep:
        return parts[0]
    return max(keep, key=lambda p: len(p.split()))  # ties -> first


def clean_title(original):
    s = html.unescape(original)
    s = re.sub(r"\s+", " ", s).strip()
    fallback = re.sub(r"\s*[\(\[].*?[\)\]]", "", s).strip() or s

    s = re.sub(r"(?<!\w)w/(?=\s)", "with", s, flags=re.I)
    s = re.sub(r"\s*[\(\[].*?[\)\]]", "", s)                       # parentheticals
    parts = re.split(r"\s+[-–—]+\s+|\s*[–—]\s*|:\s+|\s*!+\s*|\s*\*+\s*", s)
    if len(parts) > 1:
        s = _pick_subtitle_part(parts)
    s = s.strip(" -–—:,.'\"")

    # "Guide To Grilling The Perfect Steak" -> "Grilled Steak"
    m = ARTICLE.match(s)
    if m and m.group("rest"):
        verb = (m.group("verb") or "").lower()
        part = GERUND.get(verb, VERB_PARTICIPLE.get(verb, ""))
        s = (part + " " + m.group("rest")).strip()
    else:
        s = _strip_possessive_name(s)
        s = re.sub(rf"^{FAMILY}(?: [A-Z][a-z]+)?'s\s+", "", s, flags=re.I) if not s.lower().startswith(tuple(KEEP_POSSESSIVE)) else s

    for ph in HYPE_PHRASES:
        s = re.sub(rf"\b{ph}\b", " ", s, flags=re.I)
    s = re.sub(r"\b(?:\d+|one|two|three|four|five|six)[- ](?:ingredients?|minutes?|mins?|hours?|hrs?|steps?)\b", " ", s, flags=re.I)
    s = re.sub(r"#\s*\d+", " ", s)
    s = re.sub(r"\s+(?i:by)\s+(?:[A-Z][\w.'-]*)(?:\s+[A-Z][\w.'-]*){0,2}$", "", s)
    s = re.sub(r"\b(?:ww|oamc|rsc)\b|\bweight watchers\b(?: points?)?", " ", s, flags=re.I)
    s = re.sub(r"\b\d+\s*(?:pts?|points?)\b", " ", s, flags=re.I)

    toks = s.split()
    words = []
    for i, w in enumerate(toks):
        key = re.sub(r"[^a-z'-]", "", w.lower())
        nxt = re.sub(r"[^a-z]", "", toks[i + 1].lower()) if i + 1 < len(toks) else ""
        if key in HYPE_WORDS and nxt not in GUARD.get(key, ()):
            continue
        words.append(w)
    while words and re.sub(r"[^a-z]", "", words[-1].lower()) in TRAILING_NOISE:
        words.pop()
    while words and words[0].lower() in CONNECTORS:
        words.pop(0)
    while words and words[-1].lower() in CONNECTORS:
        words.pop()
    s = " ".join(words).strip(" -–—:,.'\"&")

    if len(s) < 3 or not re.search(r"[a-z]{3}", s, re.I):
        s = fallback
    return title_case(s)


def display_original(original):
    """Original title, tidied only enough to show (entities, spacing, casing)."""
    return title_case(re.sub(r"\s+", " ", html.unescape(original)).strip())
