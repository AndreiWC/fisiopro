"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { segmentLabel } from "@/utils/segments";
import { subscriptionPlans } from "@/utils/plans";
import { subscriptionStatusMeta } from "../../../_lib/subscription-status";
import { toggleOrganizationStatus } from "../_actions/toggle-organization-status";
import type { OrganizationDetail } from "../_data-access/get-organization-detail";

interface OrganizationDetailViewProps {
  organization: OrganizationDetail;
}

const PLAN_LABEL = { BASIC: "Básico", PROFESSIONAL: "Profissional" } as const;

export function OrganizationDetailView({ organization }: OrganizationDetailViewProps) {
  const [status, setStatus] = useState(organization.status);
  const [isPending, startTransition] = useTransition();

  const subscription = organization.subscription;
  const planPrice = subscription
    ? subscriptionPlans.find((p) => p.id === subscription.plan)?.price
    : undefined;
  const statusMeta = subscriptionStatusMeta(subscription?.status ?? null);

  function handleToggleStatus() {
    const nextStatus = !status;
    startTransition(async () => {
      const response = await toggleOrganizationStatus({
        organizationId: organization.id,
        status: nextStatus,
      });
      if (response.error) {
        toast.error(response.error);
        return;
      }
      setStatus(nextStatus);
      toast.success(response.data);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {organization.name || "Sem nome"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {segmentLabel(organization.segment) ?? "Sem segmento"} · Criada em{" "}
            {format(organization.createdAt, "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button
          type="button"
          variant={status ? "destructive" : "default"}
          disabled={isPending}
          onClick={handleToggleStatus}
        >
          {status ? "Ocultar da vitrine pública" : "Reexibir na vitrine pública"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Dados cadastrais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Vitrine pública: </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  status ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
                )}
              >
                {status ? "Visível" : "Oculta"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Telefone: </span>
              {organization.phone || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Endereço: </span>
              {organization.address || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Dono: </span>
              {organization.owner?.name ?? "—"}
              {organization.owner?.email ? ` (${organization.owner.email})` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {subscription ? (
              <>
                <p>
                  <span className="text-muted-foreground">Plano: </span>
                  {PLAN_LABEL[subscription.plan]}
                </p>
                <p>
                  <span className="text-muted-foreground">Status: </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusMeta.className)}>
                    {statusMeta.label}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Preço: </span>
                  {planPrice !== undefined
                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(planPrice)
                    : "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Atualizada em: </span>
                  {format(subscription.updatedAt, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Sem assinatura.</p>
            )}
            {organization.stripeCustomerId && (
              <a
                href={`https://dashboard.stripe.com/customers/${organization.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Ver no Stripe <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Serviços: </span>
              {organization.usage.services}
              {organization.limits ? ` / ${organization.limits.maxServices}` : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Clientes: </span>
              {organization.usage.customers}
              {organization.limits ? ` / ${organization.limits.maxCustomer}` : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Agendamentos: </span>
              {organization.usage.appointments}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
