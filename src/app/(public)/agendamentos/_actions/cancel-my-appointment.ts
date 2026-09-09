"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/lib/auth";

const formSchema = z.object({
  appointmentId: z.string().min(1, "O ID do agendamento é obrigatório"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function cancelMyAppointment(formData: FormSchema) {
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
      select: { customer: { select: { userId: true } } },
    });

    if (!appointment || appointment.customer.userId !== session.user.id) {
      return { error: "Agendamento não encontrado para esta conta" };
    }

    await prisma.appointments.update({
      where: { id: formData.appointmentId },
      data: { status: "CANCELLED" },
    });

    return { data: "Agendamento cancelado com sucesso!" };
  } catch (err) {
    console.error(err);
    return { error: "Erro ao cancelar agendamento" };
  }
}
