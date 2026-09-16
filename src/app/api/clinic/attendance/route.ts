import { NextResponse } from "next/server";
import type { AppointmentStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getActiveOrganization } from "@/lib/organization";

const PENDING_STATUSES: AppointmentStatus[] = ["CONFIRMED", "IN_PROGRESS"];

export const GET = auth(async function GET(request) {
  if (!request.auth) {
    return NextResponse.json({ error: "Acesso Não Autorizado!" }, { status: 401 });
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return NextResponse.json(
      { error: "Nenhuma organização vinculada à conta" },
      { status: 400 },
    );
  }

  const scope = request.nextUrl.searchParams.get("scope") === "all" ? "all" : "pending";

  try {
    // Pendente = já devia ter acontecido (dia <= hoje, em UTC — mesmo padrão
    // de AppointmentDate) e ainda não foi fechado (Confirmado/Em atendimento).
    const now = new Date();
    const todayEnd = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
    );

    const appointments = await prisma.appointments.findMany({
      where:
        scope === "pending"
          ? {
              organizationId: organization.id,
              AppointmentDate: { lte: todayEnd },
              status: { in: PENDING_STATUSES },
            }
          : { organizationId: organization.id },
      include: { service: true, customer: true },
      orderBy:
        scope === "pending"
          ? [{ AppointmentDate: "asc" }, { time: "asc" }]
          : [{ AppointmentDate: "desc" }, { time: "desc" }],
      take: scope === "all" ? 200 : undefined,
    });

    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json({ error: "Falha ao buscar atendimentos" }, { status: 400 });
  }
});
