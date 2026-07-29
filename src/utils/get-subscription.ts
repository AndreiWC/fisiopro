"use server";
import prisma from "@/lib/prisma";

export async function getSubscription({ userId }: { userId: string }) {
  if (!userId) {
    return null;
  }
  try {
    const subscriptions = await prisma.subscription.findFirst({
      where: {
        userId: userId,
      },
    });

    return subscriptions;
  } catch (error) {
    console.error("Erro ao buscar assinaturas:", error);
    return null;
  }
}
