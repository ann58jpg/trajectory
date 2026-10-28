import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataGap } from "@/components/app/data-gap";
import { getCatalog } from "@/lib/db/catalog";
import { computeGaps, OWNERS, type OwnerId } from "@/lib/data-gaps";
import { DATA_GAP, NOT_FOUND } from "@/lib/copy";

export const metadata = { title: DATA_GAP.pageTitle };

export default function DataGapsPage() {
  const gaps = computeGaps(getCatalog());
  const total = gaps.reduce((s, g) => s + g.count, 0);
  const byOwner = (Object.keys(OWNERS) as OwnerId[]).map((o) => ({ id: o, gaps: gaps.filter((g) => g.owners.includes(o)) }));
  return (
    <div className="space-y-6 pt-6" data-testid="data-gaps-page">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {NOT_FOUND.home}</Link>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{DATA_GAP.pageTitle}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">{DATA_GAP.pageIntro}</p>
        <p className="mt-2 text-sm">{DATA_GAP.total}: <b className="tabular-nums" data-testid="gaps-total">{total.toLocaleString("ru-RU")}</b></p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/60 text-left">
            <tr><th className="p-3">{DATA_GAP.colWhat}</th><th className="p-3">{DATA_GAP.colCount}</th><th className="p-3">{DATA_GAP.colShare}</th><th className="p-3">{DATA_GAP.colOwner}</th></tr>
          </thead>
          <tbody>
            {gaps.map((g) => (
              <tr key={g.id} className="border-t align-top" data-testid="gap-row">
                <td className="p-3">{g.what}<p className="text-xs text-muted-foreground">{DATA_GAP.where} {g.where}</p></td>
                <td className="p-3 tabular-nums">{g.count.toLocaleString("ru-RU")} / {g.total.toLocaleString("ru-RU")}</td>
                <td className="p-3 tabular-nums">{g.total ? Math.round((g.count / g.total) * 100) : 0}%</td>
                <td className="p-3">{g.owners.map((o) => OWNERS[o].name).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{DATA_GAP.ownersTitle}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {byOwner.map(({ id, gaps: gs }) => (
            <Card key={id} data-testid="gap-owner">
              <CardHeader><CardTitle className="text-base">{OWNERS[id].name}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{OWNERS[id].need}</p>
                <div className="flex flex-wrap gap-1.5">{gs.map((g) => <DataGap key={g.id} what={g.what} where={g.where} compact />)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
