"use server";
import { auth } from "@/lib/auth";
import { stripe } from "@/utils/stripe";
import Prisma from "@/lib/prisma";
import { Plan } from "@prisma/client";
import { requireActiveOrganization } from "@/lib/organization";

interface CreateSubscriptionProps {
  type: Plan;
}

export async function createSubscription({ type }: CreateSubscriptionProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      sessionId: "",
      error: "Usuário não autenticado. Faça login para continuar.",
    };
  }

  const organization = await requireActiveOrganization();

  let customerId = organization.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: organization.name ?? undefined,
    });

    customerId = customer.id;

    await Prisma.organization.update({
      where: {
        id: organization.id,
      },
      data: {
        stripe_customer_id: customerId,
      },
    });
  }

  try {
    const stripeCheckoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      billing_address_collection: "required",
      line_items: [
        {
          price:
            type === "BASIC"
              ? process.env.STRIPE_BASIC_PLAN_ID
              : process.env.STRIPE_PREMIUM_PLAN_ID,
          quantity: 1,
        },
      ],
      metadata: {
        type: type,
      },
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${process.env.STRIPE_SUCCESS_URL}`,
      cancel_url: `${process.env.STRIPE_CANCEL_URL}`,
    });

    return {
      sessionId: stripeCheckoutSession.id,
      url: stripeCheckoutSession.url,
    };
  } catch (error) {
    return {
      sessionId: "",
      error: "Falha ao criar a sessão de checkout. Tente novamente." + error,
    };
  }
}
