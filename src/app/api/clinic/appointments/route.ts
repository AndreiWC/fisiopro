import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import prisma from "@/lib/prisma";

export const GET = auth(async function GET(request) {
  if (!request.auth) {
    return NextResponse.json(
      { error: "Acesso Não Autorizado!" },
      { status: 401 },
    );
  }
  const searchParams = request.nextUrl.searchParams;
  const dateString = searchParams.get("date") as string;
  const clinicId = request.auth?.user?.id;

  if (!dateString) {
    return NextResponse.json({ error: "Data não encontrada" }, { status: 400 });
  }

  if (!clinicId) {
    return NextResponse.json(
      { error: "Usuário não encontrado" },
      { status: 400 },
    );
  }

  try {
    const [year, month, day] = dateString.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // Cria a data no formato UTC
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)); // Cria a data no formato UTC

    const appointments = await prisma.appointments.findMany({
      where: {
        userId: clinicId,
        AppointmentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: true,
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
