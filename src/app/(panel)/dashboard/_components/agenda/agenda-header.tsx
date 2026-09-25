"use client";

import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DatePickerButton } from "./date-picker-button";

export type AgendaView = "day" | "week" | "month";

const VIEW_LABELS: Record<AgendaView, string> = { day: "Dia", week: "Semana", month: "Mês" };

interface AgendaHeaderProps {
  view: AgendaView;
  selectedDate: Date;
  onChangeView: (view: AgendaView) => void;
  onChangeDate: (date: Date) => void;
  onNewAppointment: () => void;
}

function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function AgendaHeader({
  view,
  selectedDate,
  onChangeView,
  onChangeDate,
  onNewAppointment,
}: AgendaHeaderProps) {
  const dateLabel =
    view === "day"
      ? capitalizeFirst(format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR }))
      : capitalizeFirst(format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <DatePickerButton
            date={selectedDate}
            onChange={onChangeDate}
            align="start"
            className="h-10 w-10 rounded-full border-transparent bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
          />
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Agenda</h1>
            <p className="text-sm text-muted-foreground">{dateLabel}</p>
          </div>
        </div>

        <Button className="hidden gap-2 md:inline-flex" onClick={onNewAppointment}>
          <Plus className="h-4 w-4" />
          Novo agendamento
        </Button>
      </div>

      <div className="grid grid-cols-3 rounded-full border border-border bg-muted/50 p-1 sm:max-w-sm">
        {(Object.keys(VIEW_LABELS) as AgendaView[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChangeView(key)}
            aria-pressed={view === key}
            className={cn(
              "rounded-full py-2 text-sm font-medium transition-colors",
              view === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {VIEW_LABELS[key]}
          </button>
        ))}
      </div>
    </div>
  );
}
