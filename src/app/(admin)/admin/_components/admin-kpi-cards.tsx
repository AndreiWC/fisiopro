import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "../_data-access/get-dashboard-metrics";

interface AdminKpiCardsProps {
  metrics: DashboardMetrics;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
});

export function AdminKpiCards({ metrics }: AdminKpiCardsProps) {
  const cards = [
    { title: "MRR", value: currencyFormatter.format(metrics.mrr) },
    {
      title: "Empresas ativas / total",
      value: `${metrics.activeSubscriptionsCount} / ${metrics.totalOrganizations}`,
    },
    { title: "Novas este mês", value: String(metrics.newOrganizationsThisMonth) },
    { title: "Churn do mês", value: percentFormatter.format(metrics.churnRate) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold text-foreground">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
