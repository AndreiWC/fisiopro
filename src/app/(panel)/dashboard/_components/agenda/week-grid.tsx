"use client";

import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AppointmentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { buildOccupantMap, computeOccupancyPercent } from "@/utils/slot-occupancy";
import { STATUS_META, type AppointmentWithService } from "./day-view";

interface WeekGridProps {
  times: string[];
  days: Date[];
  appointmentsByDay: Map<string, AppointmentWithService[]>;
  onSlotClick: (date: Date, time?: string) => void;
  onAppointmentClick: (appointment: AppointmentWithService) => void;
}

const STATUS_ACCENT: Record<AppointmentStatus, string> = {
  CONFIRMED: "border-l-primary",
  IN_PROGRESS: "border-l-accent-warm",
  COMPLETED: "border-l-primary",
  NO_SHOW: "border-l-destructive",
  CANCELLED: "border-l-muted-foreground",
};

export function WeekGrid({
  times,
  days,
  appointmentsByDay,
  onSlotClick,
  onAppointmentClick,
}: WeekGridProps) {
  const dayKeys = days.map((d) => format(d, "yyyy-MM-dd"));
  const occupantMaps = dayKeys.map((key) => buildOccupantMap(appointmentsByDay.get(key) ?? [], times));

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-card">
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))",
          gridTemplateRows: `auto repeat(${times.length}, minmax(2.5rem, auto))`,
        }}
      >
        <div
          className="sticky left-0 z-10 border-r border-b border-border bg-card"
          style={{ gridColumn: 1, gridRow: 1 }}
        />
        {days.map((day, d) => {
          const occupancy = computeOccupancyPercent(occupantMaps[d].size, times.length);
          const today = isToday(day);
          const weekdayLabel = format(day, "EEE", { locale: ptBR }).replace(".", "");
          return (
            <div
              key={dayKeys[d]}
              style={{ gridColumn: d + 2, gridRow: 1 }}
              className={cn(
                "border-b border-l border-border px-2 py-2 text-center",
                today && "bg-primary/5",
              )}
            >
              <p
                className={cn(
                  "text-xs font-medium text-muted-foreground",
                  today && "text-primary",
                )}
              >
                {weekdayLabel.charAt(0).toUpperCase() + weekdayLabel.slice(1)}
              </p>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums text-foreground",
                  today &&
                    "mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground",
                )}
              >
                {format(day, "dd")}
              </p>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${occupancy}%` }} />
              </div>
            </div>
          );
        })}

        {times.map((slot, i) => (
          <div
            key={`label-${slot}`}
            style={{ gridColumn: 1, gridRow: i + 2 }}
            className={cn(
              "sticky left-0 z-10 border-r border-b border-border bg-card px-2 py-1 text-right font-mono text-[11px] text-muted-foreground",
              i > 0 && slot.endsWith(":00") && "border-t-2 border-t-border",
            )}
          >
            {slot}
          </div>
        ))}

        {days.map((day, d) =>
          times.map((slot, i) => {
            const occupant = occupantMaps[d].get(slot);
            const hourMark = i > 0 && slot.endsWith(":00");
            const today = isToday(day);

            if (occupant) {
              if (occupant.time !== slot) return null; // slot de continuação, coberto pelo card que começa antes
              const requiredSlots = Math.ceil(occupant.service.duration / 30);
              const meta = STATUS_META[occupant.status];
              return (
                <button
                  key={`${dayKeys[d]}-${slot}`}
                  type="button"
                  onClick={() => onAppointmentClick(occupant)}
                  style={{ gridColumn: d + 2, gridRow: `${i + 2} / span ${requiredSlots}` }}
                  className={cn(
                    "m-0.5 overflow-hidden rounded-md border border-l-4 px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition-opacity hover:opacity-80",
                    meta.className,
                    STATUS_ACCENT[occupant.status],
                  )}
                >
                  <p className="truncate font-semibold">{occupant.customer.name}</p>
                  <p className="truncate opacity-80">{occupant.service.name}</p>
                </button>
              );
            }

            return (
              <button
                key={`${dayKeys[d]}-${slot}`}
                type="button"
                onClick={() => onSlotClick(day, slot)}
                style={{ gridColumn: d + 2, gridRow: i + 2 }}
                className={cn(
                  "border-b border-l border-border transition-colors hover:bg-primary/10",
                  hourMark && "border-t-2 border-t-border",
                  today && "bg-primary/3",
                )}
              >
                <span className="sr-only">Adicionar em {slot}</span>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
