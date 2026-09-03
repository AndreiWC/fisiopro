"use client";
import type { Subscription } from "@prisma/client";
import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react"; // Certifique-se de ter o lucide-react instalado
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { subscriptionPlans } from "@/utils/plans";
import { Button } from "@/components/ui/button";
import { createPortalCustomer } from "../_actions/create-portal-customer";

interface SubscriptionDetailProps {
  subscription: Subscription;
}

export function SubscriptionDetail({ subscription }: SubscriptionDetailProps) {
  const subscriptionInfo = subscriptionPlans.find(
    (plan) => plan.id === subscription.plan,
  );

  async function handleManageSubscription() {
    const portal = await createPortalCustomer();

    if (portal.error) {
      toast.error(
        "Erro ao criar sessão do portal de clientes: " + portal.error,
      );
      return;
    }

    window.location.href = portal.sessionId;
  }

  // Facilita a leitura do status e do nome do plano
  const isActive = subscription.status === "active";
  const planName = subscription.plan === "BASIC" ? "Básico" : "Profissional";

  return (
    <Card className="w-full max-w-md mx-auto shadow-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Seu Plano Atual
            </CardTitle>
            <CardDescription>
              Gerencie os detalhes da sua assinatura
            </CardDescription>
          </div>

          {/* Badge de status dinâmico */}
          <div
            className={`px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${
              isActive
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {isActive ? "Ativo" : "Inativo"}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Nome do Plano */}
        <div>
          <h3 className="text-3xl font-extrabold tracking-tight text-primary">
            {planName}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Aproveite todos os recursos disponíveis no seu pacote.
          </p>
        </div>

        {/* Lista de Benefícios */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">
            O que está incluso
          </h4>
          <ul className="space-y-3">
            {subscriptionInfo?.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="pt-4 border-t bg-muted/20">
        <Button
          onClick={handleManageSubscription}
          className="w-full transition-all"
          variant={isActive ? "outline" : "default"}
        >
          Gerenciar Assinatura
        </Button>
      </CardFooter>
    </Card>
  );
}
