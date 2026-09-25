"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { serviceColor } from "../_lib/chart-colors";
import { ChartCard, ChartTooltip } from "./chart-card";

interface RevenueByServiceChartProps {
  services: { name: string; revenue: number }[];
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percentFormatter = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

export function RevenueByServiceChart({ services }: RevenueByServiceChartProps) {
  const total = services.reduce((sum, service) => sum + service.revenue, 0);
  const items = services.map((service, index) => ({
    ...service,
    color: serviceColor(service.name, index),
    share: total > 0 ? service.revenue / total : 0,
  }));

  return (
    <ChartCard title="Receita por serviço" description="Quanto cada serviço pesa no total.">
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhum atendimento concluído no período.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative mx-auto h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="revenue"
                  nameKey="name"
                  innerRadius="66%"
                  outerRadius="100%"
                  paddingAngle={items.length > 1 ? 2 : 0}
                  cornerRadius={4}
                  stroke="none"
                >
                  {items.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    const item = active ? payload?.[0]?.payload : null;
                    return item ? (
                      <ChartTooltip
                        title={item.name}
                        rows={[
                          { color: item.color, label: "Receita", value: currencyFormatter.format(item.revenue / 100) },
                          { color: item.color, label: "Participação", value: percentFormatter.format(item.share) },
                        ]}
                      />
                    ) : null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                {currencyFormatter.format(total / 100)}
              </span>
            </div>
          </div>

          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="min-w-0 flex-1 truncate text-foreground">{item.name}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {percentFormatter.format(item.share)}
                </span>
                <span className="w-24 shrink-0 text-right font-mono font-medium tabular-nums text-foreground">
                  {currencyFormatter.format(item.revenue / 100)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
