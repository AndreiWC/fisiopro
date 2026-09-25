"use client";

import { Plus } from "lucide-react";

interface EmptySlotRowProps {
  time: string;
  onClick: () => void;
}

/** Horário livre: só o horário e um traço pontilhado, para não competir com os agendamentos. */
export function EmptySlotRow({ time, onClick }: EmptySlotRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Adicionar agendamento às ${time}`}
      className="group flex min-h-11 w-full items-center gap-3 text-left"
    >
      <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {time}
      </span>
      <span className="flex flex-1 items-center gap-2">
        <span className="flex-1 border-t border-dashed border-border transition-colors group-hover:border-primary/50" />
        <Plus className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
      </span>
    </button>
  );
}
