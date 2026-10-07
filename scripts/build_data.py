#!/usr/bin/env python3
"""Construit data/commanders.json et data/types.json : la fiche de chaque commandant jouable.

Sources (toutes autorisent un usage automatisé raisonnable) :
  - Scryfall          cartes, prix, popularité (classement EDHREC fourni par Scryfall), étiquettes de fonction
                      (Tagger, recherche « oracletag: »), noms français.     https://scryfall.com/docs/api
  - Commander Spellbook  combos connus et leur niveau de puissance (export public).  https://commanderspellbook.com
  - MTGJSON           decks préconstruits Commander et leur commandant.     https://mtgjson.com
EDHREC n'est PAS interrogé : ses conditions d'utilisation interdisent les requêtes automatisées.

Usage :
  python scripts/build_data.py                    # tout télécharger
  python scripts/build_data.py --input f.jsonl.gz # cartes Scryfall depuis un fichier local (tests)
  python scripts/build_data.py --offline          # n'utilise que les caches de data/cache (aucun réseau sauf --input)

Chaque source secondaire a son cache dans data/cache/ : si une source est indisponible, on garde sa dernière version.
Les réglages (étiquettes → styles, puissance) sont dans data/sources.json ; les corrections manuelles dans data/curated.json.
Projet personnel, non commercial.
"""
import argparse, datetime, gzip, io, json, math, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CACHE = os.path.join(DATA, "cache")
UA = "GrandQuizCommander/4.0 (projet personnel non commercial)"
HEADERS = {"User-Agent": UA, "Accept": "application/json;q=0.9,*/*;q=0.8"}
SKIP_LAYOUTS = {"token", "double_faced_token", "emblem", "art_series", "planar", "scheme", "vanguard", "augment", "host"}
ARCH = ["aggro", "voltron", "tokens", "aristo", "counters", "kindred", "big", "lands", "blink", "life", "gy", "artifacts",
        "ench", "spells", "control", "stax", "pillow", "combo", "hug", "slug", "goad", "theft", "mill", "chaos", "walkers", "punish"]


def log(*a):
    print(*a, file=sys.stderr, flush=True)


# ---------------------------------------------------------------- réseau et cache
def http(url, timeout=120, tries=5):
    req = urllib.request.Request(url, headers=HEADERS)
    for i in range(tries):
        try:
            return urllib.request.urlopen(req, timeout=timeout)
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):
                raise
            err = e
            if e.code == 429:  # trop de requêtes : on respecte la pause demandée
                time.sleep(float(e.headers.get("Retry-After") or 0) or 5 * (i + 1))
                continue
        except Exception as e:  # coupure réseau : on réessaie
            err = e
        time.sleep(2 * (i + 1))
    raise err


def http_json(url, timeout=120):
    with http(url, timeout) as r:
        return json.load(r)


def cache_load(name, default):
    p = os.path.join(CACHE, name)
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    return default


