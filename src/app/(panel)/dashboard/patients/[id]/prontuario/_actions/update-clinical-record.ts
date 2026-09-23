"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";

const formSchema = z.object({
  recordId: z.string().min(1, { message: "ID do registro é obrigatório" }),
  customerId: z.string().min(1, { message: "Paciente é obrigatório" }),
  note: z.string().min(1, { message: "Descreva o que ocorreu na sessão" }),
  sessionDate: z.string().min(1, { message: "Selecione a data da sessão" }),
  images: z
    .array(z.string())
    .max(3, { message: "No máximo 3 imagens por anotação" }),
});

type FormSchema = z.infer<typeof formSchema>;

export async function updateClinicalRecordAction(formData: FormSchema) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
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
        note: schema.data.note,
        sessionDate: new Date(schema.data.sessionDate),
        images: schema.data.images,
      },
    });
    revalidatePath(
      `/dashboard/patients/${schema.data.customerId}/prontuario`,
    );
    return { data: "Registro atualizado com sucesso" };
  } catch (err) {
    return { error: "Erro ao atualizar o registro" };
  }
}
