"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS } from "../_lib/chart-colors";
import { ChartCard, ChartTooltip } from "./chart-card";

interface StatusChartProps {
  data: { label: string; completed: number; noShow: number; cancelled: number }[];
}

const SERIES = [
  { key: "completed", label: "Concluídos", color: CHART_COLORS.completed },
  { key: "noShow", label: "Faltas", color: CHART_COLORS.noShow },
  { key: "cancelled", label: "Cancelados", color: CHART_COLORS.cancelled },
] as const;

export function StatusChart({ data }: StatusChartProps) {
  const totals = SERIES.map((series) => ({
    ...series,
    total: data.reduce((sum, point) => sum + point[series.key], 0),
  }));

  return (
    <ChartCard title="Como foram os agendamentos" description="Concluídos, faltas e cancelamentos por período.">
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
        {totals.map((series) => (
          <span key={series.key} className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: series.color }} />
            {series.label}
            <span className="font-mono font-medium tabular-nums text-foreground">{series.total}</span>
          </span>
        ))}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    title={String(label)}
                    rows={SERIES.map((series) => ({
                      color: series.color,
                      label: series.label,
                      value: String(payload[0]?.payload[series.key] ?? 0),
                    }))}
                  />
                ) : null
              }
            />
            {SERIES.map((series, index) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                stackId="status"
                fill={series.color}
                radius={index === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
