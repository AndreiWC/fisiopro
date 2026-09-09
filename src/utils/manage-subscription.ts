import prisma from "@/lib/prisma";
import { stripe } from "@/utils/stripe";
import Stripe from "stripe";
import { Plan } from "@prisma/client";
/**
 * Salvar atualizar ou deletar informações de assinatura da organização no banco de dados.
 */
export async function manageSubscription(
  subscriptionId: string,
  customerId: string,
  createAction = false,
  deleteAction = false,
  type?: Plan,
) {
  const findOrganization = await prisma.organization.findFirst({
    where: {
      stripe_customer_id: customerId,
    },
  });

  if (!findOrganization) {
    return Response.json({ error: "Organização não encontrada." }, { status: 404 });
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const subscriptionData = {
    id: subscription.id,
    status: subscription.status,
    Plan: type ?? "BASIC",
    priceId: subscription.items.data[0].price.id,
    organizationId: findOrganization.id,
  };

  // Se a ação for deletar uma assinatura, remova os dados do banco de dados
  if (subscriptionId && deleteAction) {
    await prisma.subscription.delete({
      where: {
        id: subscriptionId,
      },
    });

    return;
  }

  // Se a ação for criar uma nova assinatura, insira os dados no banco de dados
  if (createAction) {
    try {
      await prisma.subscription.create({
        data: {
          id: subscriptionData.id,
          status: subscriptionData.status,
          plan: subscriptionData.Plan,
          priceId: subscriptionData.priceId,
          organizationId: subscriptionData.organizationId,
        },
      });
    } catch (error) {
      console.error("Erro ao criar assinatura no banco de dados:", error);
      throw new Error("Erro ao criar assinatura no banco de dados.");
    }
  } else {
    try {
      const findSubscription = await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
        },
      });

      if (!findSubscription) return;

      await prisma.subscription.update({
        where: {
          id: subscriptionId,
        },
        data: {
          status: subscriptionData.status,
          priceId: subscriptionData.priceId,
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar assinatura no banco de dados:", error);
    }
  }
}
