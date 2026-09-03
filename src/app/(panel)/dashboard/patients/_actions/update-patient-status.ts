"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CustomerStatus } from "@prisma/client";

const formSchema = z.object({
  customerId: z.string().min(1, "O ID do paciente é obrigatório"),
  treatmentStatus: z.nativeEnum(CustomerStatus),
});

type FormSchema = z.infer<typeof formSchema>;

export async function updatePatientStatus(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  try {
    await prisma.customer.update({
      where: {
        id: formData.customerId,
        userId: session.user.id,
      },
      data: {
        treatmentStatus: formData.treatmentStatus,
      },
    });
    revalidatePath("/dashboard/patients");
    return { data: "Status do paciente atualizado com sucesso!" };
  } catch (error) {
    return { error: "Erro ao atualizar status do paciente" };
  }
}
