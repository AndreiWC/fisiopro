"use client";

import type { Segment } from "@prisma/client";
import {
  Activity,
  Flower2,
  Scissors,
  Smile,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { SEGMENT_OPTIONS } from "@/utils/segments";
import { cn } from "@/lib/utils";

const SEGMENT_ICONS: Record<Segment, LucideIcon> = {
  BARBEARIA: Scissors,
  SALAO_BELEZA: Sparkles,
  CLINICA_ESTETICA: Flower2,
  FISIOTERAPIA: Activity,
  ODONTOLOGIA: Smile,
  MEDICO: Stethoscope,
};

interface CategoryGridProps {
  counts: Record<Segment, number>;
  activeSegment: Segment | null;
  onSelect: (segment: Segment | null) => void;
}

export function CategoryGrid({ counts, activeSegment, onSelect }: CategoryGridProps) {
  return (
    <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Explore por categoria
        </h2>
        {activeSegment && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver todas
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SEGMENT_OPTIONS.map(({ value, label }) => {
          const Icon = SEGMENT_ICONS[value];
          const isActive = activeSegment === value;
          const count = counts[value] ?? 0;

          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(isActive ? null : value)}
              aria-pressed={isActive}
              disabled={count === 0}
              className={cn(
                "group flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                isActive
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground group-hover:bg-primary/10 group-hover:text-primary",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{label}</span>
                <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                  {count === 0 ? "em breve" : `${count} ${count === 1 ? "profissional" : "profissionais"}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
