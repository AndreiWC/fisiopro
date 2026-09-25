"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ChartCard, ChartTooltip } from "./chart-card";

interface WeekdayChartProps {
  data: { label: string; revenue: number; count: number }[];
}

const WEEKDAY_NAMES: Record<string, string> = {
  Seg: "segunda-feira",
  Ter: "terça-feira",
  Qua: "quarta-feira",
  Qui: "quinta-feira",
  Sex: "sexta-feira",
  Sáb: "sábado",
  Dom: "domingo",
};

const BEST_COLOR = "var(--chart-4)";
const DEFAULT_COLOR = "var(--chart-blue)";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function WeekdayChart({ data }: WeekdayChartProps) {
  const best = data.reduce((top, day) => (day.revenue > top.revenue ? day : top), data[0]);
  const hasRevenue = best !== undefined && best.revenue > 0;

  return (
    <ChartCard
      title="Receita por dia da semana"
      description={
        hasRevenue
          ? `${capitalize(WEEKDAY_NAMES[best.label])} é o dia que mais fatura: ${currencyFormatter.format(best.revenue / 100)}.`
          : "Mostra em quais dias da semana a clínica mais fatura."
      }
    >
      {hasRevenue ? (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                content={({ active, payload }) => {
                  const day = active ? payload?.[0]?.payload : null;
                  return day ? (
                    <ChartTooltip
                      title={capitalize(WEEKDAY_NAMES[day.label])}
                      rows={[
                        { color: day.label === best.label ? BEST_COLOR : DEFAULT_COLOR, label: "Receita", value: currencyFormatter.format(day.revenue / 100) },
                        { color: day.label === best.label ? BEST_COLOR : DEFAULT_COLOR, label: "Atendimentos", value: String(day.count) },
                      ]}
                    />
                  ) : null;
                }}
              />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {data.map((day) => (
                  <Cell key={day.label} fill={day.label === best.label ? BEST_COLOR : DEFAULT_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhum atendimento concluído no período.
        </p>
      )}
    </ChartCard>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
