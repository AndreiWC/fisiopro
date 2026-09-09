"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/lib/auth";

const formSchema = z.object({
  appointmentId: z.string().min(1, "O ID do agendamento é obrigatório"),
  date: z.date(),
  time: z.string().min(1, "O horário é obrigatório"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function rescheduleMyAppointment(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  try {
    const appointment = await prisma.appointments.findUnique({
      where: { id: formData.appointmentId },
      select: { customer: { select: { userId: true } }, status: true },
    });

    if (!appointment || appointment.customer.userId !== session.user.id) {
      return { error: "Agendamento não encontrado para esta conta" };
    }

    if (appointment.status !== "CONFIRMED") {
      return { error: "Só é possível remarcar agendamentos confirmados" };
    }

    const year = formData.date.getFullYear();
    const month = formData.date.getMonth();
    const day = formData.date.getDate();
    const appointmentDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

    await prisma.appointments.update({
      where: { id: formData.appointmentId },
      data: { AppointmentDate: appointmentDate, time: formData.time },
    });

    return { data: "Agendamento remarcado com sucesso!" };
  } catch {
    return { error: "Erro ao remarcar agendamento" };
  }
}
