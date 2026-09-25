import type { CustomerStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PATIENT_STATUS_META } from "../_lib/patient-status";

interface PatientStatusBadgeProps {
  status: CustomerStatus;
  className?: string;
}

export function PatientStatusBadge({ status, className }: PatientStatusBadgeProps) {
  const meta = PATIENT_STATUS_META[status];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        meta.className,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", meta.dotClassName)} />
      {meta.label}
    </span>
  );
}
