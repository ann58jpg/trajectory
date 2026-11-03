# Проходные баллы НИУ ВШЭ (Москва) 2026 на бюджет по официальному PDF «Сведения о лицах, зачисленных на основные
# конкурсные места по результатам вступительных испытаний» (приказы 6.18-04/070826-1, -2 от 07.08.2026).
# Проходной балл направления = минимальная «сумма конкурсных баллов» зачисленного (с индивидуальными достижениями).
# Запуск: python3 -I scripts/official/hse_2026.py <путь к PDF> > data/import/official-hse-2026.json
import json, re, subprocess, sys
from collections import defaultdict

URL = "https://ba.hse.ru/mirror/pubs/share/1187438678"
tsv = subprocess.run(["pdftotext", "-tsv", sys.argv[1], "-"], capture_output=True, text=True, check=True).stdout
pages = defaultdict(list)
for line in tsv.splitlines()[1:]:
    f = line.split("\t")
    if f[0] == "5":
        pages[int(f[1])].append((float(f[6]), float(f[7]), f[11]))

rows = []
cols = None
for pno, words in sorted(pages.items()):
    # заголовок таблицы есть не на каждой странице — колонки берём с последнего найденного
    head = {w: (x, y) for x, y, w in words if w in ("Направление", "Образовательная")}
    if "Направление" in head:
        cols = (head["Направление"][0], head["Образовательная"][0], min(x for x, y, w in words if w == "Сумма"))
        y_head = head["Направление"][1]
    else:
        y_head = 0
    if not cols:
        continue
    x_dir, x_prog, x_score = cols
    anchors = sorted((y, w) for x, y, w in words if x < x_dir - 5 and re.fullmatch(r"\d{5,8}", w) and y > y_head)
    for i, (y0, code) in enumerate(anchors):
        y1 = anchors[i + 1][0] if i + 1 < len(anchors) else 1e9
        cell = [(x, y, w) for x, y, w in words if y0 - 2 <= y < y1 - 2]
        direction = " ".join(w for x, y, w in sorted(cell, key=lambda z: (z[1], z[0])) if x_dir - 3 <= x < x_prog - 3)
        program = " ".join(w for x, y, w in sorted(cell, key=lambda z: (z[1], z[0])) if x_prog - 3 <= x < x_score - 3)
        nums = [int(w) for x, y, w in sorted(cell, key=lambda z: z[0]) if x >= x_score - 3 and abs(y - y0) < 3 and re.fullmatch(r"\d{1,3}", w)]
        if len(nums) >= 3:
            rows.append(dict(dir=direction, prog=program, ege=nums[0], total=nums[-1]))

by_dir = {}
for r in rows:
    b = by_dir.setdefault(r["dir"], dict(direction=r["dir"], min=r["total"], minEge=r["ege"], enrolled=0, programs=set()))
    b["min"] = min(b["min"], r["total"])
    b["minEge"] = min(b["minEge"], r["ege"])
    b["enrolled"] += 1
    b["programs"].add(r["prog"])
out = [dict(v, programs=sorted(v["programs"])) for v in by_dir.values()]
json.dump(dict(source=URL, document="Сведения о лицах, зачисленных на основные конкурсные места по результатам вступительных испытаний, НИУ ВШЭ (г. Москва), приказы от 07.08.2026",
               year=2026, basis="budget", rows=len(rows), items=sorted(out, key=lambda x: x["direction"])), sys.stdout, ensure_ascii=False, indent=1)
