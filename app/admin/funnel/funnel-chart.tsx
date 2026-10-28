"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/chart-colors";
import { FUNNEL } from "../copy";

type Day = { date: string; landing_view: number; quiz_start: number; quiz_complete: number; results_view: number };
const SERIES = [
  ["landing_view", CHART.axis],
  ["quiz_start", CHART.accent],
  ["quiz_complete", CHART.primary],
  ["results_view", CHART.ok],
] as const;

export function FunnelChart({ data }: { data: Day[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">{FUNNEL.empty}</p>;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
          <XAxis dataKey="date" stroke={CHART.axis} fontSize={12} />
          <YAxis stroke={CHART.axis} fontSize={12} width={40} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
          <Legend formatter={(v) => FUNNEL.series[v as keyof typeof FUNNEL.series]} />
          {SERIES.map(([k, color]) => <Line key={k} type="monotone" dataKey={k} stroke={color} strokeWidth={2} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
