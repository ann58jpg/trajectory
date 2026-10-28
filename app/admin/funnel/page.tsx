import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTrackStore } from "@/lib/server/track-store";
import { computeFunnel, QUIZ_BLOCKS } from "@/lib/funnel";
import { FunnelChart } from "./funnel-chart";
import { FUNNEL } from "../copy";

export const dynamic = "force-dynamic";
export const metadata = { title: FUNNEL.title, robots: { index: false } };

const COOKIE = "trajectory_admin";
const token = (pw: string) => createHash("sha256").update(`trajectory:${pw}`).digest("hex");

async function login(formData: FormData) {
  "use server";
  const pw = process.env.ADMIN_PASSWORD;
  if (pw && formData.get("password") === pw) {
    (await cookies()).set(COOKIE, token(pw), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/admin", maxAge: 60 * 60 * 8 });
  }
  redirect("/admin/funnel");
}

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; mode?: string }> }) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return <Notice text={FUNNEL.noPassword} />;
  const authed = (await cookies()).get(COOKIE)?.value === token(pw);
  if (!authed) {
    return (
      <form action={login} className="mx-auto max-w-sm space-y-3 pt-10" data-testid="funnel-login">
        <h1 className="text-xl font-bold">{FUNNEL.title}</h1>
        <input type="password" name="password" required placeholder={FUNNEL.password} aria-label={FUNNEL.password} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        <Button type="submit">{FUNNEL.enter}</Button>
      </form>
    );
  }
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const from = sp.from ?? new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const to = sp.to ?? today;
  const mode = sp.mode === "interests" || sp.mode === "money" ? sp.mode : null;
  const store = await getTrackStore();
  const rows = await store.list(`${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`);
  const f = computeFunnel(rows, { mode });
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
  const start = f.steps.find((s) => s.id === "quiz_start")!.sessions;

  return (
    <div className="space-y-6 pt-6" data-testid="funnel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">← /admin</Link>
          <h1 className="text-2xl font-bold">{FUNNEL.title}</h1>
          <p className="text-xs text-muted-foreground">{FUNNEL.store(store.kind)}</p>
        </div>
        <form className="flex flex-wrap items-end gap-2 text-sm" method="get">
          <label className="grid gap-1">{FUNNEL.from}<input type="date" name="from" defaultValue={from} className="rounded-md border bg-background px-2 py-1" /></label>
          <label className="grid gap-1">{FUNNEL.to}<input type="date" name="to" defaultValue={to} className="rounded-md border bg-background px-2 py-1" /></label>
          <label className="grid gap-1">{FUNNEL.mode}
            <select name="mode" defaultValue={mode ?? ""} className="rounded-md border bg-background px-2 py-1">
              <option value="">{FUNNEL.modeAll}</option><option value="interests">{FUNNEL.modeInterests}</option><option value="money">{FUNNEL.modeMoney}</option>
            </select>
          </label>
          <Button type="submit" size="sm">{FUNNEL.apply}</Button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{FUNNEL.steps}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {f.steps.map((s) => (
              <div key={s.id} className="flex items-center gap-2" data-testid="funnel-step">
                <span className="w-56 shrink-0">{s.label}</span>
                <div className="h-3 flex-1 rounded bg-muted"><div className="h-3 rounded bg-primary" style={{ width: `${f.steps[0].sessions ? (s.sessions / f.steps[0].sessions) * 100 : 0}%` }} /></div>
                <span className="w-12 text-right tabular-nums">{s.sessions}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{FUNNEL.conversions}</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>{f.conversions.map((c) => (
                <tr key={c.id} className="border-t"><td className="py-1.5">{c.label}<div className="font-mono text-[11px] text-muted-foreground">{c.num} / {c.den}</div></td><td className="text-right font-semibold tabular-nums">{pct(c.value)}</td></tr>
              ))}</tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{FUNNEL.quizDrop}</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {f.blocks.map((b, i) => {
              const prev = i === 0 ? start : f.blocks[i - 1].sessions;
              return (
                <div key={b.block} className="flex justify-between border-t py-1.5" data-testid="funnel-block">
                  <span>{FUNNEL.block(b.block as (typeof QUIZ_BLOCKS)[number])}</span>
                  <span className="tabular-nums">{b.sessions} · {FUNNEL.left(prev ? Math.round(((prev - b.sessions) / prev) * 100) : 0)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{FUNNEL.feedback}</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p className="text-3xl font-bold tabular-nums" data-testid="funnel-feedback">{f.feedback.avg === null ? "—" : f.feedback.avg.toFixed(1)}</p>
            <p className="text-muted-foreground">{FUNNEL.ratings(f.feedback.count)}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{FUNNEL.byDay}</CardTitle></CardHeader>
        <CardContent><FunnelChart data={f.daily} /></CardContent>
      </Card>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return <p className="mx-auto max-w-xl pt-10 text-sm text-muted-foreground" data-testid="funnel-no-password">{text}</p>;
}
