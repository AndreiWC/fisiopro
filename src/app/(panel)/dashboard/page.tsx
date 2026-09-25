import getSession from "@/lib/getSession";
import {
  Calendar,
  Gauge,
  PartyPopper,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonShareLink } from "./_components/button-share-link";
import { Reminders } from "./_components/reminder/reminders";
import { Agenda } from "./_components/agenda/agenda";
import { CalendarCard } from "./_components/calendar-card";
import { checkSubscription } from "@/utils/permissions/checkSubscripion";
import { LabelSubscription } from "@/components/ui/label-subscription";
import { requireActiveOrganization } from "@/lib/organization";
import { getDashboardOverview } from "./_data-access/get-dashboard-overview";
import { formatvalue } from "@/utils/formatValue";
import { cn } from "@/lib/utils";

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 0,
});

function firstName(name: string | null | undefined) {
  if (!name) return "";
  return name.trim().split(/\s+/)[0];
}

export default async function Dashboard() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const organization = await requireActiveOrganization();
  const subscription = await checkSubscription();
  const showOverview = subscription?.subscriptionStatus !== "EXPIRED";

  const overview = showOverview
    ? await getDashboardOverview({
        organizationId: organization.id,
        times: organization.times,
      })
    : null;

  const todayLabelRaw = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const todayLabel = todayLabelRaw.charAt(0).toUpperCase() + todayLabelRaw.slice(1);

  return (
    <main>
      <div className="flex items-start justify-between gap-3 md:items-end">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Olá, {firstName(session.user?.name) || "profissional"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{todayLabel}</p>
        </div>

        <ButtonShareLink organizationId={organization.id} />
      </div>

      {subscription?.subscriptionStatus === "EXPIRED" && (
        <LabelSubscription expired={true} />
      )}

      {subscription?.subscriptionStatus === "TRIAL" && (
        <div className="my-4 flex flex-col items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm md:flex-row md:items-center md:text-base">
          <PartyPopper className="h-5 w-5 shrink-0 text-primary" />
          <p className="font-medium text-foreground">
            {subscription?.message || "Seu período de teste está ativo!"}
          </p>
        </div>
      )}

      {overview && (
        <>
          <section className="my-6 space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="grid flex-1 grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-9 sm:w-9">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <span className="text-xs text-muted-foreground sm:text-sm">Hoje</span>
                  </div>
                  <p className="mt-3 font-mono text-xl font-bold text-foreground sm:text-2xl">
                    {overview.todaysCount}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">agendamentos</p>
                  {overview.todaysInProgressCount > 0 && (
                    <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {overview.todaysInProgressCount} em andamento
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-warm/10 text-accent-warm sm:h-9 sm:w-9">
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <span className="text-xs text-muted-foreground sm:text-sm">Pacientes</span>
                  </div>
                  <p className="mt-3 font-mono text-xl font-bold text-foreground sm:text-2xl">
                    {overview.patientsThisMonth}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">no mês</p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chart-4/10 text-chart-4 sm:h-9 sm:w-9">
                      <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <span className="text-xs text-muted-foreground sm:text-sm">
                      Faturamento (mês)
                    </span>
                  </div>
                  <p className="mt-3 font-mono text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                    {formatvalue(overview.revenueTotal.toString())}
                  </p>
                  {overview.revenueTrend !== null && (
                    <span
                      className={cn(
                        "mt-1 flex items-center gap-1 text-xs font-semibold",
                        overview.revenueTrend >= 0 ? "text-primary" : "text-destructive",
                      )}
                    >
                      {overview.revenueTrend >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {percentFormatter.format(Math.abs(overview.revenueTrend))}
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chart-5/10 text-chart-5 sm:h-9 sm:w-9">
                      <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <span className="text-xs text-muted-foreground sm:text-sm">
                      Ocupação da agenda
                    </span>
                  </div>
                  <p className="mt-3 font-mono text-xl font-bold text-foreground sm:text-2xl">
                    {overview.occupancyToday}%
                  </p>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${overview.occupancyToday}%` }}
                    />
                  </div>
                </div>
              </div>

              {subscription?.planId !== "PROFESSIONAL" && (
                <div className="hidden shrink-0 flex-col justify-between rounded-xl bg-sidebar p-5 text-sidebar-foreground lg:flex lg:w-64">
                  <div>
                    <Sparkles className="h-5 w-5" />
                    <h3 className="mt-3 font-display text-lg leading-tight font-bold">
                      Mais espaço para o seu negócio crescer
                    </h3>
                    <p className="mt-2 text-sm text-sidebar-foreground/80">
                      O plano Profissional libera até 60 clientes, 10 serviços e destaque na
                      busca.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/plans"
                    className="mt-4 inline-flex items-center justify-center rounded-lg bg-sidebar-foreground px-4 py-2 text-sm font-semibold text-sidebar transition-colors hover:bg-sidebar-foreground/90"
                  >
                    Ver planos
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="my-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <Agenda organizationId={organization.id} />
            <div className="flex flex-col gap-4 lg:h-[38rem]">
              <div className="hidden lg:block">
                <Suspense fallback={null}>
                  <CalendarCard />
                </Suspense>
              </div>
              <div className="min-h-0 lg:flex-1">
                <Reminders organizationId={organization.id} />
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
