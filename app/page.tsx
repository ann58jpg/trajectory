import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardList, MapPin, Scale, Sparkles, TrendingUp, ShieldCheck, Database, CalendarHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCatalog } from "@/lib/db/catalog";

export default function Home() {
  const c = getCatalog();
  const cities = new Set(c.universities.map((u) => u.city)).size;
  const verified = c.programs.filter((p) => p.meta.confidence === "verified").length;
  return (
    <div className="space-y-16">
      <section className="hero-bg -mx-4 px-4 pb-10 pt-12 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4">Для школьников 9–11 классов по всей России</Badge>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Выбирай образование <span className="gradient-text">не по бренду, а по результатам</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Спрос, доход, трудоустройство и перспектива профессии через 5 лет — для твоего региона и тех городов, куда ты готов переехать.
            Два взгляда на один профиль: «Интересы» и «Деньги», и честная цена компромисса между ними.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/quiz" data-testid="start-quiz">
                Пройти тест (7 минут) <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#example">Пример отчёта</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Без регистрации и ФИО. Ответы хранятся только в твоём браузере.</p>
        </div>
      </section>

      <section aria-labelledby="how" className="space-y-6">
        <h2 id="how" className="text-2xl font-bold">Как это работает</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: ClipboardList, title: "1. Анкета", text: "Интересы, предметы ЕГЭ и почему они нравятся, регион, готовность к переезду, деньги и горизонт дохода." },
            { icon: BarChart3, title: "2. Расчёт на данных", text: "Движок сводит спрос, зарплаты, трудоустройство и госприоритеты для твоего региона. ИИ только объясняет — цифры из базы." },
            { icon: Scale, title: "3. Решение", text: "Двигай ползунок «Интерес ↔ Доход», смотри цену компромисса, собирай «Мой план» и иди на мероприятия вузов." },
          ].map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="h-7 w-7 text-primary" />
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="example" aria-labelledby="example-h" className="space-y-4">
        <h2 id="example-h" className="text-2xl font-bold">Пример отчёта</h2>
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-5">
            <p className="text-sm text-muted-foreground">Портрет</p>
            <p className="font-medium">Ты — практик-технарь из Сызрани, не готов к переезду, нужен доход уже с 1–2 курса, рассчитываешь на бюджет.</p>
          </div>
          <div className="grid gap-0 sm:grid-cols-2">
            <div className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Интересы</div>
              <div className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Инженер АСУ ТП / КИПиА</span>
                  <Badge variant="green">Растёт</Badge>
                  <Badge variant="secondary">можно начать со 2 курса</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Филиал СамГТУ в Сызрани · вечерняя форма · шанс на бюджет высокий</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Технолог / наладчик ЧПУ</span>
                  <Badge variant="green">Растёт</Badge>
                  <Badge variant="secondary">дуальное обучение</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Сызранский политехнический колледж · практика на «Тяжмаше»</p>
              </div>
            </div>
            <div className="space-y-3 border-t p-5 sm:border-l sm:border-t-0">
              <div className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> Если готов изменить…</div>
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
                <b>Будь готов переехать в Самару</b> (в пределах своего региона) — «Инженер-робототехник» станет заметно выгоднее:
                ~127 000 ₽ через 5 лет против ~93 000 ₽ в Сызрани <b className="text-ok">(+37%)</b>. Компромисс: 4 года очной учёбы.
              </div>
              <p className="text-xs text-muted-foreground">Цифры примера — оценки по открытым данным; в отчёте рядом с каждой цифрой — источник.</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: MapPin, title: "Регион — главный параметр", text: "Не готов переезжать — вузы других городов не показываем вообще, только онлайн-форматы." },
          { icon: TrendingUp, title: "Зелёные, жёлтые, красные", text: "Статус профессии на 5 лет: спрос на hh, госприоритеты, риск автоматизации ИИ — с обоснованием." },
          { icon: CalendarHeart, title: "Сходи почувствуй вайб", text: "Дни открытых дверей, лекции, олимпиады и хакатоны вуза — со ссылками и советом, что спросить у студентов." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 rounded-lg border bg-card p-4">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </section>

      <section id="data" aria-labelledby="data-h" className="space-y-4">
        <h2 id="data-h" className="flex items-center gap-2 text-2xl font-bold"><Database className="h-6 w-6 text-primary" /> Откуда данные</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-2 pt-5 text-sm">
              <p className="font-medium">В базе сейчас</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <li>{c.regions.length - 1} регионов РФ</li>
                <li>{c.specialties.length} направлений (ОКСО)</li>
                <li>{c.professions.length} профессий</li>
                <li>{c.universities.length} вузов и колледжей</li>
                <li>{cities} городов</li>
                <li>{c.programs.length} программ</li>
              </ul>
              <p className="pt-2 font-medium">Источники</p>
              <ul className="list-inside list-disc text-muted-foreground">
                <li>hh.ru — вакансии и зарплатные вилки (API с кэшем 24 ч, фолбэк — оценки)</li>
                <li>Росстат — медиана зарплат (РФ: 73 871 ₽, апрель 2025) и региональные коэффициенты</li>
                <li>Мониторинг трудоустройства выпускников Минобрнауки</li>
                <li>Сайты вузов, Вузопедия, «Поступи онлайн», мониторинг качества приёма ВШЭ</li>
                <li>Указ № 309, нацпроекты технологического лидерства и «Кадры»</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 pt-5 text-sm">
              <p className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-ok" /> Правила честности</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li>У каждой цифры есть источник и пометка: <Badge variant="green">проверено</Badge> или <Badge variant="yellow">оценка</Badge>.</li>
                <li>Сейчас проверенных записей мало ({verified} программ) — большинство проходных баллов и цен даны диапазоном-оценкой. Всегда сверяйся с сайтом вуза.</li>
                <li>Даты мероприятий не выдумываем: без ИИ-поиска даём ссылку на страницу событий вуза.</li>
                <li>ИИ не придумывает зарплаты и баллы — он только объясняет цифры движка.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
