"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";

const formSchema = z.object({
  recordId: z.string().min(1, { message: "ID do registro é obrigatório" }),
  customerId: z.string().min(1, { message: "Paciente é obrigatório" }),
});

type FormSchema = z.infer<typeof formSchema>;

export async function deleteClinicalRecordAction(formData: FormSchema) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: "Dados inválidos" };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await prisma.clinicalRecord.update({
      where: {
        id: schema.data.recordId,
        organizationId: organization.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    revalidatePath(
      `/dashboard/patients/${schema.data.customerId}/prontuario`,
    );
    return { data: "Registro excluído com sucesso" };
  } catch (err) {
    return { error: "Erro ao excluir o registro" };
  }
}
