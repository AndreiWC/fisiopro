"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import getSession from "@/lib/getSession";
import { isAdminEmail } from "@/lib/require-admin";

const formSchema = z.object({
  organizationId: z.string().min(1),
  status: z.boolean(),
});

type FormSchema = z.infer<typeof formSchema>;

export async function toggleOrganizationStatus(formData: FormSchema) {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return { error: "Não autorizado" };
  }

  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: "Dados inválidos" };
  }

  try {
    await prisma.organization.update({
      where: { id: schema.data.organizationId },
      data: { status: schema.data.status },
    });
    revalidatePath("/admin/empresas");
    revalidatePath(`/admin/empresas/${schema.data.organizationId}`);
    return { data: "Status da empresa atualizado com sucesso" };
  } catch (error) {
    return { error: "Erro ao atualizar status da empresa" };
  }
}
