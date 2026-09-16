"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, X } from "lucide-react";
import { toast } from "sonner";
import type { AppointmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateAppointmentStatus } from "../../_actions/update-appointment-status";
import { DialogAppointment } from "../../_components/appointments/dialog-appointment";
import { STATUS_META, type AppointmentWithService } from "../../_components/agenda/day-view";

interface AttendanceListProps {
  organizationId: string;
}

type Scope = "pending" | "all";

const OPEN_STATUSES: AppointmentStatus[] = ["CONFIRMED", "IN_PROGRESS"];

function getDateLabel(date: Date) {
  const d = new Date(date);
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const appointmentUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diffDays = Math.round((appointmentUTC - todayUTC) / 86400000);

  if (diffDays === 0) return "Hoje";
  if (diffDays === -1) return "Ontem";
  if (diffDays === 1) return "Amanhã";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" }).format(d);
}

export function AttendanceList({ organizationId }: AttendanceListProps) {
  const [scope, setScope] = useState<Scope>("pending");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithService | null>(
    null,
  );
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
    <div className="flex flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
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
      </div>

      <div className="mt-4">
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
        ) : (
          <ScrollArea className="lg:h-100">
            <ul className="divide-y divide-border">
              {appointments.map((appointment) => {
                const meta = STATUS_META[appointment.status];
                const isOpen = OPEN_STATUSES.includes(appointment.status);
                return (
                  <li key={appointment.id} className="flex items-center gap-3 py-3">
                    <div className="w-14 shrink-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        {getDateLabel(appointment.AppointmentDate)}
                      </p>
                      <p className="font-mono text-sm font-semibold tabular-nums">
                        {appointment.time}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{appointment.customer.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {appointment.service.name}
                      </p>
                    </div>
                    {isOpen && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title="Concluir"
                          className="border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => handleStatusChange(appointment.id, "COMPLETED")}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title="Faltou"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => handleStatusChange(appointment.id, "NO_SHOW")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <Select
                      value={appointment.status}
                      onValueChange={(value) =>
                        handleStatusChange(appointment.id, value as AppointmentStatus)
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-7 w-fit shrink-0 gap-1 rounded-full px-2.5 text-xs font-medium shadow-none",
                          meta.className,
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        {(Object.keys(STATUS_META) as AppointmentStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_META[status].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
