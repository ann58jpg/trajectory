# Общие помощники для исходников данных.
SPECS = []

def S(code, name, desc, disc, profs, years=None, ege=None, dvi="group", level=None, group=None, tags=None):
    mid = code[3:5]
    lvl = level or {"03": "bachelor", "05": "specialist", "02": "spo"}[mid]
    SPECS.append(dict(code=code, name=name, desc=desc, disc=[x.strip() for x in disc.split(";")], profs=profs,
                      years=years or (4 if lvl == "bachelor" else 5 if lvl == "specialist" else 2.83),
                      ege=ege, dvi=dvi, level=lvl, group=group or code[:2], tags=tags))
