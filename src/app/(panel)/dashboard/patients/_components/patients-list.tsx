"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Search, Users } from "lucide-react";
import { CustomerStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updatePatientStatus } from "../_actions/update-patient-status";
import type { Patient } from "../_data-access/get-patients";
import { PATIENT_STATUS_META as STATUS_META, patientInitials as initials } from "../_lib/patient-status";
import { PatientProfileSheet } from "./patient-profile-sheet";

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

export function PatientsList({ patients: initialPatients, organizationId }: PatientsListProps) {
  const [patients, setPatients] = useState(initialPatients);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CustomerStatus | "TODOS">("TODOS");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
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
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Buscar paciente por nome, e-mail ou telefone"
          className="h-10 w-full rounded-md border border-input bg-transparent pr-3 pl-9 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
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
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary",
              )}
            >
              {label} · {count}
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
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {filtered.map((patient) => {
            const meta = STATUS_META[patient.treatmentStatus];
            return (
              <li
                key={patient.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <button
                  type="button"
                  onClick={() => setSelectedPatient(patient)}
                  className="flex min-w-0 items-center gap-3 rounded-lg text-left transition-colors hover:bg-secondary/60 sm:-m-2 sm:p-2"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {initials(patient.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground">
                        {patient.name || "Sem nome"}
                      </p>
                      {patient.missedCount > 0 && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          Faltou {patient.missedCount}x
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {patient.lastServiceName
                        ? `${patient.lastServiceName} · ${patient.sessionsCompleted} sessões concluídas`
                        : "Ainda sem sessões concluídas"}
                      {patient.lastVisitDate &&
                        ` · última ${format(new Date(patient.lastVisitDate), "dd/MM", { locale: ptBR })}`}
                    </p>
                  </div>
                </button>

                <Select
                  value={patient.treatmentStatus}
                  onValueChange={(value) =>
                    handleStatusChange(patient.id, value as CustomerStatus)
                  }
                >
                  <SelectTrigger
                    className={cn(
                      "h-9 w-fit shrink-0 gap-1.5 rounded-full border-0 px-3.5 text-xs font-medium shadow-none",
                      meta.className,
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {(Object.keys(STATUS_META) as CustomerStatus[]).map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_META[status].label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </li>
            );
          })}
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
