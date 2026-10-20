"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useWeights } from "@/lib/client/storage";
import { FACTOR_LABEL, WEIGHT_ANCHORS, type Weights } from "@/lib/engine/config";
import type { FactorKey } from "@/lib/schemas";

const PROFILES = [
  ["interests", "Интересы (t = 0)"],
  ["base", "Базовая модель (t = 0,5)"],
  ["money", "Деньги (t = 1)"],
] as const;

/** Скрытая страница для демонстрации на защите: «если государству нужно усилить отрасль — меняются веса». */
export default function WeightsAdmin() {
  const [anchors, setAnchors, ready] = useWeights();
  if (!ready) return null;
  const set = (profile: keyof typeof WEIGHT_ANCHORS, key: FactorKey, v: number) => {
    setAnchors((a) => {
      const w = { ...a[profile], [key]: v };
      // нормируем остальные так, чтобы сумма оставалась 1
      const others = (Object.keys(w) as FactorKey[]).filter((k) => k !== key);
      const rest = others.reduce((s, k) => s + w[k], 0);
      const target = 1 - v;
      for (const k of others) w[k] = rest > 0 ? (w[k] / rest) * target : target / others.length;
      return { ...a, [profile]: w as Weights };
    });
  };
  return (
    <div className="space-y-6 pt-6">
      <div>
        <h1 className="text-2xl font-bold">Веса модели</h1>
        <p className="text-sm text-muted-foreground">
          Score = Σ вес × фактор. Изменения сохраняются в этом браузере и сразу применяются на <Link href="/results" className="text-primary hover:underline">экране результатов</Link>.
          Постоянные значения по умолчанию — в <code>lib/engine/config.ts</code>.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {PROFILES.map(([id, label]) => (
          <Card key={id}>
            <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(Object.keys(FACTOR_LABEL) as FactorKey[]).map((k) => (
                <div key={k}>
                  <div className="flex justify-between text-sm"><span>{FACTOR_LABEL[k]}</span><b className="tabular-nums">{anchors[id][k].toFixed(2)}</b></div>
                  <Slider value={[Math.round(anchors[id][k] * 100)]} min={0} max={90} step={1} onValueChange={([v]) => set(id, k, v / 100)} thumbLabel={`${label}: ${FACTOR_LABEL[k]}`} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <Button variant="outline" onClick={() => setAnchors(WEIGHT_ANCHORS)}><RotateCcw /> Сбросить к значениям ТЗ</Button>
    </div>
  );
}
