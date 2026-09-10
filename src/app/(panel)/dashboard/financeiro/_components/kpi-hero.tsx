import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinancialSummary } from "../_data-access/get-financial-summary";

interface KpiHeroProps {
  summary: FinancialSummary;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percentFormatter = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

export function KpiHero({ summary }: KpiHeroProps) {
  const trend = summary.revenueTrend;

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Receita total</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <p className="font-mono text-4xl font-semibold tabular-nums text-foreground">
            {currencyFormatter.format(summary.revenueTotal / 100)}
          </p>
          {trend !== null && (
            <span
              className={cn(
                "flex items-center gap-1 font-mono text-sm font-medium",
                trend >= 0 ? "text-primary" : "text-destructive",
              )}
            >
              {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {percentFormatter.format(Math.abs(trend))}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Ticket médio</p>
        <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">
          {currencyFormatter.format(summary.averageTicket / 100)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Atendimentos concluídos</p>
        <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">
          {summary.appointmentsCompletedCount}
        </p>
      </div>
    </div>
  );
}
