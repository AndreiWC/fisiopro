"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, RotateCcw, Stethoscope, X } from "lucide-react";
import { toast } from "sonner";
import type { AppointmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ViewModeToggle, useViewMode } from "@/components/view-mode-toggle";
import { cn } from "@/lib/utils";
import { OPEN_APPOINTMENT_STATUSES } from "@/utils/appointment-status";
import { updateAppointmentStatus } from "../../_actions/update-appointment-status";
import { DialogAppointment } from "../../_components/appointments/dialog-appointment";
import { AppointmentStatusBadge } from "../../_components/appointments/appointment-status-badge";
import type { AppointmentWithService } from "../../_components/agenda/day-view";

interface AttendanceListProps {
  organizationId: string;
}

type Scope = "pending" | "all";

const OPEN_STATUSES = OPEN_APPOINTMENT_STATUSES;

function getDateLabel(date: Date) {
  const d = new Date(date);
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const appointmentUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diffDays = Math.round((appointmentUTC - todayUTC) / 86400000);

  if (diffDays === 0) return "Hoje";
  if (diffDays === -1) return "Ontem";
  if (diffDays === 1) return "Amanhã";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "short" })
    .format(d)
    .replace(" de ", " ")
    .replace(".", "");
}

interface AttendanceItemProps {
  appointment: AppointmentWithService;
  onOpen: (appointment: AppointmentWithService) => void;
  onChangeStatus: (appointmentId: string, status: AppointmentStatus) => void;
}

function TimeTile({
  appointment,
  className,
  timeClassName,
  dateClassName,
}: {
  appointment: AppointmentWithService;
  className: string;
  timeClassName: string;
  dateClassName: string;
}) {
  const isOpen = OPEN_STATUSES.includes(appointment.status);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center",
        isOpen ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      <span className={cn("font-mono leading-none font-semibold tabular-nums", timeClassName)}>
        {appointment.time}
      </span>
      <span className={cn("leading-none", dateClassName)}>
        {getDateLabel(appointment.AppointmentDate)}
      </span>
    </div>
  );
}

function AttendanceCard({ appointment, onOpen, onChangeStatus }: AttendanceItemProps) {
  const isOpen = OPEN_STATUSES.includes(appointment.status);

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <TimeTile
          appointment={appointment}
          className="h-16 w-16 rounded-2xl"
          timeClassName="text-base"
          dateClassName="mt-1.5 text-xs"
        />

        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-base font-semibold text-foreground">
            {appointment.customer.name}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Stethoscope className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span className="truncate">{appointment.service.name}</span>
          </p>
          <div className="mt-2">
            <AppointmentStatusBadge status={appointment.status} />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          aria-label="Ver detalhes"
          onClick={() => onOpen(appointment)}
        >
          <Eye className="h-4 w-4" />
        </Button>

        {isOpen ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-0 flex-1 gap-1.5 border-primary/40 px-3 text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => onChangeStatus(appointment.id, "COMPLETED")}
            >
              <Check className="h-4 w-4 shrink-0" />
              Concluir
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-0 flex-1 gap-1.5 border-destructive/40 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onChangeStatus(appointment.id, "NO_SHOW")}
            >
              <X className="h-4 w-4 shrink-0" />
              Faltou
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-10 min-w-0 flex-1 gap-1.5 px-3"
            onClick={() => onChangeStatus(appointment.id, "CONFIRMED")}
          >
            <RotateCcw className="h-4 w-4 shrink-0" />
            Reabrir
          </Button>
        )}
      </div>
    </li>
  );
}

function AttendanceRow({ appointment, onOpen, onChangeStatus }: AttendanceItemProps) {
  const isOpen = OPEN_STATUSES.includes(appointment.status);

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/40">
      <button
        type="button"
        onClick={() => onOpen(appointment)}
        aria-label={`Ver detalhes do atendimento de ${appointment.customer.name}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <TimeTile
          appointment={appointment}
          className="h-12 w-14 gap-1 rounded-xl"
          timeClassName="text-sm"
          dateClassName="text-[11px]"
        />

        <div className="min-w-0 flex-1">
          <p className="font-display truncate font-semibold text-foreground">
            {appointment.customer.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <AppointmentStatusBadge status={appointment.status} />
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {appointment.service.name}
            </span>
          </div>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        {isOpen ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
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
              className="h-10 w-10 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Faltou"
              title="Faltou"
              onClick={() => onChangeStatus(appointment.id, "NO_SHOW")}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10"
            aria-label="Reabrir"
            title="Reabrir"
            onClick={() => onChangeStatus(appointment.id, "CONFIRMED")}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
}

export function AttendanceList({ organizationId }: AttendanceListProps) {
  const [scope, setScope] = useState<Scope>("pending");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithService | null>(
    null,
  );
  const [view, changeView] = useViewMode("encaixa:attendance-view", "cards");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["attendance-list", organizationId, scope],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/clinic/attendance?scope=${scope}`,
      );
      const json = (await response.json()) as AppointmentWithService[];
      if (!response.ok) return [];
      return json;
    },
    staleTime: 20000,
  });

  const appointments = useMemo(() => data ?? [], [data]);

  async function handleStatusChange(appointmentId: string, status: AppointmentStatus) {
    const response = await updateAppointmentStatus({ appointmentId, status });
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success("Status atualizado!");
    queryClient.invalidateQueries({ queryKey: ["attendance-list"] });
    queryClient.invalidateQueries({ queryKey: ["get-appointments"] });
    queryClient.invalidateQueries({ queryKey: ["get-week-appointments"] });
    queryClient.invalidateQueries({ queryKey: ["get-month-appointments-summary"] });
  }

  return (
    <div className="flex flex-col gap-4">
      <Dialog
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
      >
        {selectedAppointment && <DialogAppointment appointment={selectedAppointment} />}
      </Dialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-foreground">
          {scope === "pending"
            ? `${appointments.length} pendente${appointments.length === 1 ? "" : "s"} de fechamento`
            : "Todos os atendimentos"}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border bg-background p-1">
            {(["pending", "all"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setScope(key)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  scope === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {key === "pending" ? "Pendentes" : "Todos"}
              </button>
            ))}
          </div>
          <ViewModeToggle view={view} onChange={changeView} />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando atendimentos...</p>
      ) : appointments.length === 0 ? (
        scope === "pending" ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
            <Check className="h-8 w-8 text-primary" />
            <p className="font-medium text-foreground">Tudo em dia!</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Nenhum atendimento pendente de fechamento.
            </p>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum agendamento encontrado.
          </p>
        )
      ) : view === "list" ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {appointments.map((appointment) => (
            <AttendanceRow
              key={appointment.id}
              appointment={appointment}
              onOpen={setSelectedAppointment}
              onChangeStatus={handleStatusChange}
            />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {appointments.map((appointment) => (
            <AttendanceCard
              key={appointment.id}
              appointment={appointment}
              onOpen={setSelectedAppointment}
              onChangeStatus={handleStatusChange}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
