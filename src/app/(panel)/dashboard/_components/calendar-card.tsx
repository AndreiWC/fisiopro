"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function parseDateParam(value: string | null) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function CalendarCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = parseDateParam(searchParams.get("date"));

  function selectDate(date: Date) {
    const url = new URL(window.location.href);
    url.searchParams.set("date", format(date, "yyyy-MM-dd"));
    router.push(url.toString());
  }

  return (
    <Card className="gap-2 p-2">
      <CardHeader className="px-2 pt-1 pb-0">
        <CardTitle className="text-base font-semibold">Calendário</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center px-0 pb-1">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => date && selectDate(date)}
          className="p-0"
        />
      </CardContent>
    </Card>
  );
}
