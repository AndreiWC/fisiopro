import type { AppointmentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STATUS_DOT_CLASS: Record<AppointmentStatus, string> = {
  CONFIRMED: "bg-foreground/40",
  IN_PROGRESS: "bg-accent-warm",
  COMPLETED: "bg-primary",
  NO_SHOW: "bg-destructive",
  CANCELLED: "bg-muted-foreground/50",
};

interface MonthDayCellProps {
  day: Date;
  inCurrentMonth: boolean;
  total: number;
  occupancyPercent: number;
  byStatus?: Record<string, number>;
  loading?: boolean;
  onClick: () => void;
}

export function MonthDayCell({
  day,
  inCurrentMonth,
  total,
  occupancyPercent,
  byStatus,
  loading,
  onClick,
}: MonthDayCellProps) {
  const statuses = byStatus
    ? Object.entries(byStatus)
        .filter(([, count]) => count > 0)
        .map(([status]) => status as AppointmentStatus)
        .slice(0, 3)
    : [];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-20 flex-col items-start gap-1 border-t border-l border-border p-2 text-left transition-colors hover:bg-secondary/40",
        !inCurrentMonth && "bg-muted/30 text-muted-foreground",
      )}
    >
      <span className="text-sm font-medium tabular-nums">{day.getDate()}</span>
      {!loading && total > 0 && (
        <>
          <span className="text-[11px] text-muted-foreground">{total} agend.</span>
          <div className="flex gap-1">
            {statuses.map((status) => (
              <span key={status} className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_CLASS[status])} />
            ))}
          </div>
          <div className="mt-auto h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${occupancyPercent}%` }} />
          </div>
        </>
      )}
    </button>
  );
}
