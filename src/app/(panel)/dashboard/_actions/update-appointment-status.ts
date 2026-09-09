"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";
import { getActiveOrganization } from "@/lib/organization";

const formSchema = z.object({
  appointmentId: z.string().min(1, "O ID do agendamento é obrigatório"),
  status: z.nativeEnum(AppointmentStatus),
});

type FormSchema = z.infer<typeof formSchema>;

export async function updateAppointmentStatus(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await prisma.appointments.update({
      where: {
        id: formData.appointmentId,
        organizationId: organization.id,
      },
      data: {
        status: formData.status,
      },
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/patients");
    return { data: "Status atualizado com sucesso!" };
  } catch (error) {
    return { error: "Erro ao atualizar status do agendamento" };
  }
}
