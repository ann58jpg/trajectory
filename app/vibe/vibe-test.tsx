"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip, Progress } from "@/components/ui/misc";
import { deviceId, useDemoVibe } from "@/lib/storage";
import { LEISURE, ORDINAL, SPIRIT, TAGS, type Leisure, type OrdinalScale, type Spirit } from "@/lib/vibe";
import { VIBE, VIBE_TEST } from "@/lib/copy";
import { track } from "@/lib/analytics";
import { VibeDetails, VibeRadar, type VibeResp } from "@/components/app/vibe-block";
import { VibeCard } from "@/components/app/vibe-card";

type Uni = { id: string; short: string; name: string; city: string };
const Q = VIBE_TEST.questions;

export function VibeTest({ universities, initialUni }: { universities: Uni[]; initialUni: string | null }) {
  const [demo] = useDemoVibe();
  const [uni, setUni] = useState<Uni | null>(universities.find((u) => u.id === initialUni) ?? null);
  const [query, setQuery] = useState("");
  const [faculty, setFaculty] = useState("");
  const [course, setCourse] = useState(1);
  const [stage, setStage] = useState<"intro" | "q" | "sending" | "done">("intro");
  const [i, setI] = useState(0);
  const [ord, setOrd] = useState<Record<number, number>>({});
  const [leisure, setLeisure] = useState<Leisure[]>([]);
  const [spirit, setSpirit] = useState<Spirit[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [result, setResult] = useState<(VibeResp & { replaced: boolean }) | null>(null);
  const [error, setError] = useState(false);

  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return universities.filter((u) => `${u.short} ${u.name} ${u.city}`.toLowerCase().includes(q)).slice(0, 8);
  }, [query, universities]);

  const q = Q[i];
  const answered = (k: number) => {
    const s = Q[k].scale;
    return s === "leisure" ? leisure.length > 0 : s === "spirit" ? spirit.length > 0 : s === "tags" ? tags.length === 3 : ord[k] !== undefined;
  };
  const toggle = <T,>(arr: T[], x: T, max: number) => (arr.includes(x) ? arr.filter((y) => y !== x) : arr.length >= max ? arr : [...arr, x]);

  const send = async () => {
    if (!uni) return;
    setStage("sending");
    setError(false);
    const ordinal: Partial<Record<OrdinalScale, number[]>> = {};
    Q.forEach((qq, k) => {
      if ((ORDINAL as readonly string[]).includes(qq.scale) && ord[k] !== undefined) (ordinal[qq.scale as OrdinalScale] ??= []).push(ord[k]);
    });
    try {
      const res = await fetch(`/api/vibe?similar=1${demo ? "&demo=1" : ""}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: deviceId(), universityId: uni.id, faculty, course, ordinal, leisure, spirit, tags }),
      });
      if (!res.ok) throw new Error();
      const r1 = await res.json();
      // похожие вузы — тем же запросом GET
      const r2 = await fetch(`/api/vibe?universityId=${uni.id}&similar=1${demo ? "&demo=1" : ""}`).then((r) => r.json());
      setResult({ ...r1, similar: r2.similar });
      track("vibe_test_complete", { universityId: uni.id });
      setStage("done");
    } catch {
      setError(true);
      setStage("q");
    }
  };

  if (stage === "intro") {
    return (
      <div className="mx-auto max-w-2xl space-y-5 pt-4" data-testid="vibe-test">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{VIBE_TEST.title}</h1>
          <p className="mt-1 text-muted-foreground">{VIBE_TEST.lead}</p>
        </div>
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <p className="font-medium">{VIBE_TEST.uni}</p>
              {uni ? (
                <div className="flex items-center justify-between rounded-lg border bg-secondary p-3">
                  <span><b>{uni.short}</b> · {uni.city}</span>
                  <button type="button" onClick={() => setUni(null)} className="cursor-pointer text-sm text-primary hover:underline">{VIBE_TEST.back}</button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={VIBE_TEST.uniSearch} aria-label={VIBE_TEST.uni}
                      className="h-10 w-full rounded-lg border bg-background pl-9 pr-3" data-testid="vibe-uni-search" />
                  </div>
                  <ul className="space-y-1">
                    {found.map((u) => (
                      <li key={u.id}>
                        <button type="button" onClick={() => setUni(u)} className="w-full cursor-pointer rounded-lg border p-2 text-left text-sm hover:bg-muted" data-testid="vibe-uni-option">
                          <b>{u.short}</b> · {u.city}<span className="block truncate text-xs text-muted-foreground">{u.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <label className="block space-y-1">
              <span className="font-medium">{VIBE_TEST.faculty}</span>
              <input value={faculty} onChange={(e) => setFaculty(e.target.value)} list="faculties" placeholder={VIBE_TEST.facultyHint} maxLength={120} className="h-10 w-full rounded-lg border bg-background px-3" data-testid="vibe-faculty" />
              <datalist id="faculties">{VIBE_TEST.facultySuggest.map((f) => <option key={f} value={f} />)}</datalist>
            </label>
            <div className="space-y-1">
              <p className="font-medium">{VIBE_TEST.course}</p>
              <div className="flex flex-wrap gap-2">{VIBE_TEST.courses.map((c, k) => <Chip key={c} role="radio" selected={course === k + 1} onClick={() => setCourse(k + 1)}>{c}</Chip>)}</div>
            </div>
            <Button size="lg" disabled={!uni} onClick={() => { track("vibe_test_start", { universityId: uni!.id }); setStage("q"); }} data-testid="vibe-start">{VIBE_TEST.start} <ArrowRight /></Button>
            {!uni && <p className="text-xs text-muted-foreground">{VIBE_TEST.pickUni}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "done" && result && uni) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 pt-4" data-testid="vibe-done">
        <p className="flex items-center gap-2 text-lg font-semibold text-ok"><Check /> {VIBE_TEST.sent}</p>
        {result.replaced && <p className="text-sm text-muted-foreground">{VIBE_TEST.replaced}</p>}
        <h2 className="text-xl font-bold">{VIBE_TEST.yourUni}: {uni.short}</h2>
        {result.vibe ? (
          <>
            {result.vibe.demo && <p className="rounded-lg border border-warn/50 bg-warn/15 p-2 text-sm font-medium" data-testid="vibe-demo">{VIBE.demo}</p>}
            <VibeRadar you={null} uni={result.vibe} />
            <VibeDetails vibe={result.vibe} />
            {result.similar && result.similar.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">{VIBE_TEST.similar}</h3>
                <ul className="grid gap-2 sm:grid-cols-3">
                  {result.similar.map((s) => (
                    <li key={s.id}><Link href={`/university/${s.id}`} className="block rounded-lg border bg-card p-3 text-sm hover:border-primary/50"><b>{s.short}</b><span className="block text-xs text-muted-foreground">{VIBE.match(s.match)}</span></Link></li>
                  ))}
                </ul>
              </div>
            )}
            <VibeCard kind="university" kicker={VIBE_TEST.cardKicker} title={uni.short} listTitle={VIBE_TEST.cardTags} items={result.vibe.tags.slice(0, 3).map((t) => t.tag)} fileName={`vibe-${uni.id}.png`} />
          </>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm" data-testid="vibe-not-yet">{VIBE_TEST.notYet(result.count)}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link href={`/university/${uni.id}`}>{uni.short}</Link></Button>
          <Button variant="outline" onClick={() => { setStage("intro"); setUni(null); setI(0); setOrd({}); setLeisure([]); setSpirit([]); setTags([]); setResult(null); }}>{VIBE_TEST.again}</Button>
        </div>
      </div>
    );
  }

  const opts = "options" in q && q.options ? q.options : (ORDINAL as readonly string[]).includes(q.scale) ? VIBE.scales[q.scale as OrdinalScale].options : [];
  return (
    <div className="mx-auto max-w-2xl space-y-5 pt-4" data-testid="vibe-test">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground" data-testid="vibe-progress">{VIBE_TEST.progress(i + 1, Q.length)} · {uni?.short}</p>
        <Progress value={((i + 1) / Q.length) * 100} label={VIBE_TEST.progress(i + 1, Q.length)} />
      </div>
      <Card>
        <CardContent className="space-y-4 pt-5">
          <h2 className="text-lg font-semibold" data-testid="vibe-q">{q.q}</h2>
          {q.scale === "leisure" ? (
            <div className="flex flex-wrap gap-2">{LEISURE.map((l) => <Chip key={l} selected={leisure.includes(l)} onClick={() => setLeisure(toggle(leisure, l, 9))}>{VIBE.leisure[l]}</Chip>)}</div>
          ) : q.scale === "spirit" ? (
            <div className="flex flex-wrap gap-2">{SPIRIT.map((x) => <Chip key={x} selected={spirit.includes(x)} onClick={() => setSpirit(toggle(spirit, x, 2))}>{VIBE.spirit[x]}</Chip>)}</div>
          ) : q.scale === "tags" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{VIBE_TEST.tagsPick} · {tags.length}/3</p>
              <div className="flex flex-wrap gap-2">{TAGS.map((t) => <Chip key={t} selected={tags.includes(t)} onClick={() => setTags(toggle(tags, t, 3))}>{t}</Chip>)}</div>
            </div>
          ) : (
            <div className="grid gap-2" role="radiogroup">{opts.map((o, k) => <Chip key={o} role="radio" selected={ord[i] === k} onClick={() => setOrd({ ...ord, [i]: k })} data-testid="vibe-option">{o}</Chip>)}</div>
          )}
          {error && <p className="text-sm text-bad">{VIBE_TEST.error}</p>}
        </CardContent>
      </Card>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => (i === 0 ? setStage("intro") : setI(i - 1))}><ArrowLeft /> {VIBE_TEST.back}</Button>
        {i < Q.length - 1 ? (
          <Button className="ml-auto" disabled={!answered(i)} onClick={() => setI(i + 1)} data-testid="vibe-next">{VIBE_TEST.next} <ArrowRight /></Button>
        ) : (
          <Button className="ml-auto" disabled={!answered(i) || stage === "sending"} onClick={send} data-testid="vibe-send">{VIBE_TEST.finish}</Button>
        )}
      </div>
    </div>
  );
}
