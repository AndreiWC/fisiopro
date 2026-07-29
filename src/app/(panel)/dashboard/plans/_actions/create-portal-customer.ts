"use server";
import { auth } from "@/lib/auth";
import { stripe } from "@/utils/stripe";
import Prisma from "@/lib/prisma";
import { Plan } from "@/generated/prisma/browser";

export async function createPortalCustomer() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      sessionId: "",
      error: "Usuário não autenticado",
    };
  }

  const user = await Prisma.user.findFirst({
    where: {
      id: userId,
    },
  });

  if (!user) {
    return {
      sessionId: "",
      error: "Usuário não encontrado",
    };
  }
  const customerId = user.stripe_customer_id;

  if (!customerId) {
    return {
      sessionId: "",
      error: "Usuário não possui um ID de cliente Stripe",
    };
  }

  try {
    const stripeSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.STRIPE_SUCCESS_URL as string,
    });

    return {
      sessionId: stripeSession.url,
    };
  } catch (error) {
    console.error("Erro ao criar sessão do portal de clientes:", error);
    return {
      sessionId: "",
      error: "Erro ao criar sessão do portal de clientes",
    };
  }
}
