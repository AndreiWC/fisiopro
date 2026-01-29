"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Mantendo a interface exata para não quebrar seu código
interface DateTimerPickerProps {
  initialDate?: Date;
  onChange?: (date: Date | undefined) => void;
  className?: string;
  minDate?: Date;
}

export function DateTimerPicker({
  initialDate,
  onChange,
  className,
  minDate,
}: DateTimerPickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(initialDate);
  const [isOpen, setIsOpen] = React.useState(false);

  // Sincroniza se a data vier de fora (ex: editar um agendamento)
  React.useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  const handleSelectDate = (selectedDay: Date | undefined) => {
    setDate(selectedDay);
    if (onChange) onChange(selectedDay);

    // Como é só data, podemos fechar o popover automaticamente após a seleção
    // para melhorar a UX
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal border-input",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            // Formatação apenas para Data
            format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
          ) : (
            <span>Selecione uma data</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelectDate}
          disabled={(d) => (minDate ? d < minDate : false)}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}
