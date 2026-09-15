import type { ComponentType } from "react";
import { Calendar, CheckCircle2, Gauge, Wallet, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  total: number;
  confirmed: number;
  cancelled: number;
  revenue: string;
  occupancy?: number;
}

const TONE_CLASS = {
  primary: "bg-primary/10 text-primary",
  destructive: "bg-destructive/10 text-destructive",
  "chart-4": "bg-chart-4/10 text-chart-4",
  "chart-5": "bg-chart-5/10 text-chart-5",
} as const;

function StatRow({
  icon: Icon,
  label,
  value,
  tone,
  mono,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: keyof typeof TONE_CLASS;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          TONE_CLASS[tone],
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className={cn("truncate text-sm font-semibold text-foreground", mono && "font-mono")}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function SummaryCard({
  title,
  total,
  confirmed,
  cancelled,
  revenue,
  occupancy,
}: SummaryCardProps) {
  return (
    <div className="w-full shrink-0 rounded-2xl border border-border bg-card p-3.5 lg:w-44">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-3 space-y-2.5">
        <StatRow icon={Calendar} label="Total" value={String(total)} tone="primary" />
        <StatRow icon={CheckCircle2} label="Confirmados" value={String(confirmed)} tone="primary" />
        <StatRow icon={XCircle} label="Cancelados" value={String(cancelled)} tone="destructive" />
        <StatRow icon={Wallet} label="Previsto" value={revenue} tone="chart-4" mono />
        {occupancy !== undefined && (
          <StatRow icon={Gauge} label="Ocupação" value={`${occupancy}%`} tone="chart-5" />
        )}
      </div>
    </div>
  );
}
