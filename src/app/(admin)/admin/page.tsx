import { getDashboardMetrics } from "./_data-access/get-dashboard-metrics";
import { getGrowthSeries } from "./_data-access/get-growth-series";
import { AdminKpiCards } from "./_components/admin-kpi-cards";
import { GrowthChart } from "./_components/growth-chart";
import { StatusDistributionChart } from "./_components/status-distribution-chart";
import { subscriptionStatusMeta } from "./_lib/subscription-status";

const PLAN_LABEL = { BASIC: "Básico", PROFESSIONAL: "Profissional" } as const;

export default async function AdminHomePage() {
  const [metrics, growthSeries] = await Promise.all([
    getDashboardMetrics(),
    getGrowthSeries(),
  ]);

  const statusChartData = metrics.statusBreakdown.map((item) => ({
    label: subscriptionStatusMeta(item.status).label,
    count: item.count,
  }));

  const planChartData = metrics.planBreakdown.map((item) => ({
    label: PLAN_LABEL[item.plan],
    count: item.count,
  }));

  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Painel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão geral das empresas e assinaturas do FisioPro.
        </p>
      </div>

      <AdminKpiCards metrics={metrics} />

      <div className="grid gap-4 lg:grid-cols-2">
        <GrowthChart data={growthSeries} />
        <StatusDistributionChart title="Assinaturas por status" data={statusChartData} />
        <StatusDistributionChart title="Assinaturas por plano" data={planChartData} />
      </div>
    </main>
  );
}
