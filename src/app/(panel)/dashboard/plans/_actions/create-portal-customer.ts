"use server";
import { auth } from "@/lib/auth";
import { stripe } from "@/utils/stripe";
import { getActiveOrganization } from "@/lib/organization";

export async function createPortalCustomer() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      sessionId: "",
      error: "Usuário não autenticado",
    };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { sessionId: "", error: "Nenhuma organização vinculada à sua conta" };
  }
  const customerId = organization.stripe_customer_id;

  if (!customerId) {
    return {
      sessionId: "",
      error: "Organização não possui um ID de cliente Stripe",
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
