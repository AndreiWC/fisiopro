"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { getPatientSessionData } from "@/lib/patient-session";

const formSchema = z.object({
  appointmentId: z.string().min(1, "O ID do agendamento é obrigatório"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function cancelMyAppointment(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const session = await getPatientSessionData();
  if (!session) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  try {
    const appointment = await prisma.appointments.findUnique({
      where: { id: formData.appointmentId },
      select: { email: true },
    });

    if (
      !appointment ||
      appointment.email.toLowerCase() !== session.email.toLowerCase()
    ) {
      return { error: "Agendamento não encontrado para este e-mail" };
    }

    await prisma.appointments.update({
      where: { id: formData.appointmentId },
      data: { status: "CANCELLED" },
    });

    return { data: "Agendamento cancelado com sucesso!" };
  } catch {
    return { error: "Erro ao cancelar agendamento" };
  }
}
