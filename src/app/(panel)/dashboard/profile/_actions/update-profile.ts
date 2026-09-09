"use server"; // roda no lado servidor
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Segment } from "@prisma/client";
import { getActiveOrganization } from "@/lib/organization";

const formShema = z.object({
  name: z.string().min(1, { message: "O nome é obrigatório" }),
  address: z.string().optional(),
  phone: z.string().optional(),
  status: z.boolean(),
  segment: z.nativeEnum(Segment).optional(),
  professionalRegistration: z.string().optional(),
  timeZone: z.string(),
  times: z.array(z.string()),
});

type formShema = z.infer<typeof formShema>;

export async function updateProfileAction(formData: formShema) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const schema = formShema.safeParse(formData);
  if (!schema.success) {
    return { error: "Dados inválidos" };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        status: formData.status,
        segment: formData.segment,
        professionalRegistration: formData.professionalRegistration,
        timezone: formData.timeZone,
        times: formData.times,
      },
    });

    revalidatePath("/dashboard/profile");

    return {
      data: "Perfil atualizado com sucesso",
    };
  } catch (err) {
    return { error: "Erro ao atualizar o perfil" };
  }
}
