"use client";

import { useEffect, useState } from "react";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { ScheduleTimeList } from "@/components/scheduling/schedule-time-list";
import type { TimeSlot } from "@/utils/schedule-utils";

interface StepDatetimeProps {
  organizationId: string;
  clinicTimes: string[];
  requiredSlots: number;
  date: Date;
  time: string;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
}

export function StepDatetime({
  organizationId,
  clinicTimes,
  requiredSlots,
  date,
  time,
  onDateChange,
  onTimeChange,
}: StepDatetimeProps) {
  const [blockTimes, setBlockTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const dateString = date.toISOString().split("T")[0];
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/schedule/get-appointments?organizationId=${organizationId}&date=${dateString}`,
    )
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setBlockTimes(Array.isArray(json) ? json : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, organizationId]);

  const availableTimes: TimeSlot[] = clinicTimes.map((t) => ({
    time: t,
    available: !blockTimes.includes(t),
  }));

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">Data</label>
        <Calendar
          mode="single"
          locale={ptBR}
          selected={date}
          onSelect={(next) => {
            if (!next) return;
            onDateChange(next);
            onTimeChange("");
          }}
          disabled={(d) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return d < today;
          }}
          className="mx-auto w-full rounded-xl border border-border"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-foreground">Horário</label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando horários...</p>
        ) : availableTimes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum horário disponível para este dia.</p>
        ) : (
          <ScheduleTimeList
            onSelectTime={onTimeChange}
            clinicTimes={clinicTimes}
            blockTimes={blockTimes}
            selectedDate={date}
            selectedTime={time}
            requiredSlots={requiredSlots}
            availableTimes={availableTimes}
          />
        )}
      </div>
    </div>
  );
}
