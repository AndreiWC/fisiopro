import { NextResponse } from "next/server";
import { stripe } from "@/utils/stripe";
import Stripe from "stripe";
import { manageSubscription } from "@/utils/manage-subscription";
import { Plan } from "@prisma/client";
import { revalidatePath } from "next/cache";
export const POST = async (request: Request) => {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 },
    );
  }

  const text = await request.text();
  const event = await stripe.webhooks.constructEvent(
    text,
    signature,
    process.env.STRIPE_SECRET_WEBHOOK_KEY as string,
  );

  switch (event.type) {
    case "customer.subscription.deleted":
      const payment = event.data.object as Stripe.Subscription;
      await manageSubscription(
        payment.id,
        payment.customer.toString(),
        false,
        true,
      );
      break;
    case "customer.subscription.updated":
      const updatedPayment = event.data.object as Stripe.Subscription;
      await manageSubscription(
        updatedPayment.id,
        updatedPayment.customer.toString(),
        false,
      );

      break;
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      const type = session?.metadata?.type ? session?.metadata?.type : "BASIC";
 
      if (session.subscription || session.customer) {
        await manageSubscription(
          session.subscription as string,
          session.customer as string,
          true,
          false,
          type as Plan,
        );
      }
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  revalidatePath("/dashboard/plans");
  return NextResponse.json({ received: true });
};
