"use client";
import { useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("pt-BR", ptBR);

interface DateTimerPickerProps {
  minDate?: Date;
  className?: string;
  initialDate?: Date;
  onChange?: (date: Date) => void;
}
export function DateTimerPicker({
  minDate,
  className,
  initialDate,
  onChange,
}: DateTimerPickerProps) {
  const [startDate, setStartDate] = useState(initialDate || new Date());

  function handleChange(date: Date | null) {
    if (date) {
      setStartDate(date);
      onChange?.(date);
    }
  }

  return (
    <DatePicker
      className={className}
      minDate={minDate}
      locale="pt-BR"
      selected={startDate}
      dateFormat="dd/MM/yyyy"
      onChange={handleChange}
    />
  );
}
