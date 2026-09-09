"use server";

import Prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getActiveOrganization } from "@/lib/organization";

export async function updateProfileAvatar({
  avatarUrl,
}: {
  avatarUrl: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "Usuário não autenticado",
    };
  }
  if (!avatarUrl) {
    return {
      error: "Falha ao alterar imagem",
    };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await Prisma.organization.update({
      where: {
        id: organization.id,
      },
      data: {
        image: avatarUrl,
      },
    });

    revalidatePath("/dashboard/profile");

    return {
      data: "Imagem alterada com sucesso",
    };
  } catch (err) {
    return {
      error: "Falha ao alterar imagem",
    };
  }
}
