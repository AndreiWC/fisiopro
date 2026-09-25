"use client";

import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AppointmentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { buildOccupantMap, computeOccupancyPercent } from "@/utils/slot-occupancy";
import type { AppointmentWithService } from "./day-view";

interface WeekMobileListProps {
  days: Date[];
  times: string[];
  appointmentsByDay: Map<string, AppointmentWithService[]>;
  onDayClick: (day: Date) => void;
}

const STATUS_DOT_CLASS: Record<AppointmentStatus, string> = {
  CONFIRMED: "bg-foreground/40",
  IN_PROGRESS: "bg-accent-warm",
  COMPLETED: "bg-primary",
  NO_SHOW: "bg-destructive",
  CANCELLED: "bg-muted-foreground/50",
};

export function WeekMobileList({ days, times, appointmentsByDay, onDayClick }: WeekMobileListProps) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayAppointments = appointmentsByDay.get(key) ?? [];
        const occupantMap = buildOccupantMap(dayAppointments, times);
        const occupancy = computeOccupancyPercent(occupantMap.size, times.length);
        const statuses = Array.from(new Set(dayAppointments.map((a) => a.status))).slice(0, 3);

        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onDayClick(day)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/40"
            >
              <div className="w-12 shrink-0 text-center">
                <p
                  className={cn(
                    "text-[11px] font-medium text-muted-foreground uppercase",
                    isToday(day) && "text-primary",
                  )}
                >
                  {format(day, "EEEEEE", { locale: ptBR }).replace(".", "")}
                </p>
                <p
                  className={cn(
                    "text-lg font-semibold tabular-nums text-foreground",
                    isToday(day) && "text-primary",
                  )}
                >
                  {format(day, "dd")}
                </p>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {dayAppointments.length === 0
                    ? "Livre"
                    : `${dayAppointments.length} ${dayAppointments.length === 1 ? "agendamento" : "agendamentos"}`}
                </p>
                <div className="mt-1.5 h-1 w-full max-w-40 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${occupancy}%` }} />
                </div>
              </div>

              <div className="flex shrink-0 gap-1">
                {statuses.map((status) => (
                  <span key={status} className={cn("h-2 w-2 rounded-full", STATUS_DOT_CLASS[status])} />
                ))}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
