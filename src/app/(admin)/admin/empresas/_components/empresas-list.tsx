"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, Search } from "lucide-react";
import type { Plan } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { segmentLabel } from "@/utils/segments";
import { subscriptionStatusMeta } from "../../_lib/subscription-status";
import type { OrganizationListItem } from "../_data-access/get-organizations";

interface EmpresasListProps {
  organizations: OrganizationListItem[];
}

type PlanFilter = "TODOS" | Plan | "SEM_ASSINATURA";
type CompanyStatusFilter = "TODAS" | "ATIVAS" | "SUSPENSAS";

const PLAN_LABEL: Record<Plan, string> = {
  BASIC: "Básico",
  PROFESSIONAL: "Profissional",
};

const SUBSCRIPTION_STATUS_FILTER_OPTIONS = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;

export function EmpresasList({ organizations }: EmpresasListProps) {
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("TODOS");
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<string>("TODOS");
  const [companyStatusFilter, setCompanyStatusFilter] = useState<CompanyStatusFilter>("TODAS");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return organizations.filter((org) => {
      if (q && !(org.name ?? "").toLowerCase().includes(q)) return false;

      if (planFilter === "SEM_ASSINATURA" && org.plan !== null) return false;
      if (planFilter !== "TODOS" && planFilter !== "SEM_ASSINATURA" && org.plan !== planFilter) {
        return false;
      }

      if (subscriptionStatusFilter !== "TODOS" && org.subscriptionStatus !== subscriptionStatusFilter) {
        return false;
      }

      if (companyStatusFilter === "ATIVAS" && !org.status) return false;
      if (companyStatusFilter === "SUSPENSAS" && org.status) return false;

      return true;
    });
  }, [organizations, query, planFilter, subscriptionStatusFilter, companyStatusFilter]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Buscar empresa por nome"
          className="h-10 w-full rounded-md border border-input bg-transparent pr-3 pl-9 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={planFilter} onValueChange={(value) => setPlanFilter(value as PlanFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os planos</SelectItem>
            <SelectItem value="BASIC">Básico</SelectItem>
            <SelectItem value="PROFESSIONAL">Profissional</SelectItem>
            <SelectItem value="SEM_ASSINATURA">Sem assinatura</SelectItem>
          </SelectContent>
        </Select>

        <Select value={subscriptionStatusFilter} onValueChange={setSubscriptionStatusFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Status da assinatura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os status</SelectItem>
            {SUBSCRIPTION_STATUS_FILTER_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {subscriptionStatusMeta(status).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {(["TODAS", "ATIVAS", "SUSPENSAS"] as const).map((value) => {
            const label = value === "TODAS" ? "Todas" : value === "ATIVAS" ? "Ativas" : "Suspensas";
            const isActive = companyStatusFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCompanyStatusFilter(value)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-secondary",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-foreground">
            {organizations.length === 0 ? "Nenhuma empresa ainda" : "Nenhuma empresa encontrada"}
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {organizations.length === 0
              ? "As empresas aparecem aqui assim que alguém se cadastrar no FisioPro."
              : "Ajuste a busca ou os filtros para ver outras empresas."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {filtered.map((org) => {
            const statusMeta = subscriptionStatusMeta(org.subscriptionStatus);
            return (
              <li key={org.id}>
                <Link
                  href={`/admin/empresas/${org.id}`}
                  className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-secondary sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{org.name || "Sem nome"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {segmentLabel(org.segment) ?? "Sem segmento"} · Criada em{" "}
                      {format(org.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {org.plan ? PLAN_LABEL[org.plan] : "Sem plano"}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusMeta.className)}>
                      {statusMeta.label}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        org.status ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {org.status ? "Empresa ativa" : "Empresa suspensa"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
