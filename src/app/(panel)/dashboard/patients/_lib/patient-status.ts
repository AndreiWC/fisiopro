import type { CustomerStatus } from "@prisma/client";

export const PATIENT_STATUS_META: Record<CustomerStatus, { label: string; className: string }> = {
  AGUARDANDO: {
    label: "Aguardando",
    className: "bg-accent text-accent-foreground",
  },
  EM_TRATAMENTO: {
    label: "Em tratamento",
    className: "bg-primary/10 text-primary",
  },
  ALTA: {
    label: "Alta",
    className: "bg-secondary text-secondary-foreground",
  },
};

export function patientInitials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
