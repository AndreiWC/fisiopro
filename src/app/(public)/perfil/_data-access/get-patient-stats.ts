"use server";

import prisma from "@/lib/prisma";

export async function getPatientStats(userId: string) {
  const appointments = await prisma.appointments.findMany({
    where: { customer: { userId } },
    select: { status: true, organizationId: true, AppointmentDate: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessionsCompleted = appointments.filter((a) => a.status === "COMPLETED").length;
  const noShowCount = appointments.filter((a) => a.status === "NO_SHOW").length;
  const activeAppointments = appointments.filter(
    (a) =>
      (a.status === "CONFIRMED" || a.status === "IN_PROGRESS") &&
      a.AppointmentDate >= today,
  ).length;
  const activeClinics = new Set(appointments.map((a) => a.organizationId)).size;

  const attendanceDenominator = sessionsCompleted + noShowCount;
  const attendanceRate =
    attendanceDenominator > 0
      ? Math.round((sessionsCompleted / attendanceDenominator) * 100)
      : null;

  return { sessionsCompleted, activeAppointments, activeClinics, attendanceRate };
}
