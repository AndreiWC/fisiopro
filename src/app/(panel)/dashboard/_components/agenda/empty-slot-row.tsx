"use client";

import { Plus } from "lucide-react";

interface EmptySlotRowProps {
  time: string;
  onClick: () => void;
}

export function EmptySlotRow({ time, onClick }: EmptySlotRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 border-t py-3 text-left last:border-b"
    >
      <div className="w-14 shrink-0 font-mono text-sm font-semibold tabular-nums text-muted-foreground">
        {time}
      </div>
      <div className="flex flex-1 items-center gap-1.5 text-sm text-muted-foreground group-hover:text-primary">
        <Plus className="h-3.5 w-3.5" />
        Adicionar agendamento
      </div>
    </button>
  );
}
