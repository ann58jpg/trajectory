import { ExternalLink, Send, Users } from "lucide-react";
import { studentLifeOf } from "@/lib/life";
import { LIFE } from "@/lib/copy";
import { DataGap } from "./data-gap";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Ежегодные события по месяцам (только с источником) и сообщества. Без хуков — подходит и серверу, и клиенту. */
export function LifeCore({ universityId, site, name, children }: { universityId: string; site: string; name: string; children?: React.ReactNode }) {
  const life = studentLifeOf(universityId);
  const siteSearch = `https://yandex.ru/search/?text=${encodeURIComponent(`site:${site.replace(/^https?:\/\//, "").split("/")[0]} ${LIFE.title} ${name}`)}`;
  return (
    <div className="space-y-4" data-testid="student-life">
      <div className="space-y-2">
        <h3 className="font-semibold">{LIFE.yearTitle}</h3>
        {life?.typical.length ? (
          <ul className="space-y-1.5 text-sm" data-testid="life-typical">
            {[...life.typical].sort((a, b) => a.month - b.month).map((t) => (
              <li key={t.title} className="rounded-lg border p-2">
                <span className="font-medium">{LIFE.monthNames[t.month - 1]}</span> · {t.title}
                <span className="block text-xs text-muted-foreground">{LIFE.usually(LIFE.months[t.month - 1])} · <a href={t.source} {...ext} className="text-primary hover:underline">{LIFE.source}</a></span>
              </li>
            ))}
          </ul>
        ) : life ? (
          <p className="text-sm text-muted-foreground">{LIFE.gapTypical}</p>
        ) : (
          <DataGap what={LIFE.gapWhat} where={LIFE.gapWhere} />
        )}
      </div>
      {children}
      <div className="space-y-2">
        <h3 className="font-semibold">{LIFE.communities}</h3>
        <ul className="flex flex-wrap gap-2 text-sm" data-testid="life-communities">
          {life?.communities.map((c) => (
            <li key={c.url}>
              <a href={c.url} {...ext} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 hover:bg-muted">
                {c.kind === "telegram" ? <Send className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />} {c.kind === "vk" ? LIFE.vk : c.kind === "telegram" ? LIFE.telegram : c.title} <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
          <li><a href={siteSearch} {...ext} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 hover:bg-muted">{LIFE.siteSearch} <ExternalLink className="h-3 w-3" /></a></li>
        </ul>
      </div>
    </div>
  );
}
