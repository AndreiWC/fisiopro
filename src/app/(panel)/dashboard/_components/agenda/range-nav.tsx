"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface RangeNavProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function RangeNav({ label, onPrev, onNext, onToday }: RangeNavProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrev}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-secondary"
        aria-label="Anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onToday}
        className="rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
      >
        Hoje
      </button>
      <button
        type="button"
        onClick={onNext}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-secondary"
        aria-label="Próximo"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <span className="ml-1 text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}
