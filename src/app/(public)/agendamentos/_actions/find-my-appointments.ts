"use server";

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";

export type MyAppointment = Prisma.AppointmentsGetPayload<{
  include: {
    service: true;
    organization: {
      select: {
        id: true;
        name: true;
        image: true;
        phone: true;
        times: true;
        timezone: true;
      };
    };
  };
}>;

export async function findMyAppointments() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  try {
    const appointments = await prisma.appointments.findMany({
      where: { customer: { userId: session.user.id } },
      include: {
        service: true,
        organization: {
          select: { id: true, name: true, image: true, phone: true, times: true, timezone: true },
        },
      },
      orderBy: { AppointmentDate: "asc" },
    });

    return { data: appointments };
  } catch {
    return { error: "Erro ao buscar seus agendamentos" };
  }
}
