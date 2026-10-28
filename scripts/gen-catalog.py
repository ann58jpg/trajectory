# Генератор каталога (пункты 3–4 правок v2): направления по группам, профессии, регионы, вузы, программы, мероприятия.
# Источники — таблицы в scripts/data_src/*.py (перечень направлений как на tabiturient.ru/np) + уже собранные data/*.json.
# Запуск из корня репозитория: python3 scripts/gen-catalog.py
import json, os, sys, glob, urllib.parse
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts", "data_src"))
import groups, common, specialties_a, specialties_b  # noqa: E402,F401
import prof_common, prof_old, prof_new_a, prof_new_b, prof_new_c  # noqa: E402,F401
import regions_new, unis  # noqa: E402
from groups import G  # noqa: E402
from common import SPECS  # noqa: E402
from prof_common import PROFS, OVERRIDES  # noqa: E402

D = lambda *p: os.path.join(ROOT, "data", *p)
load = lambda f: json.load(open(D(f), encoding="utf8"))
def dump(obj, path):
    with open(path, "w", encoding="utf8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write("\n")

old_specs = {s["code"]: s for s in (load("specialties.json") if os.path.exists(D("specialties.json")) else
             [x for f in sorted(glob.glob(D("specialties", "*.json"))) for x in json.load(open(f, encoding="utf8"))])}
old_profs = load("professions.json")
# Берём только «старые» профессии (до v2), если генератор уже запускался
old_profs = [p for p in old_profs if p["id"] not in PROFS]

EMP_META = {"source": "Мониторинг трудоустройства выпускников Минобрнауки (graduate.edu.ru), оценка по группе направлений",
            "updatedAt": "2025-06", "confidence": "estimate"}
SAL_META = {"source": "hh.ru: вилки в вакансиях 2025, приведение к среднему региону — оценка", "updatedAt": "2025-09", "confidence": "estimate"}
DEM_META = {"source": "hh.ru: число вакансий по РФ и динамика год к году (оценка)", "updatedAt": "2025-09", "confidence": "estimate"}

# ───────── Профессии ─────────
spec_profs = defaultdict(list)  # code -> [prof ids] в порядке из таблицы направлений
prof_specs = defaultdict(list)
for s in SPECS:
    for pid in s["profs"]:
        spec_profs[s["code"]].append(pid)
        prof_specs[pid].append(s["code"])

def auto_day(tasks):
    low = lambda t: t[0].lower() + t[1:]
    parts = [f"С утра — {low(tasks[0])}.", f"После обеда — {low(tasks[1])}."]
    if len(tasks) > 2:
        parts.append(f"А к концу недели надо {low(tasks[2])}.")
    return " ".join(parts)

professions = []
for p in old_profs:
    p = dict(p)
    o = OVERRIDES.get(p["id"])
    if o:
        p["workFormats"] = o["workFormats"]
        p["tasks"] = o["tasks"]
        p["tags"] = list(dict.fromkeys(p["tags"] + o["tags_add"]))
        if o["name"]:
            p["name"] = o["name"]
    p["specialties"] = list(dict.fromkeys(p["specialties"] + prof_specs.get(p["id"], [])))
    professions.append(p)
for pid, x in PROFS.items():
    j, m, s, c = x["sal"]
    professions.append(dict(
        id=pid, name=x["name"], specialties=list(dict.fromkeys(prof_specs.get(pid, []))), tasks=x["tasks"], skills=x["skills"], stack=x["stack"],
        tags=x["tags"], klimov=x["klimov"], workFormats=x["workFormats"],
        salary=dict(junior=j * 1000, middle=m * 1000, senior=s * 1000, ceiling=c * 1000, meta=SAL_META),
        demand=dict(vacanciesRF=x["dem"][0], trend=x["dem"][1], meta=DEM_META),
        earlyEntryCourse=x["early"], remote=x["remote"],
        outlook=dict(status=x["outlook"][0], reason=x["outlook"][1], source=x["outlook"][2]),
        aiRisk=x["aiRisk"], priorities=x["priorities"], industries=x["industries"],
        dayInLife=x["day"] or auto_day(x["tasks"]), similar=[], hhQuery=x["hhQuery"],
    ))
unbound = [p["id"] for p in professions if not p["specialties"]]
assert not unbound, f"профессии без направлений: {unbound}"
# Похожие профессии для новых: пересечение тегов и направлений
def sim(a, b):
    ta, tb = set(a["tags"]), set(b["tags"])
    sa, sb = set(a["specialties"]), set(b["specialties"])
    return len(ta & tb) / max(1, len(ta | tb)) + 0.6 * len(sa & sb) / max(1, len(sa | sb))
for p in professions:
    if not p["similar"]:
        cands = sorted((q for q in professions if q["id"] != p["id"]), key=lambda q: -sim(p, q))
        p["similar"] = [q["id"] for q in cands[:4]]
prof_by_id = {p["id"]: p for p in professions}

# ───────── Направления ─────────
# Описания с tabiturient.ru, если импорт уже запускали (npm run import:tabiturient -- np)
imported = {}
if os.path.exists(D("import", "tabiturient-np.json")):
    imported = {x["code"]: x for x in load("import/tabiturient-np.json")["items"] if x.get("description")}
specialties = []
for s in SPECS:
    g = G[s["group"]]
    o = old_specs.get(s["code"])
    if s["level"] == "spo":
        ege = {"mandatory": [], "oneOf": []}
    elif s["ege"]:
        ege = {"mandatory": list(s["ege"][0]), "oneOf": list(s["ege"][1])}
    else:
        ege = {"mandatory": list(g["ege"][0]), "oneOf": list(g["ege"][1])}
    dvi = g["dvi"] if s["dvi"] == "group" else s["dvi"]
    if s["level"] == "spo":
        dvi = None
    # Теги: группы + явные + те, что встречаются хотя бы у половины профессий направления
    tag_count = defaultdict(int)
    for pid in s["profs"]:
        for t in prof_by_id[pid]["tags"]:
            tag_count[t] += 1
    common_tags = [t for t, n in tag_count.items() if n * 2 >= len(s["profs"])]
    tags = list(dict.fromkeys((o["tags"] if o else []) + g["tags"] + (s["tags"].split() if s["tags"] else []) + common_tags))
    specialties.append(dict(
        code=s["code"], name=s["name"], level=s["level"], years=s["years"], ege=ege, dvi=dvi, group=g["code"],
        tags=tags, klimov=o["klimov"] if o else g["kl"], disciplines=s["disc"],
        employment=o["employment"] if o else dict(rate=g["emp"] if s["level"] != "spo" else min(0.92, g["emp"] + 0.05),
                                                  monthsToJob=g["months"], meta=EMP_META),
        description=imported[s["code"]]["description"] if s["code"] in imported else o["description"] if o else s["desc"],
        autoDescription=s["code"] not in imported, professions=list(dict.fromkeys(s["profs"])),
    ))
spec_by_code = {s["code"]: s for s in specialties}

# ───────── Регионы ─────────
regions = load("regions.json")
have = {r["id"] for r in regions}
for r in regions_new.R:
    if r["id"] not in have:
        regions.insert(len(regions) - 1 if regions[-1]["id"] == "abroad" else len(regions), r)
reg_by_id = {r["id"]: r for r in regions}
def ensure_city(region_id, city):
    r = reg_by_id[region_id]
    if not any(c["name"] == city for c in r["cities"]):
        r["cities"].append(dict(name=city, salaryCoef=1.0, hub=False))
ensure_city("tatarstan", "Нижнекамск")
for c in ("Нижнекамск",):
    pass

# ───────── Вузы ─────────
universities = [u for u in load("universities.json")]
old_uni_ids = {u["id"] for u in universities}
new_ids = {u["id"] for u in unis.UNIS}
universities = [u for u in universities if u["id"] not in new_ids]
RM = {"source": "Рейтинг у работодателей — оценка по открытым мониторингам; место в RAEX не указано, если мы его не проверили",
      "updatedAt": "2026-10", "confidence": "estimate"}
PM = {"source": "Сайты вузов, приказы о стоимости обучения 2025/26 — оценка; точную цену смотри на сайте вуза", "updatedAt": "2026-10", "confidence": "estimate"}
for x in unis.UNIS:
    site = f"https://{x['domain']}/" if x["domain"] else "https://yandex.ru/search/?" + urllib.parse.urlencode({"text": f"{x['name']} официальный сайт"})
    ensure_city(x["region"], x["city"])
    universities.append(dict(
        id=x["id"], name=x["name"], short=x["short"], type=x["type"], city=x["city"], regionId=x["region"], abroad=False,
        site=site, admissionUrl=site, eventsUrl=site, dorm=x["dorm"], vuc=x["vuc"], budget=x["budget"], features=x["features"],
        ratings=dict(raex=None, employers=x["emp"], meta=RM),
        priceFrom=x["pf"] * 1000 or None, priceTo=x["pt"] * 1000 or None, priceMeta=PM,
        description=x["desc"], howToGet=x["how"], aliases=[a.strip() for a in x["aliases"]],
    ))
# abroad — в конце
universities.sort(key=lambda u: u["abroad"])
uni_by_id = {u["id"]: u for u in universities}

# ───────── Программы ─────────
programs = [p for p in load("programs.json") if p["universityId"] not in new_ids and not p.get("generated")]
NO_SCORE = {"source": "Проходной балл ещё не найден в официальных источниках — смотри сайт вуза", "updatedAt": "2026-10", "confidence": "estimate"}
PROG_META = {"source": "Направление есть в перечне программ вуза (по открытым данным); набор на этот год проверь на сайте вуза",
             "updatedAt": "2026-10", "confidence": "estimate"}
# Дополнительные программы для вузов, которые уже были в каталоге
EXTRA = {
    "msu": "01.05.01 03.03.02 04.05.01 06.05.02 46.03.01 47.03.01 05.03.02",
    "mipt": "03.03.01",
    "kfu": "38.03.04 40.03.01 45.03.02 46.03.01 03.03.02 04.03.01 05.03.01 43.03.02 39.03.01",
    "ranepa": "38.03.04 41.03.04",
    "hse": "38.03.04 41.03.04 39.03.01",
    "spbu": "38.03.04 46.03.01 58.03.01",
    "urfu": "38.03.04 22.03.02",
    "kubsau": "36.03.02 36.03.01 35.03.04 35.03.07 19.03.03",
    "kai": "24.05.06 25.03.01",
    "kubsu": "38.03.04 43.03.02",
    "sfedu": "38.03.04",
    "uust": "38.03.04",
    "nsk_avt_college": "25.02.08",
}
def new_program(u, code, dvi_map=None, extra=False):
    s = spec_by_code[code]
    forms = ["full"]
    if "evening" in u["features"]:
        forms += ["evening", "distance"]
    pr = dict(
        id=f"{u['id']}__{code}", universityId=u["id"], specialtyCode=code, name=s["name"],
        passScore=dict(min=None, max=None, year=2025, includesDvi=False, meta=NO_SCORE, official=[]),
        budgetPlaces=None if u["budget"] else 0, targetPlaces=None, price=u["priceFrom"],
        forms=forms, keySubjects=s["disciplines"][:4],
        schedule="dense" if s["group"][:2] in ("31", "24", "03", "14") else "morning",
        partners=[], dual="dual" in u["features"], meta=PROG_META, generated=True,
    )
    if dvi_map and code in dvi_map:
        pr["dvi"] = dvi_map[code]
    return pr
ids = {p["id"] for p in programs}
for uid, codes in EXTRA.items():
    for code in codes.split():
        pid = f"{uid}__{code}"
        if pid not in ids:
            programs.append(new_program(uni_by_id[uid], code)); ids.add(pid)
for x in unis.UNIS:
    u = uni_by_id[x["id"]]
    for code in x["progs"]:
        assert code in spec_by_code, (x["id"], code)
        assert (spec_by_code[code]["level"] == "spo") == (u["type"] == "college"), (x["id"], code)
        programs.append(new_program(u, code, x["dvi"])); ids.add(f"{x['id']}__{code}")
for p in programs:
    p.setdefault("generated", False)

# ───────── Мероприятия (без выдуманных дат: тип + когда обычно + ссылка) ─────────
events = [e for e in load("events.json") if e["universityId"] not in new_ids]
for x in unis.UNIS:
    u = uni_by_id[x["id"]]
    uid = u["id"]
    base = dict(universityId=uid, date=None, time=None, source="seed")
    if u["type"] == "college":
        events.append(dict(base, id=f"{uid}__open", title="День открытых дверей колледжа", type="open_day", format="offline",
                           when="Обычно весной (март–май); точная дата — на сайте колледжа", url=u["admissionUrl"],
                           why="Посмотришь мастерские и спросишь, с какого курса начинается оплачиваемая практика."))
        continue
    events.append(dict(base, id=f"{uid}__open", title=f"День открытых дверей {u['short']}", type="open_day", format="mixed",
                       when="Обычно осенью (октябрь–ноябрь) и весной (март–апрель); часто есть онлайн-трансляция", url=u["admissionUrl"],
                       why="Узнаешь про бюджетные места и экзамены из первых уст и задашь вопросы преподавателям."))
    codes = set(x["progs"])
    if any(spec_by_code[c]["dvi"] in ("stage", "art", "contest") for c in codes):
        events.append(dict(base, id=f"{uid}__consult", title="Консультации и подготовительные курсы к творческим экзаменам", type="masterclass",
                           format="offline", when="Обычно с осени до весны; запись на сайте вуза", url=u["site"],
                           why="Педагоги посмотрят твою программу или работы и скажут, что подтянуть до лета."))
    elif "target" in u["features"] or "internships" in u["features"]:
        events.append(dict(base, id=f"{uid}__excursion", title="Экскурсия к работодателю-партнёру вуза", type="excursion", format="offline",
                           when="По записи через приёмную комиссию", url=u["site"],
                           why="Увидишь, где работают выпускники, и спросишь про целевое обучение."))

# Проходные баллы из официальных источников (data/pass_scores.json): 2026, иначе 2025
if os.path.exists(D("pass_scores.json")):
    ps = load("pass_scores.json")
    prog_by_id = {p["id"]: p for p in programs}
    for p in programs:
        p["passScore"]["official"] = []
    for x in ps["scores"]:
        assert x["programId"] in prog_by_id, x["programId"]
        prog_by_id[x["programId"]]["passScore"]["official"].append(dict(
            year=x["year"], basis=x["basis"], total=x["total"], includesDvi=x["includesDvi"], url=x["url"], source=x["source"], checkedAt=ps["meta"]["checkedAt"]))

# Подтверждённые мероприятия с датами (data/events_verified.json)
if os.path.exists(D("events_verified.json")):
    ver = load("events_verified.json")
    have_ev = {e["id"] for e in events}
    for e in ver["events"]:
        assert e["universityId"] in uni_by_id, e["id"]
        if e["id"] not in have_ev:
            y, mth, d = e["date"].split("-")
            MON = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"]
            when = f"{int(d)} {MON[int(mth) - 1]} {y}" + (f", {e['time']}" if e["time"] else "")
            events.append(dict(e, when=when, source="verified", sourceUrl=e["url"], checkedAt=ver["meta"]["checkedAt"]))

# ───────── Запись ─────────
os.makedirs(D("specialties"), exist_ok=True)
for f in glob.glob(D("specialties", "*.json")):
    os.remove(f)
by_group = defaultdict(list)
for s in specialties:
    by_group[s["group"][:2]].append(s)
for g, arr in sorted(by_group.items()):
    dump(arr, D("specialties", f"{g}.json"))
if os.path.exists(D("specialties.json")):
    os.remove(D("specialties.json"))
dump(professions, D("professions.json"))
dump(regions, D("regions.json"))
dump(universities, D("universities.json"))
dump(programs, D("programs.json"))
dump(events, D("events.json"))

# Индекс для статического импорта (lib/data/raw-static.ts)
lines = ["// Сгенерировано scripts/gen-catalog.py — не править руками.", "import type { RawData } from \"./validate\";"]
names = []
for g in sorted(by_group):
    lines.append(f'import g{g} from "@/data/specialties/{g}.json";')
    names.append(f"g{g}")
lines.append("")
lines.append(f"export const specialtiesStatic: RawData[\"specialties\"] = [{', '.join('...' + n for n in names)}];")
open(os.path.join(ROOT, "lib", "data", "specialties-index.ts"), "w", encoding="utf8").write("\n".join(lines) + "\n")

# ───────── Сводка ─────────
ru = [u for u in universities if not u["abroad"]]
fo = defaultdict(int)
for u in ru:
    fo[reg_by_id[u["regionId"]]["federalDistrict"]] += 1
print(f"направлений {len(specialties)} в {len(by_group)} группах; профессий {len(professions)}; задач {sum(len(p['tasks']) for p in professions)}")
print(f"вузов и колледжей в России {len(ru)} в {len({u['regionId'] for u in ru})} регионах; по округам {dict(fo)}")
print(f"программ {len(programs)}; мероприятий {len(events)}")
covered = {p["specialtyCode"] for p in programs}
miss = [s["code"] for s in specialties if s["code"] not in covered]
assert not miss, f"направления без программ: {miss}"
