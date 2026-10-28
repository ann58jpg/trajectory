# DSL для профессий. Зарплаты — тысячи ₽ в месяц для среднего региона РФ (оценка по вилкам hh.ru 2025).
PROFS = {}
OVERRIDES = {}

SRC = {
    "hh": "hh.ru: динамика вакансий 2024–2025 (оценка)",
    "pr": "Указ № 309 от 07.05.2024, нацпроекты технологического лидерства",
    "ai": "Оценки влияния генеративного ИИ на профессии (МОТ 2023/2025, ВШЭ ИСИЭЗ) — оценка",
    "kadry": "Нацпроект «Кадры», прогноз кадровой потребности Минтруда (оценка)",
    "mix": "hh.ru (оценка) и госпрограммы отрасли",
}
STATUS = {"g": "green", "y": "yellow", "r": "red"}

# Форматы работы (вопрос «Как ты хочешь работать?»)
WF = {"office", "remote", "hybrid", "site", "outdoor", "lab", "stage", "people", "trips", "travel", "shift", "relocate", "business", "stable", "flexible"}


def P(id, name, tags, kl, wf, sal, dem, early, remote, out, ai, prio, ind, tasks, skills, stack="", src="hh", hh=None, day=None):
    assert id not in PROFS, id
    w = wf.split()
    bad = set(w) - WF
    assert not bad, (id, bad)
    assert 3 <= len(tasks) <= 5, id
    PROFS[id] = dict(
        id=id, name=name, tags=tags.split(), klimov=list(kl), workFormats=w, sal=sal, dem=dem, early=early, remote=remote,
        outlook=(STATUS[out[0]], out[1], SRC.get(src, src)), aiRisk=ai, priorities=prio.split(), industries=ind.split(),
        tasks=tasks, skills=[s.strip() for s in skills.split(",") if s.strip()], stack=[s.strip() for s in stack.split(",") if s.strip()],
        hhQuery=hh or name.split("/")[0].split("(")[0].strip().lower(), day=day,
    )


def O(id, wf, tasks, tags_add="", name=None):
    """Переопределение старой профессии: новые конкретные задачи и форматы работы."""
    w = wf.split()
    assert not (set(w) - WF), (id, set(w) - WF)
    assert 3 <= len(tasks) <= 5, id
    OVERRIDES[id] = dict(workFormats=w, tasks=tasks, tags_add=tags_add.split(), name=name)
