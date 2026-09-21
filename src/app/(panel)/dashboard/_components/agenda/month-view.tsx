"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { RangeNav } from "./range-nav";
import { SummaryCard } from "./summary-card";
import { MonthDayCell } from "./month-day-cell";
import { formatvalue } from "@/utils/formatValue";

interface MonthDaySummary {
  date: string;
  total: number;
  byStatus: Record<string, number>;
  occupancyPercent: number;
  revenueProjected: number;
}

interface MonthViewProps {
  selectedDate: Date;
  onChangeDate: (date: Date) => void;
  onDayClick: (date: Date) => void;
}

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function MonthView({ selectedDate, onChangeDate, onDayClick }: MonthViewProps) {
  const dateParam = format(selectedDate, "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["get-month-appointments-summary", dateParam],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/clinic/appointments/month?date=${dateParam}`,
      );
      const json = await response.json();
      if (!response.ok) return { days: [] as MonthDaySummary[] };
      return json as { days: MonthDaySummary[] };
    },
    staleTime: 30000,
  });

  const days = data?.days ?? [];
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const gridDays = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  );

  const summary = useMemo(() => {
    let total = 0;
    let confirmed = 0;
    let cancelled = 0;
    let revenueCents = 0;
    for (const day of days) {
      total += day.total;
      confirmed += day.byStatus.CONFIRMED ?? 0;
      cancelled += day.byStatus.CANCELLED ?? 0;
      revenueCents += day.revenueProjected;
    }
    return { total, confirmed, cancelled, revenue: formatvalue(revenueCents.toString()) };
  }, [days]);

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <RangeNav
        label={capitalizeFirst(format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR }))}
        onPrev={() => onChangeDate(addMonths(selectedDate, -1))}
        onNext={() => onChangeDate(addMonths(selectedDate, 1))}
        onToday={() => onChangeDate(new Date())}
      />

      <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card lg:min-h-0">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="overflow-y-auto lg:h-100">
            <div className="grid grid-cols-7">
              {gridDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const summaryForDay = byDate.get(key);
                return (
                  <MonthDayCell
                    key={key}
                    day={day}
                    inCurrentMonth={isSameMonth(day, selectedDate)}
                    total={summaryForDay?.total ?? 0}
                    occupancyPercent={summaryForDay?.occupancyPercent ?? 0}
                    byStatus={summaryForDay?.byStatus}
                    loading={isLoading}
                    onClick={() => onDayClick(day)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <SummaryCard
          title="Resumo do mês"
          total={summary.total}
          confirmed={summary.confirmed}
          cancelled={summary.cancelled}
          revenue={summary.revenue}
        />
      </div>
    </div>
  );
}
