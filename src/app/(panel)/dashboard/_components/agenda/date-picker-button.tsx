"use client";

import { useState } from "react";
import { ptBR } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerButtonProps {
  date: Date;
  onChange: (date: Date) => void;
}

export function DatePickerButton({ date, onChange }: DatePickerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Escolher data"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={date}
          defaultMonth={date}
          onSelect={(next) => {
            if (!next) return;
            onChange(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
