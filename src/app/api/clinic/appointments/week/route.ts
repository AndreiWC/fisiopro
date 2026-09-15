import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getActiveOrganization } from "@/lib/organization";
import { getWeekBoundsUTC } from "@/utils/date-range";

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
    const { weekStart, weekEnd } = getWeekBoundsUTC(dateString);

    // Inclui cancelados: eles não ocupam horário na grade (o front filtra), mas
    // entram na contagem do indicador "Cancelados" do resumo da semana.
    const appointments = await prisma.appointments.findMany({
      where: {
        organizationId: organization.id,
        AppointmentDate: { gte: weekStart, lte: weekEnd },
      },
      include: { service: true, customer: true },
      orderBy: [{ AppointmentDate: "asc" }, { time: "asc" }],
    });

    return NextResponse.json({ weekStart, weekEnd, appointments });
  } catch (error) {
    return NextResponse.json(
      { error: "Falha ao buscar a agenda da semana" },
      { status: 400 },
    );
  }
});
