import { redirect } from "next/navigation";
import getSession from "@/lib/getSession";
import { requireActiveOrganization } from "@/lib/organization";
import { getFinancialSummary } from "./_data-access/get-financial-summary";
import { isFinancePeriod, type FinancePeriod } from "./_lib/period";
import { PeriodSelector } from "./_components/period-selector";
import { KpiHero } from "./_components/kpi-hero";
import { RevenueChart } from "./_components/revenue-chart";
import { RevenueByServiceList } from "./_components/revenue-by-service-list";
import { AppointmentsChart } from "./_components/appointments-chart";
import { AttendanceAlert } from "./_components/attendance-alert";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const organization = await requireActiveOrganization();
  const { periodo } = await searchParams;
  const period: FinancePeriod = isFinancePeriod(periodo) ? periodo : "ESTE_MES";

  const summary = await getFinancialSummary({ organizationId: organization.id, period });

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Financeiro
          </h1>
          <p className="text-sm text-muted-foreground">
            Veja como está indo o financeiro da sua clínica.
          </p>
        </div>
        <PeriodSelector value={period} />
      </div>

      <KpiHero summary={summary} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={summary.revenueSeries} />
        </div>
        <RevenueByServiceList services={summary.revenueByService} />
      </div>

      <AppointmentsChart data={summary.appointmentsSeries} />

      <AttendanceAlert summary={summary} />
    </main>
  );
}