def cache_save(name, obj):
    os.makedirs(CACHE, exist_ok=True)
    with open(os.path.join(CACHE, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


# ---------------------------------------------------------------- Scryfall
def read_cards(raw, name):
    """Lit un fichier de cartes : JSON (liste) ou JSON Lines, compressé en gzip ou non."""
    if name.endswith(".gz") or raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    text = raw.decode("utf-8")
    if text.lstrip().startswith("["):
        return json.loads(text)
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def load_bulk(path):
    if path:
        with open(path, "rb") as f:
            return read_cards(f.read(), path)
    meta = http_json("https://api.scryfall.com/bulk-data/oracle-cards")
    # Scryfall publiait « download_uri » (JSON) ; depuis 2026, seulement « jsonl_download_uri » (JSON Lines gzip).
    url = meta.get("download_uri") or meta.get("jsonl_download_uri")
    if not url:
        raise SystemExit("Réponse inattendue de Scryfall (aucune adresse de téléchargement) : " + ", ".join(meta))
    log("Cartes :", url)
    with http(url, timeout=300) as r:
        return read_cards(r.read(), url)


def scryfall_search(query, unique="cards"):
    """Tous les résultats d'une recherche Scryfall (pages de 175), avec la pause demandée par Scryfall."""
    url = "https://api.scryfall.com/cards/search?" + urllib.parse.urlencode({"q": query, "unique": unique})
    out = []
    while url:
        time.sleep(0.2)
        try:
            page = http_json(url)
        except urllib.error.HTTPError as e:
            if e.code == 404:  # aucun résultat, ou étiquette inconnue
                return out
            raise
        out += page.get("data", [])
        url = page.get("next_page") if page.get("has_more") else None
    return out


def load_types(offline):
    if offline:
        return None
    try:
        return http_json("https://api.scryfall.com/catalog/creature-types")["data"]
    except Exception as e:  # le catalogue est un bonus : on continue sans
        log("Catalogue des types indisponible :", e)
        return None


def fetch_otags(src, offline):
    """{étiquette: [noms de commandants]} pour toutes les étiquettes utilisées par data/sources.json."""
    cached = cache_load("otags.json", {})
    if offline:
        return cached, []
    tags = sorted({t for lst in src["otags"].values() for t, _ in lst} | {t for t, _ in src["power_otags"]})
    out, missing = {}, []
    for i, t in enumerate(tags):
        try:
            names = sorted({card_name(c) for c in scryfall_search(f"oracletag:{t} is:commander game:paper")})
        except Exception as e:
            log(f"  étiquette {t} : échec ({e}), cache conservé")
            names = cached.get(t, [])
        if not names:
            missing.append(t)
        out[t] = names
        if i % 20 == 19:
            log(f"  étiquettes : {i + 1}/{len(tags)}")
    cache_save("otags.json", out)
    return out, missing


def fetch_french(offline):
    cached = cache_load("noms_fr.json", {})
    if offline:
        return cached
    try:
        res = {}
        for c in scryfall_search("is:commander lang:fr game:paper"):
            fr = c.get("printed_name") or ((c.get("card_faces") or [{}])[0].get("printed_name"))
            if fr:
                res[card_name(c)] = fr
        if len(res) > 0.5 * len(cached):  # garde-fou contre une réponse partielle
            cache_save("noms_fr.json", res)
            return res
    except Exception as e:
        log("Noms français indisponibles :", e)
    return cached


# ---------------------------------------------------------------- MTGJSON : decks préconstruits
def fetch_precons(offline):
    """{fichier: {deck, date, commanders}} ; les decks déjà connus ne sont jamais retéléchargés."""
    cached = cache_load("precons.json", {})
    if offline:
        return cached
    try:
        lst = http_json("https://mtgjson.com/api/v5/DeckList.json")["data"]
    except Exception as e:
        log("Liste des decks MTGJSON indisponible :", e)
        return cached
    todo = [d for d in lst if d.get("type") == "Commander Deck" and d["fileName"] not in cached]
    log(f"Préconstruits : {len(todo)} nouveaux decks à lire")
    for d in todo:
        time.sleep(0.2)
        try:
            deck = http_json(f"https://mtgjson.com/api/v5/decks/{urllib.parse.quote(d['fileName'])}.json")["data"]
            cmd = [c["name"] for c in deck.get("commander") or []] + [c["name"] for c in deck.get("displayCommander") or []]
            cached[d["fileName"]] = {"deck": d["name"], "date": d.get("releaseDate"), "commanders": sorted(set(cmd))}
        except Exception as e:
            log(f"  deck {d['fileName']} : {e}")
    cache_save("precons.json", cached)
    return cached


# ---------------------------------------------------------------- Commander Spellbook : combos
def stream_variants(f, chunk=1 << 20):
    """Lit l'export de Commander Spellbook combo par combo, sans tout charger en mémoire (~700 Mo)."""
    dec = json.JSONDecoder()
    buf = ""
    while '"variants"' not in buf:
        more = f.read(chunk)
        if not more:
            return
        buf += more
    buf = buf[buf.index('"variants"'):]
    buf = buf[buf.index("[") + 1:]
    while True:
        buf = buf.lstrip(", \n\r\t")
        if buf.startswith("]"):
            return
        try:
            obj, end = dec.raw_decode(buf)
        except json.JSONDecodeError:
            more = f.read(chunk)
            if not more:
                return
            buf += more
            continue
        yield obj
        buf = buf[end:]
        if len(buf) < chunk:
            buf += f.read(chunk)


POPULAR_COMBO = 50  # un combo joué dans au moins 50 decks connus est considéré comme réellement joué


def fetch_spellbook(names, order, offline, local=None):
    """{commandant: {n: nb de combos, b: meilleure étiquette, two: nb de combos à 2 cartes forts, ex: exemples}}."""
    cached = cache_load("combos.json", {})
    if offline and not local:
        return cached
    rank = {t: i for i, t in enumerate(order)}
    out = {}
    try:
        if local:
            f = open(local, encoding="utf-8")
        else:
            log("Combos : téléchargement de l'export Commander Spellbook (~700 Mo)…")
            f = io.TextIOWrapper(http("https://json.commanderspellbook.com/variants.json", timeout=600), encoding="utf-8")
        n = 0
        with f:
            for v in stream_variants(f):
                n += 1
                tag = v.get("bracketTag")
                if tag not in rank or not (v.get("legalities") or {}).get("commander", True):
                    continue
                pieces = [u["card"]["name"] for u in v.get("uses", [])]
                pop = v.get("popularity") or 0  # nombre de decks qui jouent ce combo
                for p in pieces:
                    if p not in names:
                        continue
                    e = out.setdefault(p, {"n": 0, "b": "E", "bp": None, "two": 0, "pop": 0, "ex": []})
                    e["n"] += 1
                    if rank[tag] < rank[e["b"]]:
                        e["b"] = tag
                    if pop >= POPULAR_COMBO and (e["bp"] is None or rank[tag] < rank[e["bp"]]):
                        e["bp"] = tag  # meilleur combo réellement joué
                    e["pop"] = max(e["pop"], pop)
                    if len(pieces) == 2 and tag in "RS" and pop >= POPULAR_COMBO:
                        e["two"] += 1
                    others = [x for x in pieces if x != p]
                    if tag in "RSP" and len(e["ex"]) < 3 and others:
                        e["ex"].append({"avec": others[:3], "t": tag, "fait": [x["feature"]["name"] for x in v.get("produces", [])][:3]})
        log(f"Combos : {n} lus, {len(out)} commandants concernés")
        if n > 10000:
            cache_save("combos.json", out)
            return out
    except Exception as e:
        log("Commander Spellbook indisponible :", e)
    return cached


# ---------------------------------------------------------------- analyse d'une carte
def faces(c):
    return c.get("card_faces") or [c]


def card_name(c):
    return (faces(c)[0].get("name") or c["name"]) if c.get("layout") in ("transform", "modal_dfc", "flip") else c["name"]


def subtypes_of(type_line):
    if "—" not in (type_line or ""):
        return []
    return [s for s in type_line.split("—", 1)[1].split() if s and s != "//"]


def compile_rules(rules):
    tags = {k: [(re.compile(p), w) for p, w in v] for k, v in rules["tags"].items()}
    return tags, rules["kindred_words"], rules["fantasy_rules"]


def tag_text(text, name, tag_rules):
    t = (text or "").lower().replace(name.lower(), "~")
    t = re.sub(r"\([^)]*\)", "", t).replace("that target ~", "")  # retire le rappel et les protections
    scores = {}
    for tag, pats in tag_rules.items():
        s = sum(w for rx, w in pats if rx.search(t))
        if s:
            scores[tag] = s
    return scores


def fantasies(subs, ci, tags, frules):
    out = []
    for f, r in frules.items():
        if any(s in subs for s in r.get("types", [])):
            out.append(f)
            continue
        for color, tlist in r.get("colors_with_tags", []):
            if color in ci and any(t in tags for t in tlist):
                out.append(f)
                break
    return out[:3]


def price(v):
    try:
        return round(float(v), 2) if v else None
    except ValueError:
        return None


def partner_kind(c, low, tl, text=""):
    """Règles de duo : p partenaire, w « partenaire avec » (nom), f amis pour toujours, b choisit un Background,
    d Doctor's companion, t Doctor (Time Lord), s Personnage de Star Wars / autres variantes « Partner— »."""
    kw = c.get("keywords") or []
    fl, mate = "", None
    m = re.search(r"Partner with ([^\n(]+?)(?: \(|\n|$)", text)
    if "Partner with" in kw or m:
        fl += "w"
        if m:
            mate = m.group(1).strip()
    elif "Partner" in kw or re.search(r"(^|\n)partner($| \(|\n)", low):
        fl += "p"
    elif re.search(r"(^|\n)partner—", low):
        fl += "s"
    if "Friends forever" in kw:
        fl += "f"
    if "Choose a Background" in kw or "choose a background" in low:
        fl += "b"
    if "Doctor's companion" in kw:
        fl += "d"
    if "Time Lord Doctor" in tl:
        fl += "t"
    return fl, mate


def complexity(text, layout, n_styles):
    body = re.sub(r"\([^)]*\)", "", text or "")
    L = len(body)
    lines = [l for l in body.split("\n") if l.strip()]
    trig = len(re.findall(r"\b(whenever|at the beginning|when)\b", body, re.I))
    choice = len(re.findall(r"\b(choose|you may|any number|for each|instead)\b", body, re.I))
    x = 1 + min(2.0, L / 260) + min(1.0, 0.22 * max(0, len(lines) - 1)) + min(0.6, 0.2 * trig) + min(0.5, 0.12 * choice)
    if layout in ("transform", "modal_dfc", "flip", "meld"):
        x += 0.4
    x += min(0.4, 0.2 * max(0, n_styles - 1))
    return round(max(1.0, min(5.0, x)), 2)


# ---------------------------------------------------------------- construction
def build(cards, curated, rules, src, otags, combos, precons, fr, cedh=None):
    tag_rules, kindred_words, frules = compile_rules(rules)
    cur = {c["n"]: c for c in curated}
    cedh = cedh or {}
    bonus = src["spellbook_tags"]["bonus"]

    # étiquette → styles ; nom → étiquettes
    tag_arch = {}
    for arch, lst in src["otags"].items():
        for t, w in lst:
            tag_arch.setdefault(t, []).append((arch, w))
    hits = {}
    for t, names in otags.items():
        for n in names:
            hits.setdefault(n, set()).add(t)
    power_tags = dict(src["power_otags"])
    precon_of = {}
    for d in precons.values():
        for n in d["commanders"]:
            precon_of.setdefault(n, []).append((d.get("date") or "", d["deck"]))

    out, seen = [], set()
    for c in cards:
        if c.get("layout") in SKIP_LAYOUTS:
            continue
        # La légalité en Commander suffit : les cartes purement numériques n'y sont jamais légales. On ne filtre pas
        # sur « games », car Scryfall choisit parfois une impression Magic Online (ex. Phelddagrif, Masters Edition).
        if (c.get("legalities") or {}).get("commander") != "legal":
            continue
        fs = faces(c)
        front = fs[0]
        tl = front.get("type_line") or c.get("type_line") or ""
        text = "\n".join(f.get("oracle_text", "") or "" for f in fs)
        low = text.lower()
        legendary = "Legendary" in tl
        eligible = (legendary and "Creature" in tl) or "can be your commander" in low \
            or (legendary and ("Vehicle" in tl or "Spacecraft" in tl) and front.get("power") is not None)
        if not eligible:
            continue
        name = front.get("name") or c["name"]
        if name in seen:
            continue
        seen.add(name)
        subs = []
        for f in fs:
            for s in subtypes_of(f.get("type_line")):
                if s not in subs:
                    subs.append(s)
        ci = "".join(x for x in "WUBRG" if x in (c.get("color_identity") or []))

        # --- styles : règles sur le texte + étiquettes Scryfall + combos
        rule = tag_text(text, name, tag_rules)
        body = low.replace(name.lower(), "~")
        kin = sum(len(re.findall(r"\b" + re.escape(s.lower()) + r"(?:s|es)?\b", body)) for s in subs if s != "Human") \
            + (2 if any(w in low for w in kindred_words) else 0)
        my_tags = hits.get(name, set())
        s = {}
        for a in ARCH:
            st = 1.0
            for t in my_tags:
                for arch, w in tag_arch.get(t, []):
                    if arch == a:
                        st *= (1 - w)
            s_tag = 1 - st
            s_rule = min(1.0, rule.get(a, 0) / 4)
            if a == "kindred":
                s_rule = max(s_rule, min(1.0, kin / 3))
            v = 1 - (1 - s_tag) * (1 - 0.75 * s_rule)
            if v >= 0.05:
                s[a] = v
        cb = combos.get(name)
        if cb:  # style combo : selon le meilleur combo réellement joué (à défaut, la moitié pour un combo seulement possible)
            sty = src["spellbook_tags"]["style"]
            s_cb = max(sty.get(cb.get("bp") or "", 0), 0.5 * sty.get(cb["b"], 0))
            if (cb.get("bp") or cb["b"]) == "E":
                s_cb = 0.05 * min(6, cb["n"])
            s_cb = min(0.95, s_cb + 0.1 * min(2, cb["two"]))
            s["combo"] = 1 - (1 - s.get("combo", 0)) * (1 - s_cb)
        k = cur.get(name)
        if k:  # corrections manuelles : elles priment, les autres valeurs sont atténuées
            s = {a: v * 0.5 for a, v in s.items()}
            for i, a in enumerate(k["t"]):
                s[a] = max(s.get(a, 0), [1.0, 0.8, 0.6][i] if i < 3 else 0.5)
        s = {a: round(v, 2) for a, v in sorted(s.items(), key=lambda x: -x[1]) if v >= 0.1}
        ranked = list(s)
        t = [a for a in ranked if s[a] >= 0.45][:3] or ranked[:1]

        # --- confiance dans les styles
        n_src = (1 if any(t2 in tag_arch for t2 in my_tags) else 0) + (1 if rule else 0) + (1 if cb else 0)
        sc = 1.0 if k else round(min(0.9, 0.25 + 0.2 * n_src + (0.15 if s and max(s.values()) >= 0.6 else 0)), 2)

        # --- puissance estimée (échelle des brackets, 1 à 5)
        fl, mate = partner_kind(c, low, tl, text)
        gc = bool(c.get("game_changer"))
        mv = c.get("cmc") or 0
        p = 2.0 + (1.0 if gc else 0)
        if cb:  # combos réellement joués : plein bonus ; combos seulement possibles : un tiers
            p += max(bonus.get(cb.get("bp") or "", 0), bonus.get(cb["b"], 0) / 3) + min(0.75, 0.25 * cb["two"])
            if cb.get("pop", 0) >= 2000:
                p += 0.3
        p += min(0.6, sum(w for tg, w in power_tags.items() if tg in my_tags))
        if mv <= 2 and (cb or my_tags):
            p += 0.2
        elif mv >= 7:
            p -= 0.2
        pc = sorted(precon_of.get(name, []))
        if pc and not (cb and cb["b"] in "RS"):
            p -= 0.2
        if (not s or max(s.values()) < 0.3) and len(text) < 160:
            p -= 0.6
        if "p" in fl or "f" in fl:  # partenaire libre : deux commandants, souplesse de couleurs et de moteur
            p += 0.3
        if k:
            p = 0.5 * p + 0.5 * {1: 1.5, 2: 2.5, 3: 3.8}.get(k["pw"], 2.5)
        if name in cedh:  # référence manuelle : commandant joué en cEDH (data/power_ref.json)
            p = max(p, cedh[name])
        p = round(max(1.0, min(5.0, p)), 2)

        # --- complexité (1 à 5)
        x = complexity(text, c.get("layout"), len(t))
        if k:
            x = round(0.5 * x + 0.5 * {1: 1.5, 2: 3.0, 3: 4.5}[k["cx"]], 2)

        if "Creature" not in tl:
            fl += "a"
        rank = c.get("edhrec_rank")
        img = (front.get("image_uris") or c.get("image_uris") or {})
        ub = "ub" if "universesbeyond" in (c.get("promo_types") or []) else ""
        tags_v3 = t
        e = {"n": name, "fr": fr.get(name), "ci": ci, "tl": tl,
             "t": tags_v3, "s": s, "sc": sc,
             "f": fantasies(subs, ci, tags_v3, frules), "k": [x2 for x2 in subs if x2 != "Human"],
             "p": p, "pw": 3 if p >= 3.4 else 1 if p < 1.8 else 2,
             "x": x, "cx": 1 if x < 2.3 else 3 if x >= 3.5 else 2,
             "r": rank, "pop": 3 if rank and rank <= 1500 else 2 if rank and rank <= 9000 else 1,
             "fl": fl, "mate": mate, "ub": ub, "d": "", "o": re.sub(r"\s+", " ", text)[:240],
             "pc": [f"{d} ({dt[:4]})" for dt, d in pc][:3],
             "cb": {"n": cb["n"], "b": cb["b"], "bp": cb.get("bp"), "two": cb["two"], "pop": cb.get("pop", 0), "ex": cb["ex"]} if cb else None,
             "usd": price((c.get("prices") or {}).get("usd")), "eur": price((c.get("prices") or {}).get("eur")),
             "img": img.get("normal"), "art": img.get("art_crop"), "sf": (c.get("scryfall_uri") or "").split("?")[0],
             "gc": gc, "auto": not k}
        if k:
            e.update({"f": k["f"], "fl": "".join(sorted(set(e["fl"] + k["fl"]))), "ub": k["ub"] or ub, "d": k["d"]})
            e["k"] = sorted(set(e["k"]) | set(k["kx"]))
        out.append(e)

    # popularité en percentile parmi les commandants (1 = le plus joué)
    ranked = sorted((e for e in out if e["r"]), key=lambda e: e["r"])
    for i, e in enumerate(ranked):
        e["pp"] = round(1 - i / max(1, len(ranked) - 1), 3)
    for e in out:
        e.setdefault("pp", 0.0)
    out.sort(key=lambda e: (e["r"] or 10**9, e["n"]))
    return out


# ---------------------------------------------------------------- rapport de qualité
def quality_report(built, curated, cards, curated_raw_rules):
    """Compare les styles déduits automatiquement aux 135 commandants vérifiés à la main (sans leur correction)."""
    cur = {c["n"]: c for c in curated}
    rep = {"commandants": len(built)}
    rep["sans_style"] = sum(1 for e in built if not e["t"])
    rep["avec_combo"] = sum(1 for e in built if e["cb"])
    rep["preconstruits"] = sum(1 for e in built if e["pc"])
    rep["noms_fr"] = sum(1 for e in built if e["fr"])
    rep["universes_beyond"] = sum(1 for e in built if e["ub"])
    rep["puissance"] = {str(b): sum(1 for e in built if b <= e["p"] < b + 1) for b in range(1, 6)}
    rep["complexite"] = {str(b): sum(1 for e in built if b <= e["x"] < b + 1) for b in range(1, 6)}
    return rep


def blind_accuracy(cards, curated, rules, src, otags, combos, precons, fr):
    """Refait la construction SANS les corrections manuelles, et mesure l'accord avec elles."""
    blind = build(cards, [], rules, src, otags, combos, precons, fr)
    b = {e["n"]: e for e in blind}
    top1 = any3 = n = 0
    pw_pairs = []
    for c in curated:
        e = b.get(c["n"])
        if not e:
            continue
        n += 1
        if e["t"] and e["t"][0] == c["t"][0]:
            top1 += 1
        if set(e["t"]) & set(c["t"]):
            any3 += 1
        pw_pairs.append((e["p"], c["pw"]))
    mean = {lvl: round(sum(p for p, w in pw_pairs if w == lvl) / max(1, sum(1 for _, w in pw_pairs if w == lvl)), 2) for lvl in (1, 2, 3)}
    return {"verifies": n, "style_principal_trouve": round(top1 / max(1, n), 3), "au_moins_un_style_commun": round(any3 / max(1, n), 3),
            "puissance_moyenne_par_niveau_verifie": mean}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", help="cartes Scryfall locales (JSON ou JSON Lines, gzip accepté)")
    ap.add_argument("--spellbook", help="export Commander Spellbook local (variants.json)")
    ap.add_argument("--offline", action="store_true", help="aucun réseau : caches de data/cache uniquement")
    ap.add_argument("--out", default=DATA)
    a = ap.parse_args()
    rules = json.load(open(os.path.join(DATA, "rules.json"), encoding="utf-8"))
    src = json.load(open(os.path.join(DATA, "sources.json"), encoding="utf-8"))
    curated = json.load(open(os.path.join(DATA, "curated.json"), encoding="utf-8"))["cards"]
    if a.offline and not a.input:
        raise SystemExit("--offline demande --input (les cartes Scryfall ne sont pas mises en cache).")

    cards = load_bulk(a.input)
    names = set()
    for c in cards:  # noms candidats pour les combos (tri rapide, la vraie sélection est dans build)
        tl = (faces(c)[0].get("type_line") or c.get("type_line") or "")
        if "Legendary" in tl or "can be your commander" in (c.get("oracle_text") or "").lower():
            names.add(faces(c)[0].get("name") or c["name"])
    log("Étiquettes de fonction Scryfall…")
    otags, missing = fetch_otags(src, a.offline)
    log("Noms français…")
    fr = fetch_french(a.offline)
    precons = fetch_precons(a.offline)
    combos = fetch_spellbook(names, src["spellbook_tags"]["order"], a.offline, a.spellbook)

    ref = json.load(open(os.path.join(DATA, "power_ref.json"), encoding="utf-8"))
    cedh = {n: ref["valeurs"]["fort"] for n in ref["fort"]}
    cedh.update({n: ref["valeurs"]["cedh"] for n in ref["cedh"]})
    built = build(cards, curated, rules, src, otags, combos, precons, fr, cedh)
    missing_cur = sorted(set(c["n"] for c in curated) - set(e["n"] for e in built))
    rep = quality_report(built, curated, cards, rules)
    rep["precision_sans_corrections"] = blind_accuracy(cards, curated, rules, src, otags, combos, precons, fr)
    rep["etiquettes_inconnues"] = missing
    have = {e["n"] for e in built}
    rep["references_puissance_introuvables"] = sorted(n for n in cedh if n not in have)
    rep["corrections_sans_correspondance"] = missing_cur
    today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    meta = {"built": today, "count": len(built), "version": 4,
            "source": "Scryfall (https://scryfall.com), Commander Spellbook (https://commanderspellbook.com), MTGJSON (https://mtgjson.com)",
            "curated_missing": missing_cur}
    # Backgrounds : pour les duos « Choisis un Background »
    meta["backgrounds"] = sorted(c["name"] for c in cards if "Background" in (c.get("type_line") or "")
                                 and (c.get("legalities") or {}).get("commander") == "legal")
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, "commanders.json"), "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "cards": built}, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(a.out, "report.json"), "w", encoding="utf-8") as f:
        json.dump(dict(rep, date=today), f, ensure_ascii=False, indent=1)
    types = load_types(a.offline or bool(a.input))
    if types:
        with open(os.path.join(a.out, "types.json"), "w", encoding="utf-8") as f:
            json.dump(sorted(types), f, ensure_ascii=False)
    log(json.dumps(rep, ensure_ascii=False, indent=1))
    print(f"{len(built)} commandants écrits ({today}).")


if __name__ == "__main__":
    main()
