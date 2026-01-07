"use server"; // roda no lado servidor
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ca } from "zod/v4/locales";

const formShema = z.object({
  serviceId: z.string().min(1, { message: "ID do serviço é obrigatório" }),
});

type formShema = z.infer<typeof formShema>;

export async function deleteServiceAction(formData: formShema) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }
  const schema = formShema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }
  try {
    await prisma.service.update({
      where: {
        id: formData.serviceId,
        userId: session?.user?.id,
      },
      data: {
        status: false,
      },
    });
    revalidatePath("/dashboard/services");
    return { data: "Serviço deletado com sucesso" };
  } catch (err) {
    console.log("Erro ao deletar o serviço:", err);
    return { error: "Erro ao deletar o serviço" };
  }
}
