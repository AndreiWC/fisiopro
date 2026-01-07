"use server"; // roda no lado servidor
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

import { revalidatePath } from "next/cache";
import { z } from "zod";

const formShema = z.object({
  name: z.string().min(1, { message: "O nome é obrigatório" }),
  address: z.string().optional(),
  phone: z.string().optional(),
  status: z.boolean(),
  timeZone: z.string(),
  times: z.array(z.string()),
});

type formShema = z.infer<typeof formShema>;

export async function updateProfileAction(formData: formShema) {
  const session = await auth();
  if (!session?.user?.id) {
    error: "Usuário não autenticado";
  }

  const schema = formShema.safeParse(formData);
  if (!schema.success) {
    error: "Dados inválidos";
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session?.user?.id },
      data: {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        status: formData.status,
        timezone: formData.timeZone,
        times: formData.times,
      },
    });

    revalidatePath("/dashboard/profile");

    return {
      data: "Perfil atualizado com sucesso",
    };
  } catch (err) {
    console.log("Erro ao atualizar o perfil:", err);
    return { error: "Erro ao atualizar o perfil" };
  }
}
