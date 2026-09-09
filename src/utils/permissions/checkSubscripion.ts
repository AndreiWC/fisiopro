"use server";
import prisma from "@/lib/prisma";
import { addDays, differenceInDays, isAfter } from "date-fns";
import { TRIAL_PERIOD_DAYS } from "@/utils/permissions/trial-limits";
import { requireActiveOrganization } from "@/lib/organization";

export async function checkSubscription() {
  const organization = await requireActiveOrganization();

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: organization.id },
  });

  if (subscription && subscription.status === "active") {
    return {
      subscriptionStatus: "active",
      message: "Assinatura ativa. Acesso completo aos recursos.",
      planId: subscription.plan,
    };
  }

  const trialEndDate = addDays(organization.createdAt, TRIAL_PERIOD_DAYS);

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
