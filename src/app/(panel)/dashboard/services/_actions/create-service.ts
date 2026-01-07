"use server"; // roda no lado servidor
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ca } from "zod/v4/locales";

const formShema = z.object({
  name: z.string().min(1, { message: "O nome do serviço é obrigatório" }),
  price: z.number().min(1, { message: "O preço do serviço é obrigatório" }),
  duration: z.number(),
});

type formShema = z.infer<typeof formShema>;

export async function createServiceAction(formData: formShema) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const schema = formShema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  try {
    const newService = await prisma.service.create({
      data: {
        name: formData.name,
        price: formData.price,
        duration: formData.duration,
        userId: session?.user?.id,
      },
    });

    revalidatePath("/dashboard/services");

    return { service: newService };
  } catch (err) {
    console.log("Erro ao criar o serviço:", err);
    return { error: "Erro ao criar o serviço" };
  }
}
