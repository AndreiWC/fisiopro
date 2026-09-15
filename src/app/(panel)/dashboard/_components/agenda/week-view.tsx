"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Service } from "@prisma/client";
import { Dialog } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DialogAppointment } from "../appointments/dialog-appointment";
import type { AppointmentWithService } from "./day-view";
import { RangeNav } from "./range-nav";
import { SummaryCard } from "./summary-card";
import { AgendaFilters, type AgendaFiltersValue } from "./agenda-filters";
import { WeekGrid } from "./week-grid";
import { WeekMobileList } from "./week-mobile-list";
import { EmptyState } from "./empty-state";
import { formatvalue } from "@/utils/formatValue";

interface WeekViewProps {
  times: string[];
  services: Service[];
  selectedDate: Date;
  onChangeDate: (date: Date) => void;
  onSlotClick: (date: Date, time?: string) => void;
}

export function WeekView({ times, services, selectedDate, onChangeDate, onSlotClick }: WeekViewProps) {
  const dateParam = format(selectedDate, "yyyy-MM-dd");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithService | null>(
    null,
  );
  const [filters, setFilters] = useState<AgendaFiltersValue>({ serviceId: "all", status: "all" });

  const { data, isLoading } = useQuery({
    queryKey: ["get-week-appointments", dateParam],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/clinic/appointments/week?date=${dateParam}`,
      );
      const json = await response.json();
      if (!response.ok) return { appointments: [] as AppointmentWithService[] };
      return json as { appointments: AppointmentWithService[] };
    },
    staleTime: 20000,
  });

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const allAppointments = useMemo(
    () => (data?.appointments ?? []).filter((a) => a.status !== "CANCELLED"),
    [data],
  );
  const cancelledAppointments = useMemo(
    () => (data?.appointments ?? []).filter((a) => a.status === "CANCELLED"),
    [data],
  );

  const filteredAppointments = useMemo(() => {
    return allAppointments.filter((a) => {
      if (filters.serviceId !== "all" && a.serviceId !== filters.serviceId) return false;
      if (filters.status !== "all" && a.status !== filters.status) return false;
      return true;
    });
  }, [allAppointments, filters]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, AppointmentWithService[]>();
    for (const appointment of filteredAppointments) {
      const key = new Date(appointment.AppointmentDate).toISOString().slice(0, 10);
      const list = map.get(key);
      if (list) list.push(appointment);
      else map.set(key, [appointment]);
    }
    return map;
  }, [filteredAppointments]);

  const summary = useMemo(() => {
    const confirmed = filteredAppointments.filter((a) => a.status === "CONFIRMED").length;
    const revenueCents = filteredAppointments
      .filter((a) => a.status !== "NO_SHOW")
      .reduce((sum, a) => sum + a.service.price, 0);
    return {
      total: filteredAppointments.length,
      confirmed,
      cancelled: cancelledAppointments.length,
      revenue: formatvalue(revenueCents.toString()),
    };
  }, [filteredAppointments, cancelledAppointments]);

  function capitalizeFirst(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  const weekLabel = `${format(days[0], "dd")} – ${capitalizeFirst(
    format(days[6], "dd 'de' MMM", { locale: ptBR }),
  )}`;

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <Dialog
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
      >
        {selectedAppointment && <DialogAppointment appointment={selectedAppointment} />}
      </Dialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <RangeNav
          label={weekLabel}
          onPrev={() => onChangeDate(addDays(weekStart, -7))}
          onNext={() => onChangeDate(addDays(weekStart, 7))}
          onToday={() => onChangeDate(new Date())}
        />
        <AgendaFilters services={services} value={filters} onChange={setFilters} />
      </div>

      <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando semana...</p>
          ) : allAppointments.length === 0 ? (
            <EmptyState
              title="Sua semana está livre"
              description="Nenhum agendamento nesta semana ainda."
              onNewAppointment={() => onSlotClick(selectedDate)}
            />
          ) : (
            <>
              <ScrollArea className="hidden lg:block lg:h-100">
                <WeekGrid
                  times={times}
                  days={days}
                  appointmentsByDay={appointmentsByDay}
                  onSlotClick={onSlotClick}
                  onAppointmentClick={setSelectedAppointment}
                />
              </ScrollArea>
              <div className="lg:hidden">
                <WeekMobileList
                  days={days}
                  times={times}
                  appointmentsByDay={appointmentsByDay}
                  onDayClick={onChangeDate}
                />
              </div>
            </>
          )}
        </div>

        <SummaryCard
          title="Resumo da semana"
          total={summary.total}
          confirmed={summary.confirmed}
          cancelled={summary.cancelled}
          revenue={summary.revenue}
        />
      </div>
    </div>
  );
}
