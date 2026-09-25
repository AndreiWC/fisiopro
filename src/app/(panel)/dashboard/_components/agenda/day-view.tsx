"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Prisma, AppointmentStatus } from "@prisma/client";
import { toast } from "sonner";
import { updateAppointmentStatus } from "../../_actions/update-appointment-status";
import { DialogAppointment } from "../appointments/dialog-appointment";
import { Dialog } from "@/components/ui/dialog";
import { formatvalue } from "@/utils/formatValue";
import { APPOINTMENT_STATUS_META } from "@/utils/appointment-status";
import {
  buildOccupantMap,
  computeOccupancyPercent,
  expandAppointmentSlots,
} from "@/utils/slot-occupancy";
import { DayStrip } from "../appointments/day-strip";
import { AppointmentBlock } from "./appointment-block";
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

  // Uma linha por horário livre ou por agendamento (que ocupa vários horários seguidos).
  const rows = useMemo(() => {
    const result: (
      | { type: "free"; time: string }
      | { type: "appointment"; appointment: AppointmentWithService; slots: number }
    )[] = [];

    for (const slot of times) {
      const occupant = occupantMap.get(slot);
      if (!occupant) {
        result.push({ type: "free", time: slot });
      } else if (occupant.time === slot) {
        result.push({
          type: "appointment",
          appointment: occupant,
          slots: expandAppointmentSlots(occupant, times).length,
        });
      }
    }
    return result;
  }, [times, occupantMap]);

  async function handleStatusChange(appointmentId: string, status: AppointmentStatus) {
    const response = await updateAppointmentStatus({ appointmentId, status });
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success("Status atualizado!");
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
        {selectedAppointment && (
          <DialogAppointment
            appointment={selectedAppointment}
            onStatusChange={async (status) => {
              await handleStatusChange(selectedAppointment.id, status);
              setSelectedAppointment(null);
            }}
          />
        )}
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
            <div className="flex flex-col lg:h-84 lg:overflow-y-auto lg:pr-3 lg:[scrollbar-color:var(--border)_transparent] lg:[scrollbar-width:thin]">
              {rows.map((row) =>
                row.type === "free" ? (
                  <EmptySlotRow
                    key={row.time}
                    time={row.time}
                    onClick={() => onSlotClick(row.time)}
                  />
                ) : (
                  <div key={row.appointment.id} className="flex gap-3 py-1.5">
                    <span className="w-12 shrink-0 pt-3.5 font-mono text-sm font-semibold tabular-nums text-foreground">
                      {row.appointment.time}
                    </span>
                    <AppointmentBlock
                      appointment={row.appointment}
                      slots={row.slots}
                      onOpen={setSelectedAppointment}
                      onChangeStatus={handleStatusChange}
                    />
                  </div>
                ),
              )}
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
