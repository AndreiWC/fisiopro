"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";
import { canPermissions } from "@/utils/permissions/canPermissions";

const formSchema = z.object({
  customerId: z.string().min(1, { message: "Paciente é obrigatório" }),
  note: z.string().min(1, { message: "Descreva o que ocorreu na sessão" }),
  sessionDate: z.string().min(1, { message: "Selecione a data da sessão" }),
  images: z
    .array(z.string())
    .max(3, { message: "No máximo 3 imagens por anotação" }),
});

type FormSchema = z.infer<typeof formSchema>;

export async function createClinicalRecordAction(formData: FormSchema) {
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

  const customer = await prisma.customer.findFirst({
    where: { id: schema.data.customerId, organizationId: organization.id },
    select: { id: true },
  });
  if (!customer) {
    return { error: "Paciente não encontrado" };
  }

  const permission = await canPermissions({ type: "clinicalRecord" });
  if (!permission.hasPermission) {
    return { error: "Limite de registros do seu plano atingido" };
  }

  try {
    await prisma.clinicalRecord.create({
      data: {
        note: schema.data.note,
        sessionDate: new Date(schema.data.sessionDate),
        images: schema.data.images,
        customerId: schema.data.customerId,
        organizationId: organization.id,
        authorId: session.user.id,
      },
    });
    revalidatePath(
      `/dashboard/patients/${schema.data.customerId}/prontuario`,
    );
    return { data: "Registro adicionado ao prontuário" };
  } catch (err) {
    return { error: "Erro ao salvar o registro" };
  }
}
