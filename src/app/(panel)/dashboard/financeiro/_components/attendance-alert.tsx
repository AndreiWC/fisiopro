import { AlertTriangle } from "lucide-react";
import type { FinancialSummary } from "../_data-access/get-financial-summary";

interface AttendanceAlertProps {
  summary: FinancialSummary;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percentFormatter = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

export function AttendanceAlert({ summary }: AttendanceAlertProps) {
  const totalMissed = summary.noShowCount + summary.cancelledCount;

  if (totalMissed === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent-warm/30 bg-accent/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-2 text-accent-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="font-medium">
          {summary.noShowCount} {summary.noShowCount === 1 ? "falta" : "faltas"} ·{" "}
          {summary.cancelledCount} {summary.cancelledCount === 1 ? "cancelamento" : "cancelamentos"}
        </span>
      </div>
      <span className="font-mono font-medium text-foreground">
        {currencyFormatter.format(summary.lostRevenue / 100)} em receita perdida
      </span>
      {summary.attendanceRate !== null && (
        <span className="font-mono text-muted-foreground">
          {percentFormatter.format(summary.attendanceRate)} de comparecimento
        </span>
      )}
    </div>
  );
}
