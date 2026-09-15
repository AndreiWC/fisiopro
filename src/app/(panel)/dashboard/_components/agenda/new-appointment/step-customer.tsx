"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/utils/formatPhone";
import { searchCustomers, type CustomerSearchResult } from "../../../_data-access/search-customers";
import type { CustomerSelection } from "./new-appointment-wizard";

interface StepCustomerProps {
  organizationId: string;
  value: CustomerSelection;
  onChange: (value: CustomerSelection) => void;
}

export function StepCustomer({ organizationId, value, onChange }: StepCustomerProps) {
  const [mode, setMode] = useState<"existing" | "new">(value?.mode ?? "existing");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (mode !== "existing") return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const found = await searchCustomers({ organizationId, query: trimmed });
        setResults(found);
      });
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, mode, organizationId]);

  const newCustomer = value?.mode === "new" ? value : { mode: "new" as const, name: "", email: "", phone: "" };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={cn(
            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            mode === "existing"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:bg-secondary/40",
          )}
        >
          Paciente existente
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("new");
            onChange({ mode: "new", name: "", email: "", phone: "" });
          }}
          className={cn(
            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            mode === "new"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:bg-secondary/40",
          )}
        >
          Novo paciente
        </button>
      </div>

      {mode === "existing" ? (
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, e-mail ou telefone"
              className="pl-9"
            />
          </div>

          {value?.mode === "existing" && (
            <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {value.customer.name || "Sem nome"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {value.customer.phone || value.customer.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Trocar
              </button>
            </div>
          )}

          {!isPending && query.trim() && results.length === 0 && value?.mode !== "existing" && (
            <p className="text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
          )}

          {value?.mode !== "existing" && results.length > 0 && (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {results.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ mode: "existing", customer });
                      setQuery("");
                      setResults([]);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/40"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <Users className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {customer.name || "Sem nome"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {customer.phone || customer.email}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserPlus className="h-4 w-4" />
            Cadastro rápido
          </div>
          <Input
            placeholder="Nome completo"
            value={newCustomer.name}
            onChange={(e) => onChange({ ...newCustomer, name: e.target.value })}
          />
          <Input
            placeholder="E-mail"
            type="email"
            value={newCustomer.email}
            onChange={(e) => onChange({ ...newCustomer, email: e.target.value })}
          />
          <Input
            placeholder="(00) 00000-0000"
            value={newCustomer.phone}
            onChange={(e) => onChange({ ...newCustomer, phone: formatPhone(e.target.value) })}
          />
        </div>
      )}
    </div>
  );
}
