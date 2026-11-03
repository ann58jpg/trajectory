# Встраивание данных tabiturient.ru (data/import/*.json, см. scripts/import-tabiturient.ts) в каталог:
# все вузы и филиалы России, все направления бакалавриата и специалитета, программы вузов с проходными баллами,
# наборы ЕГЭ по направлениям и дни открытых дверей. Ничего не придумываем: чего нет в источнике — null или «нет данных».
import json, os, re
from collections import defaultdict

SRC = "https://tabiturient.ru"

# Вузы, которые не связать автоматически (у нас короткое имя другое и регион «Москва/область» разведён): адрес на tabiturient → наш id
EXPLICIT = {"mgu": "msu", "mipt": "mipt", "mgmu": "sechenov", "mgua": "msal", "fu": "fa", "mifi": "mephi", "tiu": "tiu",
            "stroganov": "stroganov", "nchti": "nchti", "mgmsu": "msmsu", "eltech": "etu", "spbgmu": "spbgmu1", "kalmgu": "kalmsu",
            "iateobninsk": "rgau_dubna", "raj": "rgup", "lgu_pushkin": "lengu", "mosconsv": "mosconsv", "gitis": "gitis", "vgik": "vgik"}

SUBJ = {"Русский язык": "rus", "Математика": "math", "ИКТ": "inf", "Информатика": "inf", "Физика": "phys", "Химия": "chem",
        "Биология": "bio", "Обществознание": "soc", "История": "hist", "Литература": "lit", "Иностранный язык": "foreign",
        "География": "geo"}
ORDER = ["rus", "math", "soc", "bio", "chem", "phys", "inf", "hist", "lit", "foreign", "geo"]
INTERNAL = re.compile(r"Внутренн|Творческ|Профессиональн|Дополнительн|Собеседован|Физическ", re.I)

# Регионы tabiturient → наши id. Москва/Петербург с областью у них вместе: головные вузы — город, филиалы — область.
REGION_ALIAS = {
    "Кемеровская область": "kemerovo", "Тюменская область": "tyumen", "Ханты-Мансийский автономный округ — Югра": "tyumen",
    "Республика Северная Осетия - Алания": "north_ossetia", "Чеченская республика": "chechnya",
}
# Регионов, где есть вузы, но которых не было в каталоге: зарплатные коэффициенты — среднее по округу (оценка)
NEW_REGIONS = {
    "Республика Тыва": ("tyva", "Кызыл", "СФО"), "Республика Ингушетия": ("ingushetia", "Магас", "СКФО"),
    "Карачаево-Черкесская Республика": ("kchr", "Черкесск", "СКФО"), "Республика Алтай": ("altai_rep", "Горно-Алтайск", "СФО"),
    "Еврейская автономная область": ("eao", "Биробиджан", "ДФО"), "Магаданская область": ("magadan", "Магадан", "ДФО"),
    "Чукотский автономный округ": ("chukotka", "Анадырь", "ДФО"),
}

