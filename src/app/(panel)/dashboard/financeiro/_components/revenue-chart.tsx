"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS } from "../_lib/chart-colors";
import { ChartCard, ChartTooltip } from "./chart-card";

interface RevenueChartProps {
  data: { label: string; revenue: number; previousRevenue: number }[];
  total: number;
  previousTotal: number;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compactFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function RevenueChart({ data, total, previousTotal }: RevenueChartProps) {
  const chartData = data.map((point) => ({
    label: point.label,
    revenue: point.revenue / 100,
    previousRevenue: point.previousRevenue / 100,
  }));

  return (
    <ChartCard
      title="Evolução da receita"
      description="Comparada com o período anterior, de mesma duração."
    >
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: CHART_COLORS.revenue }} />
          Este período
          <span className="font-mono font-medium tabular-nums text-foreground">
            {currencyFormatter.format(total / 100)}
          </span>
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span
            className="h-0 w-4 border-t-2 border-dashed"
            style={{ borderColor: CHART_COLORS.previous }}
          />
          Período anterior
          <span className="font-mono font-medium tabular-nums text-foreground">
            {currencyFormatter.format(previousTotal / 100)}
          </span>
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: CHART_COLORS.revenue, stopOpacity: 0.32 }} />
                <stop offset="100%" style={{ stopColor: CHART_COLORS.revenue, stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={64}
              tickFormatter={(value: number) => compactFormatter.format(value)}
            />
            <Tooltip
              cursor={{ stroke: CHART_COLORS.previous, strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    title={String(label)}
                    rows={[
                      {
                        color: CHART_COLORS.revenue,
                        label: "Este período",
                        value: currencyFormatter.format(Number(payload[0]?.payload.revenue ?? 0)),
                      },
                      {
                        color: CHART_COLORS.previous,
                        label: "Período anterior",
                        value: currencyFormatter.format(Number(payload[0]?.payload.previousRevenue ?? 0)),
                      },
                    ]}
                  />
                ) : null
              }
            />
            <Line
              type="monotone"
              dataKey="previousRevenue"
              name="Período anterior"
              stroke={CHART_COLORS.previous}
              strokeWidth={1.75}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Este período"
              stroke={CHART_COLORS.revenue}
              strokeWidth={2.5}
              fill="url(#revenueFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
