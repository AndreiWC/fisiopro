"use server";
import prisma from "@/lib/prisma";

export async function getPatients({ userId }: { userId: string }) {
  try {
    if (!userId) return [];

    const customers = await prisma.customer.findMany({
      where: { userId },
      include: {
        appointments: {
          include: { service: true },
          orderBy: { AppointmentDate: "desc" },
        },
      },
    });

    const patients = customers.map((customer) => {
      const visits = customer.appointments.filter(
        (a) => a.status !== "CANCELLED",
      );
      const lastVisit = visits[0] ?? null;
      const sessionsCompleted = customer.appointments.filter(
        (a) => a.status === "COMPLETED",
      ).length;
      const missedCount = customer.appointments.filter(
        (a) => a.status === "NO_SHOW",
      ).length;

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        treatmentStatus: customer.treatmentStatus,
        lastVisitDate: lastVisit?.AppointmentDate ?? null,
        lastServiceName: lastVisit?.service.name ?? null,
        sessionsCompleted,
        missedCount,
        totalAppointments: customer.appointments.length,
      };
    });

    patients.sort((a, b) => {
      if (!a.lastVisitDate && !b.lastVisitDate) return 0;
      if (!a.lastVisitDate) return 1;
      if (!b.lastVisitDate) return -1;
      return (
        new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime()
      );
    });

    return patients;
  } catch (err) {
    console.error(err);
    return [];
  }
}

export type Patient = Awaited<ReturnType<typeof getPatients>>[number];
