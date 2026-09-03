"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import type { Patient } from "@prisma/client";
import { formatPhone, formatCpf } from "@/utils/formatPhone";
import { updatePatientProfile } from "../_actions/update-patient-profile";
import { signOutPatient } from "../../_actions/patient-auth";

interface PatientStats {
  sessionsCompleted: number;
  activeAppointments: number;
  activeClinics: number;
  attendanceRate: number | null;
}

interface ProfileContentProps {
  patient: Patient;
  stats: PatientStats;
}

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function ProfileContent({ patient, stats }: ProfileContentProps) {
  const router = useRouter();
  const [name, setName] = useState(patient.name ?? "");
  const [phone, setPhone] = useState(patient.phone ?? "");
  const [cpf, setCpf] = useState(patient.cpf ?? "");
  const [insuranceName, setInsuranceName] = useState(patient.insuranceName ?? "");
  const [insuranceNumber, setInsuranceNumber] = useState(patient.insuranceNumber ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(
    patient.emergencyContactName ?? "",
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    patient.emergencyContactPhone ?? "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const response = await updatePatientProfile({
      name,
      phone,
      cpf,
      insuranceName,
      insuranceNumber,
      emergencyContactName,
      emergencyContactPhone,
    });
    setSaving(false);

    if (response.error) {
      toast.error(response.error);
      return;
    }

    toast.success(response.data);
  }

  async function handleSignOut() {
    await signOutPatient();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
          {initials(patient.name)}
        </div>
        <h1 className="font-display mt-3 text-xl font-semibold text-foreground">
          {patient.name || "Complete seu perfil"}
        </h1>
        <p className="text-sm text-muted-foreground">{patient.email}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <StatTile label="Sessões concluídas" value={String(stats.sessionsCompleted)} />
        <StatTile label="Agendamentos ativos" value={String(stats.activeAppointments)} />
        <StatTile label="Clínicas" value={String(stats.activeClinics)} />
        <StatTile
          label="Presença"
          value={stats.attendanceRate !== null ? `${stats.attendanceRate}%` : "—"}
        />
      </div>

      <Link
        href="/agendamentos"
        className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40"
      >
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Ver meus agendamentos
        </span>
        <span aria-hidden>→</span>
      </Link>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Dados pessoais
          </legend>
          <Field label="Nome completo" value={name} onChange={setName} placeholder="Seu nome" required />
          <Field
            label="CPF"
            value={cpf}
            onChange={(v) => setCpf(formatCpf(v))}
            placeholder="000.000.000-00"
          />
          <Field
            label="Telefone"
            value={phone}
            onChange={(v) => setPhone(formatPhone(v))}
            placeholder="(00) 00000-0000"
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Convênio
          </legend>
          <Field
            label="Nome do convênio"
            value={insuranceName}
            onChange={setInsuranceName}
            placeholder="Ex: Unimed"
          />
          <Field
            label="Número da carteirinha"
            value={insuranceNumber}
            onChange={setInsuranceNumber}
            placeholder="0000 0000 0"
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Contato de emergência
          </legend>
          <Field
            label="Nome"
            value={emergencyContactName}
            onChange={setEmergencyContactName}
            placeholder="Nome de quem podemos ligar"
          />
          <Field
            label="Telefone"
            value={emergencyContactPhone}
            onChange={(v) => setEmergencyContactPhone(formatPhone(v))}
            placeholder="(00) 00000-0000"
          />
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-4 w-full rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
      >
        Sair
      </button>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
    </div>
  );
}
