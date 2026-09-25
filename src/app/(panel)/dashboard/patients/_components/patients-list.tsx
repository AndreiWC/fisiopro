"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Check,
  Play,
  RotateCcw,
  Search,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CustomerStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ViewModeToggle, useViewMode } from "@/components/view-mode-toggle";
import { toast } from "sonner";
import { updatePatientStatus } from "../_actions/update-patient-status";
import type { Patient } from "../_data-access/get-patients";
import { patientInitials as initials } from "../_lib/patient-status";
import { PatientProfileSheet } from "./patient-profile-sheet";
import { PatientStatusBadge } from "./patient-status-badge";

interface PatientsListProps {
  patients: Patient[];
  organizationId: string;
}

const FILTERS: { value: CustomerStatus | "TODOS"; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "AGUARDANDO", label: "Aguardando" },
  { value: "EM_TRATAMENTO", label: "Em tratamento" },
  { value: "ALTA", label: "Alta" },
];

/** Próximo passo natural de cada fase — o que a ação rápida do paciente faz com um toque. */
const NEXT_ACTION: Record<
  CustomerStatus,
  { label: string; next: CustomerStatus; icon: LucideIcon }
> = {
  AGUARDANDO: { label: "Iniciar tratamento", next: "EM_TRATAMENTO", icon: Play },
  EM_TRATAMENTO: { label: "Dar alta", next: "ALTA", icon: Check },
  ALTA: { label: "Reabrir", next: "EM_TRATAMENTO", icon: RotateCcw },
};

function formatLastVisit(date: Patient["lastVisitDate"]) {
  if (!date) return "Nenhuma";
  return format(new Date(date), "d MMM", { locale: ptBR }).replace(".", "");
}

interface PatientItemProps {
  patient: Patient;
  onOpen: (patient: Patient) => void;
  onChangeStatus: (customerId: string, status: CustomerStatus) => void;
}

function PatientAvatar({ patient, className }: { patient: Patient; className: string }) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-secondary font-semibold text-secondary-foreground",
        className,
      )}
    >
      {patient.image ? (
        <Image src={patient.image} alt="" fill sizes="56px" className="object-cover" />
      ) : (
        initials(patient.name)
      )}
    </div>
  );
}

function MissedBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
      <AlertTriangle className="h-3 w-3" />
      Faltou {count}x
    </span>
  );
}

function PatientCard({ patient, onOpen, onChangeStatus }: PatientItemProps) {
  const action = NEXT_ACTION[patient.treatmentStatus];
  const ActionIcon = action.icon;

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <PatientAvatar patient={patient} className="h-14 w-14 rounded-2xl text-base" />

        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-base font-semibold text-foreground">
            {patient.name || "Sem nome"}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Stethoscope className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span className="truncate">{patient.lastServiceName ?? "Ainda sem atendimentos"}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PatientStatusBadge status={patient.treatmentStatus} />
            {patient.missedCount > 0 && <MissedBadge count={patient.missedCount} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
        <div>
          <p className="text-xs text-muted-foreground">Sessões concluídas</p>
          <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {patient.sessionsCompleted}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Última visita</p>
          <p className="text-sm font-medium text-foreground">
            {formatLastVisit(patient.lastVisitDate)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0 px-4"
          onClick={() => onOpen(patient)}
        >
          Ver perfil
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 min-w-0 flex-1 gap-1.5 border-primary/40 px-3 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => onChangeStatus(patient.id, action.next)}
        >
          <ActionIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{action.label}</span>
        </Button>
      </div>
    </li>
  );
}

function PatientRow({ patient, onOpen, onChangeStatus }: PatientItemProps) {
  const action = NEXT_ACTION[patient.treatmentStatus];
  const ActionIcon = action.icon;

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/40">
      <button
        type="button"
        onClick={() => onOpen(patient)}
        aria-label={`Ver perfil de ${patient.name || "paciente"}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <PatientAvatar patient={patient} className="h-11 w-11 rounded-xl text-sm" />

        <div className="min-w-0 flex-1">
          <p className="font-display truncate font-semibold text-foreground">
            {patient.name || "Sem nome"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <PatientStatusBadge status={patient.treatmentStatus} />
            {patient.missedCount > 0 && <MissedBadge count={patient.missedCount} />}
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {patient.lastServiceName ?? "Ainda sem atendimentos"}
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 text-right md:block">
          <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {patient.sessionsCompleted} sessões
          </p>
          <p className="text-xs text-muted-foreground">
            Última visita {formatLastVisit(patient.lastVisitDate)}
          </p>
        </div>
      </button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
        aria-label={action.label}
        title={action.label}
        onClick={() => onChangeStatus(patient.id, action.next)}
      >
        <ActionIcon className="h-4 w-4" />
      </Button>
    </li>
  );
}

export function PatientsList({ patients: initialPatients, organizationId }: PatientsListProps) {
  const [patients, setPatients] = useState(initialPatients);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CustomerStatus | "TODOS">("TODOS");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [view, changeView] = useViewMode("encaixa:patients-view", "cards");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((patient) => {
      const matchesFilter =
        filter === "TODOS" || patient.treatmentStatus === filter;
      if (!matchesFilter) return false;
      if (!q) return true;
      return (
        (patient.name ?? "").toLowerCase().includes(q) ||
        (patient.email ?? "").toLowerCase().includes(q) ||
        (patient.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [patients, query, filter]);

  function handleStatusChange(customerId: string, status: CustomerStatus) {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === customerId ? { ...p, treatmentStatus: status } : p,
      ),
    );
    startTransition(async () => {
      const response = await updatePatientStatus({
        customerId,
        treatmentStatus: status,
      });
      if (response.error) {
        toast.error(response.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Nome, e-mail ou telefone"
            aria-label="Buscar paciente por nome, e-mail ou telefone"
            className="h-10 w-full rounded-md border border-input bg-transparent pr-3 pl-9 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
        <ViewModeToggle view={view} onChange={changeView} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(({ value, label }) => {
          const count =
            value === "TODOS"
              ? patients.length
              : patients.filter((p) => p.treatmentStatus === value).length;
          const isActive = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={isActive}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-2 pl-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary",
              )}
            >
              {label}
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center font-mono text-xs tabular-nums",
                  isActive ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-foreground">
            {patients.length === 0
              ? "Nenhum paciente ainda"
              : "Nenhum paciente encontrado"}
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {patients.length === 0
              ? "Os pacientes aparecem aqui assim que alguém agendar pela sua página pública."
              : "Ajuste a busca ou o filtro para ver outros pacientes."}
          </p>
        </div>
      ) : view === "list" ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {filtered.map((patient) => (
            <PatientRow
              key={patient.id}
              patient={patient}
              onOpen={setSelectedPatient}
              onChangeStatus={handleStatusChange}
            />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onOpen={setSelectedPatient}
              onChangeStatus={handleStatusChange}
            />
          ))}
        </ul>
      )}

      <PatientProfileSheet
        patient={selectedPatient}
        open={!!selectedPatient}
        onOpenChange={(open) => !open && setSelectedPatient(null)}
        organizationId={organizationId}
      />
    </div>
  );
}
