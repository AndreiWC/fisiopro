"use server";

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getPatientSessionData } from "@/lib/patient-session";

export type MyAppointment = Prisma.AppointmentsGetPayload<{
  include: {
    service: true;
    user: {
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
  const session = await getPatientSessionData();
  if (!session) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  try {
    const appointments = await prisma.appointments.findMany({
      where: {
        email: { equals: session.email, mode: "insensitive" },
      },
      include: {
        service: true,
        user: {
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
