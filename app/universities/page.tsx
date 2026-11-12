import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getCatalog } from "@/lib/db/catalog";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { FavButton } from "@/components/app/fav-button";
import { CATALOG, CRUMBS } from "@/lib/copy";

export const metadata = { title: CATALOG.title };

const PAGE = 30;
const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");

/** Каталог вузов. Все фильтры в адресе (?q=&region=&kind=&sort=&n=), поэтому «назад» в браузере их сохраняет. */
export default async function Universities({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const region = sp.region ?? "";
  const kind = sp.kind === "head" || sp.kind === "branch" ? sp.kind : "all";
  const sort = sp.sort === "name" || sp.sort === "budget" ? sp.sort : "programs";
  const n = Math.min(Number(sp.n) || PAGE, 1000);
  const c = getCatalog();
  const progCount = new Map<string, number>();
  const specNames = new Map(c.specialties.map((s) => [s.code, norm(s.name)]));
  const uniSpecs = new Map<string, string[]>();
  for (const p of c.programs) {
    progCount.set(p.universityId, (progCount.get(p.universityId) ?? 0) + 1);
    uniSpecs.set(p.universityId, [...(uniSpecs.get(p.universityId) ?? []), specNames.get(p.specialtyCode) ?? ""]);
  }
  const regions = c.regions.filter((r) => r.id !== "abroad").sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const regName = new Map(c.regions.map((r) => [r.id, r.name]));
  const nq = norm(q);
  let list = c.universities.filter((u) => !u.abroad);
  if (region) list = list.filter((u) => u.regionId === region);
  if (kind !== "all") list = list.filter((u) => (kind === "branch") === u.features.includes("branch"));
  if (nq) list = list.filter((u) => norm(`${u.name} ${u.short} ${u.city} ${u.aliases.join(" ")}`).includes(nq) || (uniSpecs.get(u.id) ?? []).some((s) => s.includes(nq)));
  list = list.sort((a, b) =>
    sort === "name" ? a.short.localeCompare(b.short, "ru")
    : sort === "budget" ? Number(b.budget) - Number(a.budget) || (progCount.get(b.id) ?? 0) - (progCount.get(a.id) ?? 0)
    : (progCount.get(b.id) ?? 0) - (progCount.get(a.id) ?? 0));
  const shown = list.slice(0, n);
  const url = (patch: Record<string, string>) => {
    const u = new URLSearchParams({ ...(q && { q }), ...(region && { region }), ...(kind !== "all" && { kind }), ...(sort !== "programs" && { sort }), ...patch });
    for (const [k, v] of [...u.entries()]) if (!v) u.delete(k);
    return `/universities${u.toString() ? `?${u}` : ""}`;
  };

  return (
    <div className="space-y-5" data-testid="catalog">
      <Breadcrumbs items={[{ label: CRUMBS.route, href: "/" }, { label: CRUMBS.unis }]} />
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{CATALOG.title}</h1>
        <p className="text-muted-foreground">{CATALOG.lead(c.universities.filter((u) => !u.abroad).length)}</p>
      </div>
      {/* обычная форма GET: фильтры попадают в адрес */}
      <form className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]" method="get">
        <input name="q" defaultValue={q} placeholder={CATALOG.search} aria-label={CATALOG.searchLabel} className="h-10 rounded-lg border bg-background px-3" data-testid="catalog-q" />
        <select name="region" defaultValue={region} aria-label={CATALOG.region} className="h-10 rounded-lg border bg-background px-2" data-testid="catalog-region">
          <option value="">{CATALOG.allRegions}</option>
          {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select name="kind" defaultValue={kind} aria-label={CATALOG.kind} className="h-10 rounded-lg border bg-background px-2">
          {(Object.keys(CATALOG.kinds) as (keyof typeof CATALOG.kinds)[]).map((k) => <option key={k} value={k}>{CATALOG.kinds[k]}</option>)}
        </select>
        <select name="sort" defaultValue={sort} aria-label={CATALOG.sort} className="h-10 rounded-lg border bg-background px-2">
          {(Object.keys(CATALOG.sorts) as (keyof typeof CATALOG.sorts)[]).map((k) => <option key={k} value={k}>{CATALOG.sorts[k]}</option>)}
        </select>
        <button type="submit" className="h-10 cursor-pointer rounded-lg bg-primary px-4 font-medium text-primary-foreground" data-testid="catalog-submit">{CATALOG.searchLabel}</button>
      </form>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span data-testid="catalog-found">{CATALOG.found(list.length)}</span>
        {(q || region || kind !== "all") && <Link href="/universities" className="text-primary hover:underline">{CATALOG.reset}</Link>}
      </div>
      {list.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{CATALOG.empty}</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {shown.map((u) => (
          <li key={u.id}>
            <Card className="flex h-full items-start gap-3 p-4" data-testid="catalog-item">
              <div className="min-w-0 flex-1">
                <Link href={`/university/${u.id}`} className="font-semibold text-primary hover:underline">{u.short}</Link>
                <p className="line-clamp-2 text-sm">{u.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{u.city}, {regName.get(u.regionId)}</span>
                  <span>· {CATALOG.programs(progCount.get(u.id) ?? 0)}</span>
                  {u.features.includes("branch") && <span>· {CATALOG.branch}</span>}
                </p>
              </div>
              <FavButton kind="universities" id={u.id} />
            </Card>
          </li>
        ))}
      </ul>
      {list.length > n && (
        <div className="text-center"><Link href={url({ n: String(n + PAGE) })} scroll={false} className="inline-block rounded-lg border bg-card px-4 py-2 font-medium hover:bg-muted" data-testid="catalog-more">{CATALOG.more}</Link></div>
      )}
    </div>
  );
}
