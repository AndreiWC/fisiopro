import prisma from "@/lib/prisma";
import { ok } from "assert";
import { NextResponse, NextRequest } from "next/server";
import { use } from "react";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const dateParm = searchParams.get("date");
  const excludeAppointmentId = searchParams.get("excludeAppointmentId");

  if (!userId || !dateParm || userId === "null" || dateParm === "null") {
    return NextResponse.json(
      { error: "Nenhum agendamento encontrado" },
      { status: 400 },
    );
  }

  try {
    const [year, month, day] = dateParm.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const user = await prisma.user.findFirst({
      where: { id: userId || undefined },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 400 },
      );
    }

    const appointments = await prisma.appointments.findMany({
      where: {
        userId: userId || undefined,
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
      const startIndex = user.times.indexOf(appointment.time);

      if (startIndex !== -1) {
        for (let i = 0; i < requiredSlots; i++) {
          const blockedSlot = user.times[startIndex + i];
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
