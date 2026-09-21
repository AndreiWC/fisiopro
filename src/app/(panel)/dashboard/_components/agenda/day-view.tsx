"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Prisma, AppointmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { updateAppointmentStatus } from "../../_actions/update-appointment-status";
import { DialogAppointment } from "../appointments/dialog-appointment";
import { Dialog } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatvalue } from "@/utils/formatValue";
import { APPOINTMENT_STATUS_META } from "@/utils/appointment-status";
import { buildOccupantMap, computeOccupancyPercent } from "@/utils/slot-occupancy";
import { DayStrip } from "../appointments/day-strip";
import { EmptySlotRow } from "./empty-slot-row";
import { EmptyState } from "./empty-state";
import { SummaryCard } from "./summary-card";

export type AppointmentWithService = Prisma.AppointmentsGetPayload<{
  include: { service: true; customer: true };
}>;

export const STATUS_META = APPOINTMENT_STATUS_META;

interface DayViewProps {
  times: string[];
  onSlotClick: (time?: string) => void;
}

export function DayView({ times, onSlotClick }: DayViewProps) {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const queryClient = useQueryClient();
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithService | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["get-appointments", date],
    queryFn: async () => {
      const activeDate = date ?? format(new Date(), "yyyy-MM-dd");
      const url = `${process.env.NEXT_PUBLIC_BASE_URL}/api/clinic/appointments?date=${activeDate}`;
      const response = await fetch(url);
      const json = (await response.json()) as AppointmentWithService[];
      if (!response.ok) return [];
      return json;
    },
    staleTime: 20000,
    refetchInterval: 60000,
  });

  const allAppointments = data ?? [];
  // Cancelados não ocupam horário na agenda — só entram na contagem do indicador.
  const appointments = useMemo(
    () => allAppointments.filter((a) => a.status !== "CANCELLED"),
    [allAppointments],
  );

  const occupantMap = useMemo(() => buildOccupantMap(appointments, times), [appointments, times]);

  const stats = useMemo(() => {
    const occupancy = computeOccupancyPercent(occupantMap.size, times.length);
    const confirmed = appointments.filter((a) => a.status === "CONFIRMED").length;
    const cancelled = allAppointments.filter((a) => a.status === "CANCELLED").length;
    const revenueCents = appointments
      .filter((a) => a.status !== "NO_SHOW")
      .reduce((sum, a) => sum + a.service.price, 0);

    return {
      total: appointments.length,
      occupancy,
      confirmed,
      cancelled,
      revenue: formatvalue(revenueCents.toString()),
    };
  }, [appointments, allAppointments, occupantMap, times.length]);

  async function handleStatusChange(appointmentId: string, status: AppointmentStatus) {
    const response = await updateAppointmentStatus({ appointmentId, status });
    if (response.error) {
      toast.error(response.error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["get-appointments"] });
    queryClient.invalidateQueries({ queryKey: ["get-week-appointments"] });
    queryClient.invalidateQueries({ queryKey: ["get-month-appointments-summary"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-list"] });
  }

  return (
    <>
      <Dialog
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
      >
        {selectedAppointment && <DialogAppointment appointment={selectedAppointment} />}
      </Dialog>

      <DayStrip />

      <div className="mt-4 flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando agenda...</p>
          ) : appointments.length === 0 ? (
            <EmptyState
              title="Seu dia está livre"
              description="Você não possui agendamentos para hoje. Que tal preencher um horário disponível?"
              onNewAppointment={() => onSlotClick()}
            />
          ) : (
            <div className="h-[calc(100vh-30rem)] overflow-y-auto pr-4 lg:h-84">
              {times.map((slot) => {
                const occupant = occupantMap.get(slot);

                if (occupant) {
                  const meta = STATUS_META[occupant.status];
                  const isSlotStart = occupant.time === slot;
                  if (!isSlotStart) return null;

                  return (
                    <div key={slot} className="flex items-center gap-3 border-t py-3 last:border-b">
                      <div className="w-14 shrink-0 font-mono text-sm font-semibold tabular-nums">
                        {slot}
                      </div>
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="truncate font-semibold">{occupant.customer.name}</div>
                        <div className="truncate text-sm text-muted-foreground">
                          {occupant.service.name}
                        </div>
                      </div>
                      <Select
                        value={occupant.status}
                        onValueChange={(value) =>
                          handleStatusChange(occupant.id, value as AppointmentStatus)
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
                        className="hidden shrink-0 sm:inline-flex"
                        onClick={() => setSelectedAppointment(occupant)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                }

                return <EmptySlotRow key={slot} time={slot} onClick={() => onSlotClick(slot)} />;
              })}
            </div>
          )}
        </div>

        <SummaryCard
          title="Resumo do dia"
          total={stats.total}
          confirmed={stats.confirmed}
          cancelled={stats.cancelled}
          revenue={stats.revenue}
          occupancy={stats.occupancy}
        />
      </div>
    </>
  );
}
