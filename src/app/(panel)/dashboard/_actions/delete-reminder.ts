"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";

const formSchema = z.object({
  reminderId: z.string().min(1, "O ID do lembrete é obrigatório"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function deleteReminder(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return {
      error: schema.error.issues[0].message,
    };
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
    await prisma.reminder.delete({
      where: {
        id: formData.reminderId,
        organizationId: organization.id,
      },
    });

    revalidatePath("/dashboard");
    return { data: "Lembrete deletado com sucesso" };
  } catch (err) {
    return {
      error: "Erro ao deletar lembrete: " + (err as any).message,
    };
  }
}
