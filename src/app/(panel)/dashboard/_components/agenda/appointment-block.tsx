"use client";

import { Check, Stethoscope, X } from "lucide-react";
import type { AppointmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OPEN_APPOINTMENT_STATUSES } from "@/utils/appointment-status";
import { AppointmentStatusBadge } from "../appointments/appointment-status-badge";
import type { AppointmentWithService } from "./day-view";

/** Fundo e borda do bloco por status: o dia se lê pela cor antes de ler o texto. */
const BLOCK_TONES: Record<AppointmentStatus, string> = {
  CONFIRMED: "border-border bg-card",
  IN_PROGRESS: "border-accent-warm/30 bg-accent/60",
  COMPLETED: "border-primary/20 bg-primary/5",
  NO_SHOW: "border-destructive/20 bg-destructive/5",
  CANCELLED: "border-border bg-muted",
};

/** Altura mínima de um horário de 30 min na grade (rem). */
const SLOT_HEIGHT_REM = 2.75;

interface AppointmentBlockProps {
  appointment: AppointmentWithService;
  /** Quantos horários de 30 min o atendimento ocupa. */
  slots: number;
  onOpen: (appointment: AppointmentWithService) => void;
  onChangeStatus: (appointmentId: string, status: AppointmentStatus) => void;
}

export function AppointmentBlock({
  appointment,
  slots,
  onOpen,
  onChangeStatus,
}: AppointmentBlockProps) {
  const isOpen = OPEN_APPOINTMENT_STATUSES.includes(appointment.status);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col justify-between gap-2 rounded-2xl border p-3",
        BLOCK_TONES[appointment.status],
      )}
      style={{ minHeight: `${slots * SLOT_HEIGHT_REM}rem` }}
    >
      <button
        type="button"
        onClick={() => onOpen(appointment)}
        aria-label={`Ver detalhes do agendamento de ${appointment.customer.name}`}
        className="min-w-0 text-left"
      >
        <p className="font-display truncate font-semibold text-foreground">
          {appointment.customer.name}
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span className="truncate">{appointment.service.name}</span>
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums">
            {appointment.service.duration} min
          </span>
        </div>
      </button>

      <div className="flex items-center justify-between gap-2">
        <AppointmentStatusBadge status={appointment.status} />

        {isOpen && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 border-primary/40 bg-card text-primary hover:bg-primary/10 hover:text-primary"
              aria-label="Concluir"
              title="Concluir"
              onClick={() => onChangeStatus(appointment.id, "COMPLETED")}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 border-destructive/40 bg-card text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Faltou"
              title="Faltou"
              onClick={() => onChangeStatus(appointment.id, "NO_SHOW")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
