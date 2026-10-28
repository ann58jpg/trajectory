# Генератор data/task_cards.json для игры «Что бы ты делал(а) завтра на работе?» (пункт 5 правок v2).
# Карточка — конкретная задача профессии. По 2–3 карточки на каждую из 56 групп направлений, у каждой — сфера.
# Запуск из корня: python3 scripts/gen-task-cards.py (после gen-catalog.py)
import json, glob, os
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda *p: os.path.join(ROOT, "data", *p)
specs = [s for f in sorted(glob.glob(D("specialties", "*.json"))) for s in json.load(open(f, encoding="utf8"))]
profs = {p["id"]: p for p in json.load(open(D("professions.json"), encoding="utf8"))}

# Сферы для первых раундов: каждая группа направлений относится к одной сфере
SPHERES = {
    "it": ("ИТ и данные", "01 02 09 10"),
    "eng": ("Техника и производство", "08 11 12 13 14 15 16 17 18 20 22 27 28 29"),
    "nature": ("Природа, земля и животные", "05 06 19 21 35 36"),
    "science": ("Наука", "03 04"),
    "med": ("Медицина", "30 31 32 33 34"),
    "people": ("Люди: учить, помогать, тренировать", "37 39 44 49"),
    "biz": ("Бизнес и сервис", "38 43"),
    "law": ("Право и государство", "40 41"),
    "words": ("Тексты, языки, история", "42 45 46 47 48 58"),
    "art": ("Искусство и сцена", "07 50 51 52 53 54 55"),
    "transport": ("Транспорт и небо", "23 24 25 26"),
}
SPHERE_OF = {g: k for k, (_, gs) in SPHERES.items() for g in gs.split()}

by_group = defaultdict(list)
for s in specs:
    g = s["code"][:2]
    for pid in s["professions"]:
        if pid not in by_group[g]:
            by_group[g].append(pid)

cards, used_text, used_prof = [], set(), defaultdict(int)
for g in sorted(by_group):
    assert g in SPHERE_OF, g
    # сначала профессии, которые ещё не встречались в карточках
    cand = sorted(by_group[g], key=lambda pid: (used_prof[pid], by_group[g].index(pid)))
    n = 0
    for pid in cand:
        p = profs[pid]
        task = next((t for t in p["tasks"] if t not in used_text), None)
        if not task:
            continue
        used_text.add(task); used_prof[pid] += 1
        cards.append(dict(id=f"c{len(cards) + 1:03d}", text=task, professionId=pid, professionName=p["name"], group=g,
                          sphere=SPHERE_OF[g], tags=p["tags"][:3], klimov=p["klimov"]))
        n += 1
        if n == 3:
            break

out = dict(
    meta=dict(source="Задачи профессий из data/professions.json (составлены нами по описаниям профессий и вакансий hh.ru)", updatedAt="2026-10", confidence="estimate"),
    spheres=[dict(id=k, name=v[0], groups=v[1].split()) for k, v in SPHERES.items()],
    cards=cards,
)
with open(D("task_cards.json"), "w", encoding="utf8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1); f.write("\n")
print(f"карточек {len(cards)}, групп {len({c['group'] for c in cards})}, профессий {len({c['professionId'] for c in cards})}")
