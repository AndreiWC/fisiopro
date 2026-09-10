import { getDashboardMetrics } from "./_data-access/get-dashboard-metrics";
import { AdminKpiCards } from "./_components/admin-kpi-cards";

export default async function AdminHomePage() {
  const metrics = await getDashboardMetrics();

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
    </main>
  );
}
