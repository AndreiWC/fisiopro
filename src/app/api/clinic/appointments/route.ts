import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import prisma from "@/lib/prisma";
import { getActiveOrganization } from "@/lib/organization";

export const GET = auth(async function GET(request) {
  if (!request.auth) {
    return NextResponse.json(
      { error: "Acesso Não Autorizado!" },
      { status: 401 },
    );
  }
  const searchParams = request.nextUrl.searchParams;
  const dateString = searchParams.get("date") as string;

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
    const [year, month, day] = dateString.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // Cria a data no formato UTC
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)); // Cria a data no formato UTC

    const appointments = await prisma.appointments.findMany({
      where: {
        organizationId: organization.id,
        status: { not: "CANCELLED" },
        AppointmentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: true,
        customer: true,
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json(
      { error: "Falha ai buscar agendamentos" },
      { status: 400 },
    );
  }
});
