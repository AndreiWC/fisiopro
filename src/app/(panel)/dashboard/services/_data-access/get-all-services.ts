"use server";
import prisma from "@/lib/prisma";

// roda no lado servidor

export async function getAllServices({ organizationId }: { organizationId: string }) {
  //lógica para buscar todos os serviços no banco de dados

  if (!organizationId) {
    return {
      error: "Nenhuma organização vinculada à sua conta",
    };
  }

  try {
    const services = await prisma.service.findMany({
      where: {
        organizationId: organizationId,
        status: true,
      },
    });

    return { data: services };
  } catch (err) {
    return { error: "Erro ao buscar os serviços" };
  }
}
