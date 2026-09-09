import prisma from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const dateParm = searchParams.get("date");
  const excludeAppointmentId = searchParams.get("excludeAppointmentId");

  if (!organizationId || !dateParm || organizationId === "null" || dateParm === "null") {
    return NextResponse.json(
      { error: "Nenhum agendamento encontrado" },
      { status: 400 },
    );
  }

  try {
    const [year, month, day] = dateParm.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const organization = await prisma.organization.findFirst({
      where: { id: organizationId || undefined },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organização não encontrada" },
        { status: 400 },
      );
    }

    const appointments = await prisma.appointments.findMany({
      where: {
        organizationId: organizationId || undefined,
        status: { not: "CANCELLED" },
        AppointmentDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      include: {
        service: true,
      },
    });

    const blockSlotes = new Set<string>();
    for (const appointment of appointments) {
      const requiredSlots = Math.ceil(appointment.service.duration / 30);
      const startIndex = organization.times.indexOf(appointment.time);

      if (startIndex !== -1) {
        for (let i = 0; i < requiredSlots; i++) {
          const blockedSlot = organization.times[startIndex + i];
          if (blockedSlot) {
            blockSlotes.add(blockedSlot);
          }
        }
      }
    }
    const blockedTimes = Array.from(blockSlotes);
    return NextResponse.json(blockedTimes);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar agendamentos" },
      { status: 400 },
    );
  }
}
