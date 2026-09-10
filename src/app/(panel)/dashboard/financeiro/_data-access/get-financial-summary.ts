"use server";

import prisma from "@/lib/prisma";
import { getPeriodRange, type FinancePeriod } from "../_lib/period";

interface GetFinancialSummaryParams {
  organizationId: string;
  period: FinancePeriod;
}

const TOP_SERVICES_LIMIT = 5;

export async function getFinancialSummary({ organizationId, period }: GetFinancialSummaryParams) {
  const range = getPeriodRange(period);

  const appointments = await prisma.appointments.findMany({
    where: {
      organizationId,
      AppointmentDate: { gte: range.previousStart, lte: range.currentEnd },
      status: { in: ["COMPLETED", "NO_SHOW", "CANCELLED"] },
    },
    select: {
      AppointmentDate: true,
      status: true,
      service: { select: { name: true, price: true } },
    },
  });

  const current = appointments.filter(
    (a) => a.AppointmentDate >= range.currentStart && a.AppointmentDate <= range.currentEnd,
  );
  const previous = appointments.filter(
    (a) => a.AppointmentDate >= range.previousStart && a.AppointmentDate <= range.previousEnd,
  );

  const completedCurrent = current.filter((a) => a.status === "COMPLETED");
  const completedPrevious = previous.filter((a) => a.status === "COMPLETED");
  const noShowCurrent = current.filter((a) => a.status === "NO_SHOW");
  const cancelledCurrent = current.filter((a) => a.status === "CANCELLED");

  const revenueTotal = completedCurrent.reduce((sum, a) => sum + a.service.price, 0);
  const revenuePrevious = completedPrevious.reduce((sum, a) => sum + a.service.price, 0);
  const revenueTrend = revenuePrevious > 0 ? (revenueTotal - revenuePrevious) / revenuePrevious : null;

  const appointmentsCompletedCount = completedCurrent.length;
  const averageTicket =
    appointmentsCompletedCount > 0 ? Math.round(revenueTotal / appointmentsCompletedCount) : 0;

  const lostRevenue = [...noShowCurrent, ...cancelledCurrent].reduce((sum, a) => sum + a.service.price, 0);
  const attendanceRate =
    appointmentsCompletedCount + noShowCurrent.length > 0
      ? appointmentsCompletedCount / (appointmentsCompletedCount + noShowCurrent.length)
      : null;

  const revenueByServiceMap = new Map<string, number>();
  for (const appointment of completedCurrent) {
    const name = appointment.service.name;
    revenueByServiceMap.set(name, (revenueByServiceMap.get(name) ?? 0) + appointment.service.price);
  }
  const revenueByServiceSorted = Array.from(revenueByServiceMap.entries())
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const topServices = revenueByServiceSorted.slice(0, TOP_SERVICES_LIMIT);
  const otherServicesRevenue = revenueByServiceSorted
    .slice(TOP_SERVICES_LIMIT)
    .reduce((sum, item) => sum + item.revenue, 0);
  const revenueByService =
    otherServicesRevenue > 0 ? [...topServices, { name: "Outros", revenue: otherServicesRevenue }] : topServices;

  const revenueSeries = range.buckets.map((bucket) => ({
    label: bucket.label,
    revenue: completedCurrent
      .filter((a) => a.AppointmentDate >= bucket.start && a.AppointmentDate <= bucket.end)
      .reduce((sum, a) => sum + a.service.price, 0),
  }));

  const appointmentsSeries = range.buckets.map((bucket) => ({
    label: bucket.label,
    count: completedCurrent.filter(
      (a) => a.AppointmentDate >= bucket.start && a.AppointmentDate <= bucket.end,
    ).length,
  }));

  return {
    period,
    revenueTotal,
    revenueTrend,
    averageTicket,
    appointmentsCompletedCount,
    noShowCount: noShowCurrent.length,
    cancelledCount: cancelledCurrent.length,
    lostRevenue,
    attendanceRate,
    revenueByService,
    revenueSeries,
    appointmentsSeries,
  };
}

export type FinancialSummary = Awaited<ReturnType<typeof getFinancialSummary>>;
