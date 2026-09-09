"use server";
import prisma from "@/lib/prisma";

export async function getSubscription({ organizationId }: { organizationId: string }) {
  if (!organizationId) {
    return null;
  }
  try {
    const subscriptions = await prisma.subscription.findFirst({
      where: {
        organizationId: organizationId,
      },
    });

    return subscriptions;
  } catch (error) {
    console.error("Erro ao buscar assinaturas:", error);
    return null;
  }
}
