"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { APPOINTMENT_STATUS_META } from "@/utils/appointment-status";
import { formatvalue } from "@/utils/formatValue";
import { patientInitials } from "../_lib/patient-status";
import type { Patient } from "../_data-access/get-patients";
import { PatientStatusBadge } from "./patient-status-badge";

interface PatientProfileSheetProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

const TABS = [
  { id: "historico", label: "Histórico" },
  { id: "dados", label: "Dados" },
  { id: "financeiro", label: "Financeiro" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PatientProfileSheet({
  patient,
  open,
  onOpenChange,
  organizationId,
}: PatientProfileSheetProps) {
  const [tab, setTab] = useState<TabId>("historico");

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setTab("historico");
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {patient && (
          <>
            <SheetHeader className="gap-3 border-b border-border p-5">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-secondary">
                  {patient.image ? (
                    <Image src={patient.image} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-base font-semibold text-secondary-foreground">
                      {patientInitials(patient.name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-lg">
                    {patient.name || "Sem nome"}
                  </SheetTitle>
                  <SheetDescription className="mt-0.5">
                    {patient.phone || patient.email}
                  </SheetDescription>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {patient.lastServiceName && (
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    {patient.lastServiceName}
                  </span>
                )}
                <PatientStatusBadge status={patient.treatmentStatus} />
              </div>
            </SheetHeader>

            <div className="flex border-b border-border px-5">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "border-b-2 px-3 py-3 text-sm font-medium transition-colors first:pl-0",
                    tab === item.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {tab === "historico" && <HistoricoTab history={patient.history} />}
              {tab === "dados" && <DadosTab patient={patient} />}
              {tab === "financeiro" && (
                <FinanceiroTab history={patient.history} missedCount={patient.missedCount} />
              )}
            </div>

            <SheetFooter className="border-t border-border p-5">
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link href={`/dashboard/patients/${patient.id}/prontuario`}>
                  Ver prontuário completo
                </Link>
              </Button>
              <Button asChild size="lg" className="w-full">
                <Link href={`/clinica/${organizationId}`} target="_blank">
                  Agendar novo atendimento
                </Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function HistoricoTab({ history }: { history: Patient["history"] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum atendimento registrado ainda.</p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">Últimos atendimentos</p>
      <div>
        {history.map((item) => {
          const meta = APPOINTMENT_STATUS_META[item.status];
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(item.date), "dd MMM yyyy", { locale: ptBR })} {item.time}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.serviceName} · {item.serviceDuration} min
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                  meta.className,
                )}
              >
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DadosTab({ patient }: { patient: Patient }) {
  const rows = [
    { label: "E-mail", value: patient.email },
    { label: "Telefone", value: patient.phone || "Não informado" },
    { label: "CPF", value: patient.cpf || "Não informado" },
    { label: "Endereço", value: patient.address || "Não informado" },
  ];

  return (
    <dl className="space-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function FinanceiroTab({
  history,
  missedCount,
}: {
  history: Patient["history"];
  missedCount: number;
}) {
  const completed = history.filter((item) => item.status === "COMPLETED");
  const totalPaidCents = completed.reduce((sum, item) => sum + item.servicePrice, 0);

  const stats = [
    { label: "Total pago", value: formatvalue(totalPaidCents.toString()) },
    { label: "Sessões concluídas", value: String(completed.length) },
    { label: "Faltas", value: String(missedCount) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className="mt-1 font-mono text-lg font-semibold text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
