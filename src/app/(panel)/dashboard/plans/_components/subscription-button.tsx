"use client";
import { Plan } from "@/generated/prisma/browser";
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
          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/30"
          : "bg-slate-100 hover:bg-slate-200 text-slate-900"
      }`}
      onClick={handleCreateBilling}
    >
      Assinar {type === "PROFESSIONAL" ? "Profissional" : "Básico"}
    </Button>
  );
}
