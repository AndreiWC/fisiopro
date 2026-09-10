"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { PERIOD_OPTIONS, type FinancePeriod } from "../_lib/period";

interface PeriodSelectorProps {
  value: FinancePeriod;
}

export function PeriodSelector({ value }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(period: FinancePeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodo", period);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleChange(option.value)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
            value === option.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-secondary",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
