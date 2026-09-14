"use server";
import prisma from "@/lib/prisma";

export async function getPatients({ organizationId }: { organizationId: string }) {
  try {
    if (!organizationId) return [];

    const customers = await prisma.customer.findMany({
      where: { organizationId },
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
        image: customer.image,
        cpf: customer.cpf,
        address: customer.address,
        treatmentStatus: customer.treatmentStatus,
        lastVisitDate: lastVisit?.AppointmentDate ?? null,
        lastServiceName: lastVisit?.service.name ?? null,
        sessionsCompleted,
        missedCount,
        totalAppointments: customer.appointments.length,
        history: customer.appointments.map((appointment) => ({
          id: appointment.id,
          date: appointment.AppointmentDate,
          time: appointment.time,
          status: appointment.status,
          serviceName: appointment.service.name,
          servicePrice: appointment.service.price,
          serviceDuration: appointment.service.duration,
        })),
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
