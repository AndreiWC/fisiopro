"use server";
import prisma from "@/lib/prisma";
import { addDays, differenceInDays, isAfter } from "date-fns";
import { TRIAL_PERIOD_DAYS } from "@/utils/permissions/trial-limits";

export async function checkSubscription(userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    include: {
      subscription: true,
    },
  });

  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  if (user.subscription && user.subscription.status === "active") {
    return {
      subscriptionStatus: "active",
      message: "Assinatura ativa. Acesso completo aos recursos.",
      planId: user.subscription.plan,
    };
  }

  const trialEndDate = addDays(user.createdAt, TRIAL_PERIOD_DAYS);

  if (isAfter(new Date(), trialEndDate)) {
    return {
      subscriptionStatus: "EXPIRED",
      message:
        "O período de teste expirou. Por favor, atualize para um plano pago.",
      planId: "TRIAL",
    };
  }
  const dayRemaining = differenceInDays(trialEndDate, new Date());
  return {
    subscriptionStatus: "TRIAL",
    message: `Você está no período de teste. Aproveite todos os recursos disponíveis. Faltam ${dayRemaining} dias para o término do período de teste.`,
    planId: "TRIAL",
  };
}
