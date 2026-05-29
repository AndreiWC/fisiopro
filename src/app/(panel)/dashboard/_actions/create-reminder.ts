"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const formSchema = z.object({
  description: z.string().min(1, "A descrição do lembrete é obrigatória"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function createReminder(formData: FormSchema) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "Usuário não autenticado",
    };
  }

  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return {
      error: "Dados inválidos",
    };
  }

  try {
    const reminder = await prisma.reminder.create({
      data: {
        description: formData.description,
        userId: session?.user?.id,
      },
    });
    revalidatePath("/dashboard");
    return {
      data: "Lembrete criado com sucesso!",
    };
  } catch (error) {
    return {
      error: "Erro ao criar lembrete",
    };
  }
}
