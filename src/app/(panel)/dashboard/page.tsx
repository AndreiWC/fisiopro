import { Button } from "@/components/ui/button";
import getSession from "@/lib/getSession";
import { Calendar, PartyPopper, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonCopyLink } from "./_components/button-copy-link";
import { Reminders } from "./_components/reminder/reminders";
import { Appointments } from "./_components/appointments/appointments";
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

const OCCUPANCY_VIEWBOX = 56;
const OCCUPANCY_RADIUS = 24;
const OCCUPANCY_CIRCUMFERENCE = 2 * Math.PI * OCCUPANCY_RADIUS;

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
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Olá, {firstName(session.user?.name) || "profissional"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{todayLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/clinica/${organization.id}`} target="_blank" className="flex-1 sm:flex-none">
            <Button size="lg" className="w-full gap-2 px-6 sm:w-auto">
              <Calendar className="h-5 w-5" />
              <span>Novo agendamento</span>
            </Button>
          </Link>

          <ButtonCopyLink organizationId={organization.id} />
        </div>
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
          <div className="my-6 grid grid-cols-3 gap-2 sm:gap-4">
            <div className="flex flex-col items-center rounded-xl border border-border bg-card p-3 text-center sm:p-5">
              <p className="text-[11px] text-muted-foreground sm:text-sm">faturamento este mês</p>
              <div className="mt-2 flex flex-wrap items-baseline justify-center gap-1.5 sm:mt-3 sm:gap-2">
                <span className="font-mono text-lg font-semibold tabular-nums text-foreground sm:text-2xl">
                  {formatvalue(overview.revenueTotal.toString())}
                </span>
                {overview.revenueTrend !== null && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[10px] font-semibold sm:gap-1 sm:text-sm",
                      overview.revenueTrend >= 0 ? "text-primary" : "text-destructive",
                    )}
                  >
                    {overview.revenueTrend >= 0 ? (
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    {percentFormatter.format(Math.abs(overview.revenueTrend))}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center rounded-xl border border-border bg-card p-3 text-center sm:p-5">
              <p className="text-[11px] text-muted-foreground sm:text-sm">ocupação da agenda hoje</p>
              <div className="mt-2 sm:mt-3">
                <OccupancyRing
                  value={overview.occupancyToday}
                  sizeClassName="h-10 w-10 sm:h-14 sm:w-14"
                  textClassName="text-[10px] sm:text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col items-center rounded-xl border border-border bg-card p-3 text-center sm:p-5">
              <p className="text-[11px] text-muted-foreground sm:text-sm">pacientes este mês</p>
              <p className="mt-2 font-mono text-lg font-semibold text-foreground sm:mt-3 sm:text-2xl">
                {overview.patientsThisMonth}
              </p>
            </div>
          </div>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Appointments organizationId={organization.id} />
            <div className="flex flex-col gap-4">
              <div className="hidden lg:block">
                <Suspense fallback={null}>
                  <CalendarCard />
                </Suspense>
              </div>
              <Reminders organizationId={organization.id} />
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function OccupancyRing({
  value,
  sizeClassName = "h-14 w-14",
  textClassName = "text-sm",
}: {
  value: number;
  sizeClassName?: string;
  textClassName?: string;
}) {
  const dashOffset = OCCUPANCY_CIRCUMFERENCE * (1 - value / 100);
  const center = OCCUPANCY_VIEWBOX / 2;

  return (
    <div className={cn("relative shrink-0", sizeClassName)}>
      <svg
        viewBox={`0 0 ${OCCUPANCY_VIEWBOX} ${OCCUPANCY_VIEWBOX}`}
        className={cn("-rotate-90", sizeClassName)}
      >
        <circle
          cx={center}
          cy={center}
          r={OCCUPANCY_RADIUS}
          strokeWidth="6"
          className="fill-none stroke-muted"
        />
        <circle
          cx={center}
          cy={center}
          r={OCCUPANCY_RADIUS}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={OCCUPANCY_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="fill-none stroke-primary"
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-mono font-semibold text-foreground",
          textClassName,
        )}
      >
        {value}%
      </span>
    </div>
  );
}
