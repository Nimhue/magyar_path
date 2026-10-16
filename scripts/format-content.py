"""Rewrites content JSON with one vocab item per line (easier to read and edit).
Usage: python3 scripts/format-content.py [ro-map.json]
If a hu→ro map is given, missing "ro" fields are filled from it."""
import json, glob, sys

romap = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else {}
ORDER = ["hu", "en", "ro", "note", "kind"]

def item_line(it):
    it = {k: it[k] for k in ORDER if k in it} | {k: v for k, v in it.items() if k not in ORDER}
    return "        " + json.dumps(it, ensure_ascii=False)

def dump(d, groups_key):
    head = {k: v for k, v in d.items() if k != groups_key}
    out = json.dumps(head, ensure_ascii=False, indent=2)[:-2]
    out += f',\n  "{groups_key}": [\n'
    gs = []
    for g in d[groups_key]:
        items = ",\n".join(item_line(i) for i in g["items"])
        gs.append(f'    {{\n      "name": {json.dumps(g["name"], ensure_ascii=False)},\n      "items": [\n{items}\n      ]\n    }}')
    return out + ",\n".join(gs) + "\n  ]\n}\n"

for pattern, key in [("content/lessons/*.json", "vocab"), ("content/dictionary/*.json", "groups")]:
    for f in sorted(glob.glob(pattern)):
        d = json.load(open(f))
        for g in d[key]:
            for it in g["items"]:
                if "ro" not in it and it["hu"] in romap:
                    it["ro"] = romap[it["hu"]]
        open(f, "w").write(dump(d, key))
        missing = [i["hu"] for g in d[key] for i in g["items"] if "ro" not in i]
        if missing:
            print(f, "missing ro:", missing)
