"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import type { Service } from "@prisma/client";
import { AgendaHeader, type AgendaView } from "./agenda-header";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";
import { NewAppointmentSheet } from "./new-appointment/new-appointment-sheet";

interface AgendaShellProps {
  organizationId: string;
  times: string[];
  services: Service[];
}

function parseDateParam(value: string | null) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AgendaShell({ organizationId, times, services }: AgendaShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as AgendaView | null) ?? "day";
  const selectedDate = parseDateParam(searchParams.get("date"));

  const [creating, setCreating] = useState<{ date: Date; time?: string } | null>(null);

  function setParams(patch: Record<string, string>) {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(patch)) {
      url.searchParams.set(key, value);
    }
    router.push(url.toString());
  }

  function changeDate(date: Date) {
    setParams({ date: formatDateParam(date) });
  }

  function openCreate(date: Date, time?: string) {
    setCreating({ date, time });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col rounded-2xl border border-border bg-card p-4 sm:p-5 lg:h-[38rem] lg:overflow-hidden">
        <AgendaHeader
          view={view}
          selectedDate={selectedDate}
          onChangeView={(next) => setParams({ view: next })}
          onChangeDate={changeDate}
          onNewAppointment={() => openCreate(selectedDate)}
        />

        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          {view === "day" && (
            <DayView times={times} onSlotClick={(time) => openCreate(selectedDate, time)} />
          )}
          {view === "week" && (
            <WeekView
              times={times}
              services={services}
              selectedDate={selectedDate}
              onChangeDate={changeDate}
              onSlotClick={openCreate}
            />
          )}
          {view === "month" && (
            <MonthView
              selectedDate={selectedDate}
              onChangeDate={changeDate}
              onDayClick={(date) => setParams({ date: formatDateParam(date), view: "day" })}
            />
          )}
        </div>
      </div>

      <NewAppointmentSheet
        open={!!creating}
        onOpenChange={(open) => !open && setCreating(null)}
        organizationId={organizationId}
        times={times}
        services={services}
        initialDate={creating?.date}
        initialTime={creating?.time}
      />

      <button
        type="button"
        onClick={() => openCreate(selectedDate)}
        aria-label="Novo agendamento"
        className="fixed right-4 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
