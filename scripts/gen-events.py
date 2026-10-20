# Фолбэк-мероприятия без выдуманных дат: тип + периодичность + ссылка на официальную страницу.
import json
U=json.load(open('data/universities.json'))
E=[]
for u in U:
    uid=u['id']
    if u['type']=='college':
        E.append(dict(id=f"{uid}__open",universityId=uid,title="День открытых дверей колледжа",type="open_day",format="offline",date=None,when="Обычно весной (март–май); точная дата — на сайте колледжа",url=u['admissionUrl'],why="Посмотришь мастерские и оборудование, узнаешь, с какого курса начинается оплачиваемая практика.",source="seed"))
        E.append(dict(id=f"{uid}__excursion",universityId=uid,title="Экскурсия на предприятие-партнёр",type="excursion",format="offline",date=None,when="По записи через приёмную комиссию",url=u['site'],why="Увидишь своё будущее рабочее место и спросишь мастеров, сколько реально платят после выпуска.",source="seed"))
        continue
    if u['abroad']:
        E.append(dict(id=f"{uid}__info",universityId=uid,title="Онлайн-сессии для иностранных абитуриентов",type="lecture",format="online",date=None,when="Регулярно в течение года; расписание — на сайте",url=u['admissionUrl'],why="Узнаешь требования к языку и документам, сроки подачи и реальную стоимость жизни.",source="seed"))
        E.append(dict(id=f"{uid}__events",universityId=uid,title="Публичные лекции и события кампуса",type="lecture",format="mixed",date=None,when="Календарь событий университета",url=u['eventsUrl'],why="Почувствуешь атмосферу и уровень преподавания, даже не выезжая.",source="seed"))
        continue
    E.append(dict(id=f"{uid}__open",universityId=uid,title=f"День открытых дверей {u['short']}",type="open_day",format="mixed",date=None,when="Обычно осенью (октябрь–ноябрь) и весной (март–апрель); часто есть онлайн-трансляция",url=u['admissionUrl'],why="Услышишь про бюджетные места и проходные из первых уст и сможешь задать вопросы деканам.",source="seed"))
    if 'olymp' in u['features']:
        E.append(dict(id=f"{uid}__olymp",universityId=uid,title="Олимпиады для школьников от вуза",type="olympiad",format="mixed",date=None,when="Отборочные этапы — обычно октябрь–январь; проверь перечень РСОШ",url=u['site'],why="Призёрство может дать 100 баллов или поступление без экзаменов (БВИ).",source="seed"))
    if 'studlife' in u['features'] or 'intl' in u['features']:
        E.append(dict(id=f"{uid}__club",universityId=uid,title="Студенческие клубы, фестивали и открытые лекции",type="club",format="offline",date=None,when="В течение учебного года; анонсы в новостях и соцсетях вуза",url=u['eventsUrl'],why="Лучший способ понять «вайб»: какие люди тут учатся и чем живут вне пар.",source="seed"))
    elif 'internships' in u['features'] or 'target' in u['features']:
        E.append(dict(id=f"{uid}__school",universityId=uid,title="Школа абитуриента / профильные классы и интенсивы",type="school",format="mixed",date=None,when="Набор обычно в сентябре–октябре и на каникулах",url=u['eventsUrl'],why="Попробуешь учиться на реальных задачах и познакомишься с преподавателями.",source="seed"))
json.dump(E,open('data/events.json','w'),ensure_ascii=False,indent=1)
print(len(E))
