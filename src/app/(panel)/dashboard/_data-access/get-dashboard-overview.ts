"use server";

import prisma from "@/lib/prisma";
import { startOfDay, startOfMonth, endOfDay } from "date-fns";
import { getFinancialSummary } from "../financeiro/_data-access/get-financial-summary";

interface GetDashboardOverviewParams {
  organizationId: string;
  times: string[];
}

export async function getDashboardOverview({
  organizationId,
  times,
}: GetDashboardOverviewParams) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [financial, patientsThisMonth, todaysAppointments] = await Promise.all([
    getFinancialSummary({ organizationId, period: "ESTE_MES" }),
    prisma.customer.count({
      where: {
        organizationId,
        appointments: { some: { AppointmentDate: { gte: monthStart } } },
      },
    }),
    prisma.appointments.findMany({
      where: {
        organizationId,
        AppointmentDate: { gte: todayStart, lte: todayEnd },
      },
      select: { time: true, status: true, service: { select: { duration: true } } },
    }),
  ]);

  // Mesma lógica de ocupação usada no dia selecionado da agenda (appointments-list,
  // que também não exclui nenhum status), aqui fixada em "hoje" para virar um KPI
  // de topo de página — os dois números precisam bater quando o dia selecionado é hoje.
  const occupiedSlots = new Set<string>();
  for (const appointment of todaysAppointments) {
    const requiredSlots = Math.ceil(appointment.service.duration / 30);
    const startIndex = times.indexOf(appointment.time);
    if (startIndex === -1) continue;
    for (let i = 0; i < requiredSlots; i++) {
      const slot = times[startIndex + i];
      if (slot) occupiedSlots.add(slot);
    }
  }
  const occupancyToday =
    times.length > 0 ? Math.round((occupiedSlots.size / times.length) * 100) : 0;
  const todaysInProgressCount = todaysAppointments.filter(
    (appointment) => appointment.status === "IN_PROGRESS",
  ).length;

  return {
    revenueTotal: financial.revenueTotal,
    revenueTrend: financial.revenueTrend,
    patientsThisMonth,
    occupancyToday,
    todaysCount: todaysAppointments.length,
    todaysInProgressCount,
  };
}

export type DashboardOverview = Awaited<ReturnType<typeof getDashboardOverview>>;
