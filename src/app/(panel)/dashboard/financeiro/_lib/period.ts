import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type FinancePeriod = "ESTE_MES" | "ULTIMOS_3_MESES" | "ULTIMOS_6_MESES" | "ESTE_ANO";

export const PERIOD_OPTIONS: { value: FinancePeriod; label: string }[] = [
  { value: "ESTE_MES", label: "Este mês" },
  { value: "ULTIMOS_3_MESES", label: "Últimos 3 meses" },
  { value: "ULTIMOS_6_MESES", label: "Últimos 6 meses" },
  { value: "ESTE_ANO", label: "Este ano" },
];

export function isFinancePeriod(value: string | undefined): value is FinancePeriod {
  return PERIOD_OPTIONS.some((option) => option.value === value);
}

export interface PeriodBucket {
  label: string;
  start: Date;
  end: Date;
}

export interface PeriodRange {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  buckets: PeriodBucket[];
}

function clampEnd(date: Date, cap: Date) {
  return date > cap ? cap : date;
}

/** Início/fim do período atual (a partir de `now`), o período anterior de mesma duração para comparação, e os buckets do gráfico. */
export function getPeriodRange(period: FinancePeriod, now: Date = new Date()): PeriodRange {
  const currentEnd = endOfDay(now);
  let currentStart: Date;
  let buckets: PeriodBucket[];

  switch (period) {
    case "ESTE_MES": {
      currentStart = startOfMonth(now);
      buckets = eachDayOfInterval({ start: currentStart, end: currentEnd }).map((day) => ({
        label: format(day, "dd/MM", { locale: ptBR }),
        start: startOfDay(day),
        end: endOfDay(day),
      }));
      break;
    }
    case "ULTIMOS_3_MESES":
    case "ULTIMOS_6_MESES": {
      const monthsBack = period === "ULTIMOS_3_MESES" ? 3 : 6;
      currentStart = startOfMonth(subMonths(now, monthsBack - 1));
      buckets = eachWeekOfInterval({ start: currentStart, end: currentEnd }, { weekStartsOn: 1 }).map(
        (weekStart) => {
          const start = weekStart < currentStart ? currentStart : weekStart;
          const end = clampEnd(endOfWeek(weekStart, { weekStartsOn: 1 }), currentEnd);
          return {
            label: format(start, "dd/MM", { locale: ptBR }),
            start: startOfDay(start),
            end: endOfDay(end),
          };
        },
      );
      break;
    }
    case "ESTE_ANO": {
      currentStart = startOfYear(now);
      buckets = eachMonthOfInterval({ start: currentStart, end: currentEnd }).map((month) => ({
        label: format(month, "MMM", { locale: ptBR }),
        start: startOfMonth(month),
        end: clampEnd(endOfMonth(month), currentEnd),
      }));
      break;
    }
  }

  // Período anterior: mesma quantidade de dias, imediatamente antes do período atual.
  const spanDays = differenceInCalendarDays(currentEnd, currentStart) + 1;
  const previousEnd = endOfDay(subDays(currentStart, 1));
  const previousStart = startOfDay(subDays(previousEnd, spanDays - 1));

  return { currentStart, currentEnd, previousStart, previousEnd, buckets };
}
