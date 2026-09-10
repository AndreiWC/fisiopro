"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface RevenueChartProps {
  data: { label: string; revenue: number }[];
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((point) => ({ label: point.label, revenueReais: point.revenue / 100 }));

  return (
    <div className="h-72 w-full rounded-xl border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-medium text-foreground">Evolução da receita</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dce6df" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={80}
            tickFormatter={(value: number) => currencyFormatter.format(value)}
          />
          <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
          <Line
            type="monotone"
            dataKey="revenueReais"
            name="Receita"
            stroke="#0d9457"
            strokeWidth={2}
            strokeLinecap="round"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
