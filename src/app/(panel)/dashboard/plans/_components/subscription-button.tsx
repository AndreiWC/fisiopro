"use client";
import { Plan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { createSubscription } from "../_actions/create-subscription";
import { toast } from "sonner";
import { getStripeJs } from "@/utils/stripe-js";

interface SubscriptionButtonProps {
  type: Plan;
}
export function SubscriptionButton({ type }: SubscriptionButtonProps) {
  async function handleCreateBilling() {
    console.log(`Criar cobrança para o plano ${type}`);
    const { sessionId, error, url } = await createSubscription({ type: type });

    if (error) {
      toast.error(error);
      return;
    }

    const stripe = await getStripeJs();
    if (stripe && url) {
      window.location.href = url;
    }
  }
  return (
    <Button
      className={`w-full py-6 text-base font-bold transition-all ${
        type === "PROFESSIONAL"
          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
      }`}
      onClick={handleCreateBilling}
    >
      Assinar {type === "PROFESSIONAL" ? "Profissional" : "Básico"}
    </Button>
  );
}
