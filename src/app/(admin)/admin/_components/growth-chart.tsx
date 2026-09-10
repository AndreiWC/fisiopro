"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GrowthSeriesPoint } from "../_data-access/get-growth-series";

interface GrowthChartProps {
  data: GrowthSeriesPoint[];
}

export function GrowthChart({ data }: GrowthChartProps) {
  return (
    <div className="h-72 w-full rounded-xl border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-medium text-foreground">Novas empresas e MRR (últimos 12 meses)</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line yAxisId="left" type="monotone" dataKey="newCompanies" name="Novas empresas" stroke="#6366f1" strokeWidth={2} />
          <Line yAxisId="right" type="monotone" dataKey="mrr" name="MRR (R$)" stroke="#10b981" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
