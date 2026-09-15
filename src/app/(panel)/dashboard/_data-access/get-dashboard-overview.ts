"use server";

import prisma from "@/lib/prisma";
import { getFinancialSummary } from "../financeiro/_data-access/get-financial-summary";
import { buildOccupantMap, computeOccupancyPercent } from "@/utils/slot-occupancy";

interface GetDashboardOverviewParams {
  organizationId: string;
  times: string[];
}

export async function getDashboardOverview({
  organizationId,
  times,
}: GetDashboardOverviewParams) {
  const now = new Date();
  // AppointmentDate é sempre salvo em UTC-meia-noite exata (ver day route),
  // então os limites de "hoje"/"este mês" precisam ser calculados em UTC a
  // partir da data local — usar startOfDay/startOfMonth (fuso local) desalinha
  // esses limites e faz agendamentos de hoje ficarem de fora da contagem.
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
  const todayStart = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
  );
  const todayEnd = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
  );

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

  // Mesma lógica de ocupação usada no dia selecionado da agenda (day-view,
  // que também não exclui nenhum status), aqui fixada em "hoje" para virar um KPI
  // de topo de página — os dois números precisam bater quando o dia selecionado é hoje.
  const occupantMap = buildOccupantMap(todaysAppointments, times);
  const occupancyToday = computeOccupancyPercent(occupantMap.size, times.length);
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
