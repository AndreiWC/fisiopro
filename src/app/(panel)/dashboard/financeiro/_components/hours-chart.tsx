import { ChartCard } from "./chart-card";

interface HoursChartProps {
  data: { label: string; revenue: number; count: number }[];
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function HoursChart({ data }: HoursChartProps) {
  const max = Math.max(1, ...data.map((hour) => hour.revenue));
  const best = data[0];

  return (
    <ChartCard
      title="Horários que mais faturam"
      description={
        best
          ? `Os atendimentos das ${best.label} são os que mais rendem.`
          : "Mostra em quais horários a clínica mais fatura."
      }
    >
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhum atendimento concluído no período.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.map((hour, index) => (
            <li key={hour.label} className="flex items-center gap-3">
              <span className="w-9 shrink-0 font-mono text-sm font-medium tabular-nums text-foreground">
                {hour.label}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(hour.revenue / max) * 100}%`,
                    backgroundColor: index === 0 ? "var(--chart-teal)" : "var(--chart-violet)",
                  }}
                />
              </div>
              <span className="w-24 shrink-0 text-right font-mono text-sm font-medium tabular-nums text-foreground">
                {currencyFormatter.format(hour.revenue / 100)}
              </span>
              <span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground sm:inline">
                {hour.count} {hour.count === 1 ? "sessão" : "sessões"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
