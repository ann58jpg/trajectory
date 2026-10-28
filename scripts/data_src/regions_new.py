# Новые регионы (оценка: коэффициент зарплаты к медиане РФ 73 871 ₽ (Росстат, апрель 2025), аренда и бюджет студента — оценки).
# Поля: id, название, столица, ФО, [(город, коэф. к региону, хаб)], коэф. региона, аренда, бюджет студента, доля вакансий hh, отрасли, работодатели, соседи
R = []
def r(id, name, capital, fo, cities, coef, rent, budget, share, ind, emp, nb):
    R.append(dict(id=id, name=name, capital=capital, federalDistrict=fo,
                  cities=[dict(name=c[0], salaryCoef=c[1], hub=c[2]) for c in cities], salaryCoef=coef,
                  medianSalary=round(73871 * coef / 100) * 100, rent=rent, studentBudget=budget, vacancyShare=share,
                  industries=ind.split(), employers=emp, neighbors=nb.split(), hhAreaId=None,
                  meta=dict(source="Росстат: медиана РФ 73 871 ₽ (апрель 2025) × коэффициент региона (оценка); аренда — оценка", updatedAt="2025-09", confidence="estimate")))

# ЦФО
r("yaroslavl", "Ярославская область", "Ярославль", "ЦФО", [("Ярославль", 1.05, True), ("Рыбинск", 0.9, False)], 0.85, 20000, 23000, 0.009, "machine chemistry energy culture", ["ОДК-Сатурн (Рыбинск)", "Ярославский моторный завод", "Славнефть-ЯНОС", "Ярославский шинный завод"], "moscow_obl vladimir ivanovo kostroma tver vologda")
r("vladimir", "Владимирская область", "Владимир", "ЦФО", [("Владимир", 1.05, True), ("Ковров", 0.95, False)], 0.78, 18000, 22000, 0.007, "machine manufacturing chemistry", ["Ковровский электромеханический завод", "Завод им. Дегтярёва", "Владимирский моторо-тракторный завод"], "moscow_obl yaroslavl ivanovo nn ryazan")
r("tver", "Тверская область", "Тверь", "ЦФО", [("Тверь", 1.05, True)], 0.82, 18000, 22000, 0.007, "machine energy logistics", ["Тверской вагоностроительный завод", "Калининская АЭС"], "moscow_obl yaroslavl smolensk novgorod pskov")
r("kaluga", "Калужская область", "Калуга", "ЦФО", [("Калуга", 1.05, True), ("Обнинск", 1.1, False)], 0.9, 20000, 23000, 0.007, "auto manufacturing nuclear pharma science", ["Обнинский физико-энергетический институт", "Калужский турбинный завод", "фармкластер Калуги"], "moscow_obl tula bryansk smolensk orel")
r("tula", "Тульская область", "Тула", "ЦФО", [("Тула", 1.05, True), ("Новомосковск", 0.95, False)], 0.85, 18000, 22000, 0.009, "machine chemistry metallurgy", ["КБП им. Шипунова", "Тульский оружейный завод", "Новомосковский Азот"], "moscow_obl kaluga ryazan orel lipetsk")
r("ryazan", "Рязанская область", "Рязань", "ЦФО", [("Рязань", 1.05, True)], 0.78, 17000, 21000, 0.006, "oil_gas electronics machine", ["Рязанская НПК", "Рязанский радиозавод"], "moscow_obl vladimir tula lipetsk tambov")
r("belgorod", "Белгородская область", "Белгород", "ЦФО", [("Белгород", 1.05, True), ("Старый Оскол", 1.05, False)], 0.82, 18000, 21000, 0.008, "agro metallurgy mining food", ["Металлоинвест", "Агрохолдинги региона", "Лебединский ГОК"], "voronezh kursk")
r("kursk", "Курская область", "Курск", "ЦФО", [("Курск", 1.05, True), ("Курчатов", 1.1, False)], 0.78, 16000, 20000, 0.005, "agro nuclear food", ["Курская АЭС", "Михайловский ГОК"], "belgorod orel bryansk voronezh lipetsk")
r("lipetsk", "Липецкая область", "Липецк", "ЦФО", [("Липецк", 1.05, True)], 0.8, 16000, 20000, 0.006, "metallurgy agro machine", ["НЛМК", "ОЭЗ «Липецк»"], "voronezh tula ryazan tambov kursk orel")
r("tambov", "Тамбовская область", "Тамбов", "ЦФО", [("Тамбов", 1.05, True)], 0.7, 14000, 18000, 0.004, "agro food machine", ["Тамбовский пороховой завод", "Агрохолдинги"], "voronezh lipetsk ryazan penza saratov")
r("smolensk", "Смоленская область", "Смоленск", "ЦФО", [("Смоленск", 1.05, True)], 0.75, 15000, 19000, 0.005, "manufacturing aviation energy", ["Смоленский авиационный завод", "Смоленская АЭС"], "moscow_obl tver kaluga bryansk pskov")
r("bryansk", "Брянская область", "Брянск", "ЦФО", [("Брянск", 1.05, True)], 0.72, 14000, 18000, 0.005, "machine transport", ["Брянский машиностроительный завод", "Брянский автомобильный завод"], "kaluga smolensk orel kursk")
r("ivanovo", "Ивановская область", "Иваново", "ЦФО", [("Иваново", 1.05, True)], 0.7, 14000, 18000, 0.005, "fashion manufacturing energy", ["Текстильные фабрики", "Ивановская ТЭЦ"], "yaroslavl vladimir kostroma nn")
r("kostroma", "Костромская область", "Кострома", "ЦФО", [("Кострома", 1.05, True)], 0.72, 13000, 17000, 0.003, "manufacturing energy", ["Костромская ГРЭС", "Ювелирные заводы Красного-на-Волге"], "yaroslavl ivanovo vologda nn kirov")
r("orel", "Орловская область", "Орёл", "ЦФО", [("Орёл", 1.05, True)], 0.7, 14000, 18000, 0.004, "agro machine food", ["Агрохолдинги", "Орловский сталепрокатный завод"], "tula kaluga bryansk kursk lipetsk")
# СЗФО
r("arkhangelsk", "Архангельская область", "Архангельск", "СЗФО", [("Архангельск", 1.0, True), ("Северодвинск", 1.15, False)], 1.05, 20000, 25000, 0.007, "shipbuilding wood sea", ["Севмаш", "Звёздочка", "Целлюлозно-бумажные комбинаты"], "karelia vologda komi")
r("murmansk", "Мурманская область", "Мурманск", "СЗФО", [("Мурманск", 1.0, True), ("Апатиты", 0.95, False)], 1.35, 22000, 28000, 0.006, "sea mining fishery shipbuilding", ["Мурманский морской порт", "ФосАгро-Апатит", "Росатомфлот"], "karelia")
r("karelia", "Республика Карелия", "Петрозаводск", "СЗФО", [("Петрозаводск", 1.0, True)], 0.95, 16000, 21000, 0.004, "wood tourism mining", ["Карельский окатыш", "Лесопромышленные компании"], "murmansk arkhangelsk vologda len_obl")
r("vologda", "Вологодская область", "Вологда", "СЗФО", [("Вологда", 0.95, True), ("Череповец", 1.1, False)], 0.85, 16000, 20000, 0.006, "metallurgy chemistry agro wood", ["Северсталь", "ФосАгро", "Молочные заводы"], "yaroslavl kostroma arkhangelsk karelia len_obl")
r("pskov", "Псковская область", "Псков", "СЗФО", [("Псков", 1.05, True), ("Великие Луки", 0.9, False)], 0.72, 14000, 18000, 0.003, "manufacturing tourism agro", ["Псковский электромашиностроительный завод"], "len_obl novgorod tver smolensk")
r("novgorod", "Новгородская область", "Великий Новгород", "СЗФО", [("Великий Новгород", 1.05, True)], 0.8, 15000, 19000, 0.003, "chemistry manufacturing tourism", ["Акрон", "Новгородские заводы электроники"], "len_obl pskov tver vologda")
r("komi", "Республика Коми", "Сыктывкар", "СЗФО", [("Сыктывкар", 0.95, True), ("Ухта", 1.15, False)], 1.05, 17000, 22000, 0.004, "oil_gas wood mining", ["Лукойл-Коми", "Монди СЛПК", "Воркутауголь"], "arkhangelsk kirov perm yanao")
# ЮФО
r("volgograd", "Волгоградская область", "Волгоград", "ЮФО", [("Волгоград", 1.05, True), ("Волжский", 0.95, False)], 0.75, 16000, 20000, 0.012, "oil_gas chemistry metallurgy agro", ["Лукойл-Волгограднефтепереработка", "Красный Октябрь", "Волжский трубный завод"], "rostov saratov astrakhan kalmykia")
r("astrakhan", "Астраханская область", "Астрахань", "ЮФО", [("Астрахань", 1.05, True)], 0.78, 16000, 20000, 0.005, "oil_gas sea fishery shipbuilding", ["Газпром добыча Астрахань", "Астраханский морской порт", "Судостроительные заводы"], "volgograd kalmykia")
r("adygea", "Республика Адыгея", "Майкоп", "ЮФО", [("Майкоп", 1.0, True)], 0.7, 14000, 18000, 0.002, "agro tourism food", ["Агрохолдинги", "Турбазы Лаго-Наки"], "krasnodar")
r("crimea", "Республика Крым", "Симферополь", "ЮФО", [("Симферополь", 1.05, True), ("Ялта", 1.05, False), ("Керчь", 0.9, False)], 0.7, 20000, 22000, 0.008, "tourism agro shipbuilding", ["Курорты Южного берега", "Залив (Керчь)", "Винодельни"], "sevastopol krasnodar")
r("sevastopol", "Севастополь", "Севастополь", "ЮФО", [("Севастополь", 1.0, True)], 0.8, 25000, 25000, 0.003, "sea shipbuilding tourism", ["Севастопольский морской завод", "Порт Севастополь"], "crimea")
r("kalmykia", "Республика Калмыкия", "Элиста", "ЮФО", [("Элиста", 1.05, True)], 0.6, 12000, 16000, 0.001, "agro", ["Агрохолдинги"], "volgograd astrakhan stavropol dagestan rostov")
# СКФО
r("chechnya", "Чеченская Республика", "Грозный", "СКФО", [("Грозный", 1.05, True)], 0.65, 18000, 20000, 0.003, "construction agro oil_gas", ["Грознефтегаз", "Строительные компании"], "dagestan north_ossetia stavropol")
r("kbr", "Кабардино-Балкарская Республика", "Нальчик", "СКФО", [("Нальчик", 1.05, True)], 0.62, 14000, 18000, 0.002, "agro tourism", ["Курорты Приэльбрусья", "Агрохолдинги"], "stavropol north_ossetia")
r("north_ossetia", "Республика Северная Осетия — Алания", "Владикавказ", "СКФО", [("Владикавказ", 1.05, True)], 0.65, 15000, 18000, 0.002, "metallurgy agro tourism", ["Электроцинк", "Курорты"], "kbr chechnya stavropol")
# ПФО
r("udmurtia", "Удмуртская Республика", "Ижевск", "ПФО", [("Ижевск", 1.05, True), ("Воткинск", 0.95, False)], 0.8, 17000, 21000, 0.008, "machine oil_gas metallurgy", ["Концерн «Калашников»", "Воткинский завод", "Ижсталь"], "tatarstan perm bashkortostan kirov")
r("ulyanovsk", "Ульяновская область", "Ульяновск", "ПФО", [("Ульяновск", 1.05, True), ("Димитровград", 0.95, False)], 0.75, 16000, 20000, 0.006, "aviation auto nuclear", ["Авиастар-СП", "УАЗ", "НИИАР (Димитровград)"], "tatarstan samara penza mordovia chuvashia")
r("penza", "Пензенская область", "Пенза", "ПФО", [("Пенза", 1.05, True)], 0.72, 15000, 19000, 0.005, "electronics machine agro", ["Радиозавод", "Пензенские приборостроительные заводы"], "ulyanovsk saratov mordovia tambov ryazan")
r("saratov", "Саратовская область", "Саратов", "ПФО", [("Саратов", 1.05, True), ("Энгельс", 0.95, False)], 0.75, 16000, 20000, 0.009, "agro energy machine electronics", ["Балаковская АЭС", "Саратовский НПЗ", "Тантал"], "samara volgograd penza tambov orenburg")
r("orenburg", "Оренбургская область", "Оренбург", "ПФО", [("Оренбург", 1.05, True), ("Орск", 0.9, False)], 0.8, 16000, 20000, 0.006, "oil_gas metallurgy agro", ["Газпром добыча Оренбург", "Уральская сталь", "Оренбургнефть"], "samara bashkortostan chelyabinsk saratov")
r("kirov", "Кировская область", "Киров", "ПФО", [("Киров", 1.05, True)], 0.72, 15000, 19000, 0.005, "chemistry manufacturing wood", ["Кирово-Чепецкий химкомбинат", "Шинный завод"], "udmurtia perm komi kostroma mari_el nn tatarstan")
r("chuvashia", "Чувашская Республика", "Чебоксары", "ПФО", [("Чебоксары", 1.05, True)], 0.7, 15000, 19000, 0.005, "electronics machine chemistry", ["ЭЛАРА", "ЧЭАЗ", "Химпром"], "tatarstan ulyanovsk mordovia mari_el nn")
r("mordovia", "Республика Мордовия", "Саранск", "ПФО", [("Саранск", 1.05, True)], 0.7, 14000, 18000, 0.004, "electronics manufacturing agro", ["Оптиковолоконные заводы", "Лисма"], "penza ulyanovsk chuvashia nn ryazan")
r("mari_el", "Республика Марий Эл", "Йошкар-Ола", "ПФО", [("Йошкар-Ола", 1.05, True)], 0.68, 14000, 18000, 0.003, "electronics agro manufacturing", ["Марийский машиностроительный завод"], "tatarstan chuvashia nn kirov")
# УФО
r("kurgan", "Курганская область", "Курган", "УрФО", [("Курган", 1.05, True)], 0.7, 14000, 18000, 0.004, "machine agro", ["Курганмашзавод", "Курганский автобусный завод"], "chelyabinsk tyumen sverdlovsk")
r("yanao", "Ямало-Ненецкий автономный округ", "Салехард", "УрФО", [("Салехард", 1.0, True), ("Новый Уренгой", 1.1, False), ("Ноябрьск", 1.0, False)], 2.0, 30000, 35000, 0.005, "oil_gas energy", ["Газпром добыча Уренгой", "Новатэк", "Газпром нефть"], "tyumen komi krasnoyarsk")
# СФО
r("omsk", "Омская область", "Омск", "СФО", [("Омск", 1.05, True)], 0.82, 17000, 21000, 0.01, "oil_gas machine aviation agro", ["Газпромнефть-ОНПЗ", "Омсктрансмаш", "ПО «Полёт»"], "novosibirsk tyumen")
r("kemerovo", "Кемеровская область — Кузбасс", "Кемерово", "СФО", [("Кемерово", 1.0, True), ("Новокузнецк", 1.0, False)], 0.95, 16000, 21000, 0.009, "mining metallurgy energy chemistry", ["СУЭК-Кузбасс", "ЕВРАЗ ЗСМК", "Кузбассразрезуголь"], "novosibirsk tomsk krasnoyarsk altai_krai khakassia")
r("altai_krai", "Алтайский край", "Барнаул", "СФО", [("Барнаул", 1.05, True), ("Бийск", 0.9, False)], 0.7, 15000, 19000, 0.008, "agro machine chemistry tourism", ["Алтайвагон", "Бийский олеумный завод", "Агрохолдинги"], "novosibirsk kemerovo")
r("buryatia", "Республика Бурятия", "Улан-Удэ", "СФО", [("Улан-Удэ", 1.05, True)], 0.85, 16000, 20000, 0.004, "aviation tourism mining", ["Улан-Удэнский авиационный завод", "Туризм на Байкале"], "irkutsk zabaykalsky")
r("khakassia", "Республика Хакасия", "Абакан", "СФО", [("Абакан", 1.05, True), ("Саяногорск", 1.0, False)], 0.85, 15000, 19000, 0.003, "energy metallurgy mining", ["Саяно-Шушенская ГЭС", "РУСАЛ Саяногорск"], "krasnoyarsk kemerovo")
# ДФО
r("khabarovsk", "Хабаровский край", "Хабаровск", "ДФО", [("Хабаровск", 1.0, True), ("Комсомольск-на-Амуре", 1.0, False)], 1.15, 25000, 27000, 0.008, "aviation shipbuilding logistics oil_gas", ["КнААЗ им. Гагарина", "Амурский судостроительный завод", "Хабаровский НПЗ"], "primorye amur sakhalin yakutia")
r("yakutia", "Республика Саха (Якутия)", "Якутск", "ДФО", [("Якутск", 1.0, True), ("Мирный", 1.3, False), ("Нерюнгри", 1.1, False)], 1.45, 25000, 32000, 0.005, "mining oil_gas energy", ["АЛРОСА", "Сургутнефтегаз (Талакан)", "Якутскэнерго"], "khabarovsk amur zabaykalsky irkutsk krasnoyarsk")
r("amur", "Амурская область", "Благовещенск", "ДФО", [("Благовещенск", 1.0, True), ("Свободный", 1.1, False)], 1.1, 20000, 23000, 0.004, "oil_gas space agro mining", ["Амурский ГПЗ", "Космодром Восточный", "Агрохолдинги"], "khabarovsk yakutia zabaykalsky")
r("kamchatka", "Камчатский край", "Петропавловск-Камчатский", "ДФО", [("Петропавловск-Камчатский", 1.0, True)], 1.6, 28000, 33000, 0.002, "fishery sea tourism", ["Рыбодобывающие компании", "Порт Петропавловск"], "sakhalin")
r("zabaykalsky", "Забайкальский край", "Чита", "ДФО", [("Чита", 1.0, True)], 1.0, 18000, 22000, 0.004, "mining energy transport", ["Норникель (Быстринский ГОК)", "ЗабЖД"], "buryatia amur yakutia irkutsk")
