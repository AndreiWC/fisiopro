import type { AppointmentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUS_META } from "@/utils/appointment-status";

const TONES: Record<AppointmentStatus, { className: string; dotClassName: string }> = {
  CONFIRMED: { className: "bg-muted text-foreground", dotClassName: "bg-foreground/40" },
  IN_PROGRESS: { className: "bg-accent text-accent-foreground", dotClassName: "bg-accent-warm" },
  COMPLETED: { className: "bg-primary/10 text-primary", dotClassName: "bg-primary" },
  NO_SHOW: { className: "bg-destructive/10 text-destructive", dotClassName: "bg-destructive" },
  CANCELLED: { className: "bg-muted text-muted-foreground", dotClassName: "bg-muted-foreground/60" },
};

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export function AppointmentStatusBadge({ status, className }: AppointmentStatusBadgeProps) {
  const tone = TONES[status];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone.className,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", tone.dotClassName)} />
      {APPOINTMENT_STATUS_META[status].label}
    </span>
  );
}
