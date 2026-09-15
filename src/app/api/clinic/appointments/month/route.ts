import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { AppointmentStatus } from "@prisma/client";
import { getActiveOrganization } from "@/lib/organization";
import { getMonthBoundsUTC } from "@/utils/date-range";
import { buildOccupantMap, computeOccupancyPercent } from "@/utils/slot-occupancy";

const EMPTY_STATUS_TALLY: Record<AppointmentStatus, number> = {
  CONFIRMED: 0,
  IN_PROGRESS: 0,
  COMPLETED: 0,
  NO_SHOW: 0,
  CANCELLED: 0,
};

export const GET = auth(async function GET(request) {
  if (!request.auth) {
    return NextResponse.json({ error: "Acesso Não Autorizado!" }, { status: 401 });
  }

  const dateString = request.nextUrl.searchParams.get("date");
  if (!dateString) {
    return NextResponse.json({ error: "Data não encontrada" }, { status: 400 });
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return NextResponse.json(
      { error: "Nenhuma organização vinculada à conta" },
      { status: 400 },
    );
  }

  try {
    const { monthStart, monthEnd } = getMonthBoundsUTC(dateString);

    // Seleção enxuta: sem customer, sem nome/preço além do necessário — essa rota só
    // alimenta os contadores por dia do calendário mensal, nunca a lista de pacientes.
    const appointments = await prisma.appointments.findMany({
      where: {
        organizationId: organization.id,
        AppointmentDate: { gte: monthStart, lte: monthEnd },
      },
      select: {
        AppointmentDate: true,
        time: true,
        status: true,
        service: { select: { duration: true, price: true } },
      },
    });

    const byDay = new Map<string, typeof appointments>();
    for (const appointment of appointments) {
      const key = appointment.AppointmentDate.toISOString().slice(0, 10);
      const list = byDay.get(key);
      if (list) {
        list.push(appointment);
      } else {
        byDay.set(key, [appointment]);
      }
    }

    const days = [];
    for (
      const day = new Date(monthStart);
      day <= monthEnd;
      day.setUTCDate(day.getUTCDate() + 1)
    ) {
      const key = day.toISOString().slice(0, 10);
      const dayAppointments = byDay.get(key) ?? [];
      // Cancelados não ocupam horário nem entram no previsto — só contam no tally.
      const activeAppointments = dayAppointments.filter((a) => a.status !== "CANCELLED");
      const occupantMap = buildOccupantMap(activeAppointments, organization.times);

      const byStatus = { ...EMPTY_STATUS_TALLY };
      for (const appointment of dayAppointments) {
        byStatus[appointment.status]++;
      }
      let revenueProjected = 0;
      for (const appointment of activeAppointments) {
        if (appointment.status !== "NO_SHOW") {
          revenueProjected += appointment.service.price;
        }
      }

      days.push({
        date: key,
        total: dayAppointments.length,
        byStatus,
        occupancyPercent: computeOccupancyPercent(occupantMap.size, organization.times.length),
        revenueProjected,
      });
    }

    return NextResponse.json({ monthStart, monthEnd, days });
  } catch (error) {
    return NextResponse.json(
      { error: "Falha ao buscar o resumo do mês" },
      { status: 400 },
    );
  }
});
