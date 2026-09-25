"use server";

import { differenceInCalendarDays, subDays } from "date-fns";
import prisma from "@/lib/prisma";
import { getPeriodRange, type FinancePeriod } from "../_lib/period";

interface GetFinancialSummaryParams {
  organizationId: string;
  period: FinancePeriod;
}

const TOP_SERVICES_LIMIT = 5;
const TOP_HOURS_LIMIT = 6;
const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

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
      time: true,
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

  // Cada bucket é comparado com o mesmo trecho do período anterior (deslocado pela duração do período).
  const shiftDays = differenceInCalendarDays(range.currentStart, range.previousStart);
  const inRange = (date: Date, start: Date, end: Date) => date >= start && date <= end;

  const revenueSeries = range.buckets.map((bucket) => {
    const previousStart = subDays(bucket.start, shiftDays);
    const previousEnd = subDays(bucket.end, shiftDays);
    return {
      label: bucket.label,
      revenue: completedCurrent
        .filter((a) => inRange(a.AppointmentDate, bucket.start, bucket.end))
        .reduce((sum, a) => sum + a.service.price, 0),
      previousRevenue: completedPrevious
        .filter((a) => inRange(a.AppointmentDate, previousStart, previousEnd))
        .reduce((sum, a) => sum + a.service.price, 0),
    };
  });

  const statusSeries = range.buckets.map((bucket) => ({
    label: bucket.label,
    completed: completedCurrent.filter((a) => inRange(a.AppointmentDate, bucket.start, bucket.end)).length,
    noShow: noShowCurrent.filter((a) => inRange(a.AppointmentDate, bucket.start, bucket.end)).length,
    cancelled: cancelledCurrent.filter((a) => inRange(a.AppointmentDate, bucket.start, bucket.end)).length,
  }));

  const weekdayStats = WEEKDAY_LABELS.map((label) => ({ label, revenue: 0, count: 0 }));
  const hourMap = new Map<number, { revenue: number; count: number }>();
  for (const appointment of completedCurrent) {
    const weekdayIndex = (appointment.AppointmentDate.getUTCDay() + 6) % 7;
    weekdayStats[weekdayIndex].revenue += appointment.service.price;
    weekdayStats[weekdayIndex].count += 1;

    const hour = Number.parseInt(appointment.time.split(":")[0] ?? "", 10);
    if (!Number.isNaN(hour)) {
      const entry = hourMap.get(hour) ?? { revenue: 0, count: 0 };
      entry.revenue += appointment.service.price;
      entry.count += 1;
      hourMap.set(hour, entry);
    }
  }
  const hourStats = Array.from(hourMap.entries())
    .map(([hour, value]) => ({ label: `${String(hour).padStart(2, "0")}h`, ...value }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, TOP_HOURS_LIMIT);

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
    revenuePrevious,
    revenueSeries,
    statusSeries,
    weekdayStats,
    hourStats,
  };
}

export type FinancialSummary = Awaited<ReturnType<typeof getFinancialSummary>>;
