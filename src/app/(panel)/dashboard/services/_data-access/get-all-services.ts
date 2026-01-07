"use server";
import prisma from "@/lib/prisma";
import { error } from "console";

// roda no lado servidor

export async function getAllServices({ userId }: { userId: string }) {
  //lógica para buscar todos os serviços no banco de dados

  if (!userId) {
    return {
      error: "Usuário não autenticado",
    };
  }

  try {
    const services = await prisma.service.findMany({
      where: {
        userId: userId,
        status: true,
      },
    });

    return { data: services };
  } catch (err) {
    console.log("Erro ao buscar os serviços:", err);
    return { error: "Erro ao buscar os serviços" };
  }
}
