import type { AppointmentStatus } from "@prisma/client";

export const APPOINTMENT_STATUS_META: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  CONFIRMED: {
    label: "Confirmado",
    className: "border border-border bg-card text-foreground",
  },
  IN_PROGRESS: {
    label: "Em atendimento",
    className: "border-transparent bg-accent-warm text-white",
  },
  COMPLETED: {
    label: "Concluído",
    className: "border-transparent bg-primary/10 text-primary",
  },
  NO_SHOW: {
    label: "Faltou",
    className: "border-transparent bg-destructive/10 text-destructive",
  },
  CANCELLED: {
    label: "Cancelado",
    className: "border-transparent bg-muted text-muted-foreground",
  },
};