def norm(s):
    s = (s or "").lower().replace("ё", "е")
    s = re.sub(r"[«»\"()—–\-,.№]", " ", s)
    s = re.sub(r"\b(фгбоу|фгаоу|фгкоу|фгбвоу|во|имени|им|федеральное|государственное|бюджетное|автономное|образовательное|учреждение|высшего|образования|филиал)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def load(D):
    p = lambda n: D("import", n)
    if not all(os.path.exists(p(n)) for n in ("tabiturient-vuz.json", "tabiturient-np.json")):
        return None
    out = {n: json.load(open(p(f"tabiturient-{n}.json"), encoding="utf8")) for n in ("vuz", "np")}
    out["dod"] = json.load(open(p("tabiturient-dod.json"), encoding="utf8")) if os.path.exists(p("tabiturient-dod.json")) else {"items": []}
    return out

def ege_from_sets(sets):
    """Набор ЕГЭ направления по реальным наборам вузов: общие предметы — обязательные, остальные — на выбор."""
    parsed = []
    for s in sets:
        parts = [x.strip() for x in s["exams"].split("+")]
        ids = [SUBJ[x] for x in parts if x in SUBJ]
        parsed.append((ids, any(INTERNAL.search(x) for x in parts), s["places"]))
    main = [x for x in parsed if x[2] > 0] or parsed
    if not main:
        return None
    common = set(main[0][0]).intersection(*[set(x[0]) for x in main[1:]]) if main else set()
    every = {s for x in main for s in x[0]}
    mandatory = [s for s in ORDER if s in common]
    one_of = [s for s in ORDER if s in every and s not in common]
    dvi_everywhere = all(x[1] for x in main)
    return mandatory, one_of, dvi_everywhere

CITY_RE = re.compile(r"(?:в г(?:ороде)?\.?\s*|г\.\s*)([А-ЯЁ][а-яё]+(?:[- ][А-ЯЁа-яё][а-яё]+)*)")

def city_for(card, region, branch):
    """Город: головной вуз — столица региона; филиал — город из названия («… в г. Сызрани»), иначе столица."""
    capital = region["capital"]
    if not branch:
        return capital
    m = CITY_RE.search(card["name"])
    if not m:
        return capital
    x = m.group(1)
    known = {c["name"] for c in region["cities"]}
    for cand in (x, x[:-1], x[:-1] + "ь", x[:-1] + "а", x[:-1] + "я", x[:-2] + "ый" if x.endswith("ом") else x):
        if cand in known:
            return cand
    # предложный падеж → именительный по простым правилам
    if x.endswith("ске") or x.endswith("ке") or x.endswith("ге") or x.endswith("не") or x.endswith("ве") or x.endswith("ре"):
        return x[:-1]
    if x.endswith("и") and not x.endswith("ти"):
        return x[:-1] + "ь"
    return x

def merge(T, *, specialties, spec_index, regions, universities, programs, events, profs, G, spec_profs_by_group, new_program, today):
    report = defaultdict(int)
    vuz, npd, dod = T["vuz"], T["np"], T["dod"]
    checked = npd.get("checkedAt", today)

    # ── регионы
    reg_by_name = {r["name"]: r for r in regions}
    def region_for(card):
        name = card["region"]
        branch = card["branch"]
        if name == "Москва и Московская область":
            return reg_by_name["Московская область" if branch and "Москв" not in card["name"] else "Москва"]
        if name == "Санкт-Петербург и Ленинградская область":
            return reg_by_name["Ленинградская область" if branch and "Петербург" not in card["name"] else "Санкт-Петербург"]
        if name == "Республика Крым и Севастополь":
            return reg_by_name["Севастополь" if "Севастоп" in card["name"] else "Республика Крым"]
        if name in reg_by_name:
            return reg_by_name[name]
        rid = REGION_ALIAS.get(name)
        if rid:
            return next(r for r in regions if r["id"] == rid)
        if name in NEW_REGIONS:
            rid, capital, fo = NEW_REGIONS[name]
            same = [r for r in regions if r["federalDistrict"] == fo]
            avg = lambda k: sum(r[k] for r in same) / len(same)
            r = dict(id=rid, name=name, capital=capital, federalDistrict=fo, cities=[dict(name=capital, salaryCoef=1.0, hub=True)],
                     salaryCoef=round(avg("salaryCoef"), 2), medianSalary=round(avg("medianSalary") / 100) * 100, rent=round(avg("rent") / 1000) * 1000,
                     studentBudget=round(avg("studentBudget") / 1000) * 1000, vacancyShare=round(avg("vacancyShare"), 4), industries=[], employers=[],
                     neighbors=[], hhAreaId=None,
                     meta=dict(source="Оценка: среднее по федеральному округу (своих данных Росстата по региону в каталоге нет)", updatedAt=today, confidence="estimate"))
            regions.insert(len(regions) - 1 if regions[-1]["id"] == "abroad" else len(regions), r)
            reg_by_name[name] = r
            report["regions_added"] += 1
            return r
        return None

    # ── вузы: сопоставляем с нашими, остальные добавляем
    ours = [u for u in universities if not u["abroad"]]
    by_full = {norm(u["name"]): u for u in ours}
    by_short = defaultdict(list)
    for u in ours:
        by_short[norm(u["short"])].append(u)
    by_alias = defaultdict(list)
    for u in ours:
        for a in u.get("aliases", []):
            by_alias[norm(a)].append(u)
    card_to_uni = {}
    used = set()
    PAIRS = ({"moscow", "moscow_obl"}, {"spb", "len_obl"}, {"crimea", "sevastopol"})
    def same_region(a, b):
        return a == b or any(a in p and b in p for p in PAIRS)
    def toks(x):
        return {w for w in norm(x).split() if len(w) > 3}
    for c in vuz["items"]:
        reg = region_for(c)
        hit = None
        if c.get("slug") in EXPLICIT and (not c["branch"] or c["slug"] in ("nchti", "iateobninsk")):
            hit = next((u for u in ours if u["id"] == EXPLICIT[c["slug"]]), None)
        if not hit:
            hit = by_full.get(norm(c["name"]))
        if not hit and not c["branch"]:
            cands = {u["id"]: u for u in by_short.get(norm(c["short"]), []) + by_alias.get(norm(c["short"]), []) if reg and same_region(u["regionId"], reg["id"])}
            hit = next(iter(cands.values())) if len(cands) == 1 else None
        if not hit and c.get("slug") and not c["branch"]:
            site_hit = [u for u in ours if c["slug"] == (u["site"].split("//")[-1].replace("www.", "").split(".")[0]) and reg and same_region(u["regionId"], reg["id"])]
            hit = site_hit[0] if len(site_hit) == 1 else None
        if not hit and not c["branch"] and reg:
            # совпадение слов полного названия в том же регионе
            tc = toks(c["name"])
            scored = sorted(((len(tc & toks(u["name"])) / max(1, len(tc | toks(u["name"]))), u) for u in ours if same_region(u["regionId"], reg["id"]) and u["id"] not in used), key=lambda z: -z[0])
            if scored and scored[0][0] >= 0.6:
                hit = scored[0][1]
        if hit and hit["id"] not in used:
            used.add(hit["id"])
            hit["tabiturientSlug"] = c.get("slug")
            if "yandex.ru/search" in hit["site"] and c.get("site"):
                hit["site"] = hit["admissionUrl"] = hit["eventsUrl"] = c["site"]
            card_to_uni[(c["short"], c["name"])] = hit["id"]
            report["unis_matched"] += 1
            continue
        if not reg:
            report["unis_no_region"] += 1
            continue
        uid = "t_" + (c.get("slug") or c["tabId"])
        if any(u["id"] == uid for u in universities):
            uid = f"t_{c['tabId']}"
        page = f"{SRC}/vuzu/{c['slug']}/about/" if c.get("slug") else f"{SRC}/vuzu/"
        site = c.get("site") or page
        facts = []
        if c.get("budgetPlaces"):
            facts.append(f"{c['budgetPlaces']} бюджетных мест")
        if c.get("avgPass"):
            facts.append(f"средний проходной балл ЕГЭ {c['avgPass']} за предмет")
        desc = ("Филиал. " if c["branch"] else "") + (f"По данным tabiturient.ru: {', '.join(facts)}." if facts else "Подробности — на сайте вуза.")
        city = city_for(c, reg, c["branch"])
        if city not in {x["name"] for x in reg["cities"]}:
            reg["cities"].append(dict(name=city, salaryCoef=1.0, hub=False))
        universities.append(dict(
            id=uid, name=c["name"], short=c["short"], type="university", city=city, regionId=reg["id"], abroad=False,
            site=site, admissionUrl=site, eventsUrl=f"{SRC}/vuzu/{c['slug']}/dod/" if c.get("slug") else site,
            dorm=None, vuc=None, budget=c.get("budgetPlaces") != 0, sponsored=False, tabiturientSlug=c.get("slug"),
            features=["branch"] if c["branch"] else [],
            ratings=dict(raex=None, employers=0.5, meta=dict(source="Нет данных об отзывах работодателей — нейтральное значение", updatedAt=today, confidence="estimate")),
            priceFrom=None, priceTo=None, priceMeta=dict(source="Нет данных о стоимости — смотри приказ о стоимости на сайте вуза", updatedAt=today, confidence="estimate"),
            description=desc, howToGet="", aliases=[c["short"].lower()],
        ))
        card_to_uni[(c["short"], c["name"])] = uid
        report["unis_added"] += 1
    uni_by_id = {u["id"]: u for u in universities}

    # ── направления: наборы ЕГЭ и статистика по РФ; недостающие направления добавляем
    spec_by_code = spec_index  # тот же словарь, что у new_program в gen-catalog
    for x in npd["items"]:
        code = x["code"]
        g = G.get(code[:2])
        if not g:
            continue
        ege = ege_from_sets(x.get("examSets") or [])
        stats = dict(budgetRF=x.get("budgetRF"), universities=x.get("universities"), programs=x.get("programsRF"),
                     avgPassPerSubject=(x.get("avgPass") or {}).get("perSubject"), year=(x.get("avgPass") or {}).get("year"),
                     url=x["url"], checkedAt=checked)
        s = spec_by_code.get(code)
        if not s:
            level = "specialist" if code[3:5] == "05" else "bachelor"
            years = 6 if code in ("31.05.01", "31.05.02", "31.05.03", "32.05.01") else 5.5 if code == "31.05.04" else 5 if level == "specialist" else 4
            plist = [p for p in spec_profs_by_group.get(code[:2], []) if p in profs][:3]
            if not plist:
                report["specs_skipped_no_prof"] += 1
                continue
            tags = list(dict.fromkeys(g["tags"]))
            s = dict(code=code, name=x["name"], level=level, years=years,
                     ege={"mandatory": ["rus"], "oneOf": []}, dvi=g["dvi"], group=g["code"], tags=tags, klimov=g["kl"], disciplines=[],
                     employment=dict(rate=g["emp"], monthsToJob=g["months"],
                                     meta=dict(source="Мониторинг трудоустройства выпускников (оценка по группе направлений)", updatedAt=today, confidence="estimate")),
                     description=f"Направление из группы «{g['name']}». Описание и учебный план смотри на сайтах вузов.",
                     autoDescription=True, professions=plist)
            specialties.append(s)
            spec_by_code[code] = s
            for pid in plist:
                if code not in profs[pid]["specialties"]:
                    profs[pid]["specialties"].append(code)
            report["specs_added"] += 1
        s["stats"] = stats
        if ege:
            mandatory, one_of, dvi_all = ege
            # реальные наборы заменяют наши, если они согласованы (общих предметов хотя бы два)
            if len(mandatory) >= 2 or not s["ege"]["mandatory"] or s["ege"]["mandatory"] == ["rus"]:
                if mandatory:
                    if s["ege"] != {"mandatory": mandatory, "oneOf": one_of}:
                        report["ege_updated"] += 1
                    s["ege"] = {"mandatory": mandatory, "oneOf": one_of}
            if dvi_all and not s.get("dvi"):
                s["dvi"] = g["dvi"] or "written"
        if s.get("name") != x["name"] and not s.get("autoDescription") is False:
            pass

    # ── программы и проходные баллы
    prog_by_id = {p["id"]: p for p in programs}
    np_by_code = {x["code"]: x for x in npd["items"]}
    agg = defaultdict(list)
    for x in npd["items"]:
        for c in x.get("programs") or []:
            uid = card_to_uni.get((c["short"], c["name"]))
            if uid and x["code"] in spec_by_code:
                agg[(uid, x["code"])].append(c)
            elif not uid:
                report["cards_no_uni"] += 1
    FORM = {"очно": "full", "очно-заочно": "evening", "заочно": "distance"}
    for (uid, code), cards in agg.items():
        u = uni_by_id[uid]
        spec = spec_by_code[code]
        if spec["level"] == "spo" or u["type"] == "college":
            continue
        pid = f"{uid}__{code}"
        p = prog_by_id.get(pid)
        if not p:
            p = new_program(u, code)
            p["meta"] = dict(source="tabiturient.ru: программа есть в перечне вуза", updatedAt=checked, confidence="verified")
            programs.append(p)
            prog_by_id[pid] = p
            report["programs_added"] += 1
        forms = sorted({FORM[s["form"]] for c in cards for s in c["scores"] if s["form"] in FORM}, key=["full", "evening", "distance"].index)
        if forms and p.get("generated"):
            p["forms"] = forms
        if len(cards) > 1 or (cards and cards[0]["profile"] not in ("", "Без профиля")):
            profiles = [c["profile"] for c in cards if c["profile"] and c["profile"] != "Без профиля"]
            if profiles:
                p["profiles"] = profiles[:12]
        np_id = np_by_code[code]["npId"]
        url = f"{SRC}/vuzu/{u['tabiturientSlug']}/proxodnoi/?{np_id}" if u.get("tabiturientSlug") else np_by_code[code]["url"]
        official = []
        for basis in ("budget", "paid"):
            pts = [(s["year"], s["total"], c) for c in cards for s in c["scores"] if s["basis"] == basis and s["form"] == "очно"]
            if not pts:
                continue
            year = max(y for y, _, _ in pts)
            best = min(((t, c) for y, t, c in pts if y == year), key=lambda z: z[0])
            n = len({id(c) for y, _, c in pts if y == year})
            official.append(dict(year=year, basis=basis, total=best[0],
                                 includesDvi=any(INTERNAL.search(e) for e in best[1]["exams"]), url=url,
                                 source=f"tabiturient.ru: проходной балл {'на бюджет' if basis == 'budget' else 'на платное'}, очно" + (f", минимальный из {n} профилей" if n > 1 else ""),
                                 checkedAt=checked))
        if official:
            keep = [o for o in p["passScore"]["official"] if not any(o["year"] == n["year"] and o["basis"] == n["basis"] for n in official)]
            for o in p["passScore"]["official"]:
                for n in official:
                    if o["year"] == n["year"] and o["basis"] == n["basis"] and o["total"] != n["total"]:
                        report["pass_conflicts"] += 1
                        report.setdefault("conflict_list", []).append(f"{pid} {o['year']} {o['basis']}: {o['total']} ({o['source'][:40]}) против {n['total']} (tabiturient)")
            p["passScore"]["official"] = sorted(keep + official, key=lambda o: (-o["year"], o["basis"] != "budget"))
            report["pass_found"] += sum(1 for o in official if o["basis"] == "budget")

    # ── мероприятия
    by_short_uni = defaultdict(list)
    for c in vuz["items"]:
        uid = card_to_uni.get((c["short"], c["name"]))
        if uid:
            by_short_uni[c["short"]].append((c["branch"], uid))
    have = {(e["universityId"], e.get("date"), e["title"]) for e in events}
    for e in dod["items"]:
        cands = sorted(by_short_uni.get(e["uniShort"], []))
        if not cands:
            report["dod_no_uni"] += 1
            continue
        uid = cands[0][1]
        title = e["title"] or "День открытых дверей"
        if (uid, e["date"], title) in have:
            continue
        low = title.lower()
        typ = "excursion" if "экскурс" in low else "masterclass" if "мастер" in low else "olympiad" if "олимпиад" in low else "school" if "школ" in low else "lecture" if "лекци" in low else "open_day"
        fmt = "online" if re.search(r"онлайн|online|дистанц|трансляц", e["place"] + low, re.I) else "offline"
        y, m, d = e["date"].split("-")
        MON = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"]
        official = e["url"] if "tabiturient.ru" not in e["url"] else e["tabiturientUrl"]
        events.append(dict(
            id=f"t_dod_{e['id']}", universityId=uid, title=title, type=typ, format=fmt, date=e["date"], time=e["time"],
            when=f"{int(d)} {MON[int(m) - 1]} {y}" + (f", {e['time']}" if e["time"] else ""),
            url=official, why=WHY.get(typ, WHY["open_day"]) + (f" Где: {e['place']}." if e["place"] else ""),
            source="verified", sourceUrl=e["cityPage"], checkedAt=dod.get("checkedAt", today),
        ))
        have.add((uid, e["date"], title))
        report["dod_added"] += 1
    return report

WHY = {
    "open_day": "Расскажут о программах, экзаменах и бюджетных местах, можно задать вопросы приёмной комиссии.",
    "excursion": "Увидишь аудитории и лаборатории своими глазами.",
    "masterclass": "Попробуешь себя в деле и поймёшь, интересно ли это.",
    "olympiad": "Победа или призёрство может дать льготы при поступлении.",
    "school": "Подготовка к поступлению и знакомство с преподавателями.",
    "lecture": "Послушаешь, как здесь преподают.",
}
