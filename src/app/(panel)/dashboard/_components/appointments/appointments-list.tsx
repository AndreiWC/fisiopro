"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Prisma, AppointmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { updateAppointmentStatus } from "../../_actions/update-appointment-status";
import { DialogAppointment } from "./dialog-appointment";
import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatvalue } from "@/utils/formatValue";
import { APPOINTMENT_STATUS_META } from "@/utils/appointment-status";
import { DayStrip } from "./day-strip";

export type AppointmentWithService = Prisma.AppointmentsGetPayload<{
  include: {
    service: true;
  };
}>;

interface AppointmentsListProps {
  times: string[];
  userId: string;
}

export const STATUS_META = APPOINTMENT_STATUS_META;

export function AppointmentsList({ times, userId }: AppointmentsListProps) {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const queryClient = useQueryClient();
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithService | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["get-appointments", date],
    queryFn: async () => {
      let activeDate = date;

      if (!activeDate) {
        const today = format(new Date(), "yyyy-MM-dd");
        activeDate = today;
      }

      const url = `${process.env.NEXT_PUBLIC_BASE_URL}/api/clinic/appointments?date=${activeDate}`;

      const response = await fetch(url);

      const json = (await response.json()) as AppointmentWithService[];

      if (!response.ok) {
        return [];
      }

      return json;
    },
    staleTime: 20000, // 20 segundos
    refetchInterval: 60000, //60 segundos
  });

  const appointments = data ?? [];

  // Monta occupantMap slot > appointment
  const occupantMap = useMemo(() => {
    const map: Record<string, AppointmentWithService> = {};

    for (const appointment of appointments) {
      const requiredSlots = Math.ceil(appointment.service.duration / 30);
      const startIndex = times.indexOf(appointment.time);

      if (startIndex !== -1) {
        for (let i = 0; i < requiredSlots; i++) {
          const slotIndex = startIndex + i;
          if (slotIndex < times.length) {
            map[times[slotIndex]] = appointment;
          }
        }
      }
    }
    return map;
  }, [appointments, times]);

  const stats = useMemo(() => {
    const occupiedSlots = Object.keys(occupantMap).length;
    const occupancy = times.length > 0 ? Math.round((occupiedSlots / times.length) * 100) : 0;
    const confirmed = appointments.filter((a) => a.status === "CONFIRMED").length;
    const revenueCents = appointments
      .filter((a) => a.status !== "NO_SHOW")
      .reduce((sum, a) => sum + a.service.price, 0);

    return {
      total: appointments.length,
      occupancy,
      confirmed,
      revenue: formatvalue(revenueCents.toString()),
    };
  }, [appointments, occupantMap, times.length]);

  async function handleStatusChange(appointmentId: string, status: AppointmentStatus) {
    const response = await updateAppointmentStatus({ appointmentId, status });
    if (response.error) {
      toast.error(response.error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["get-appointments"] });
  }

  return (
    <>
      <Dialog
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
      >
        {selectedAppointment && (
          <DialogAppointment appointment={selectedAppointment} />
        )}
      </Dialog>
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold md:text-2xl">Agenda</CardTitle>
          </div>
          <DayStrip />
        </CardHeader>

        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Atendimentos" value={String(stats.total)} />
            <StatTile label="Ocupação" value={`${stats.occupancy}%`} />
            <StatTile label="Confirmados" value={String(stats.confirmed)} />
            <StatTile label="Previsto" value={stats.revenue} mono />
          </div>

          <ScrollArea className="h-[calc(100vh-28rem)] pr-4 lg:h-[calc(100vh-24rem)]">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando agenda...</p>
            ) : (
              times.map((slot) => {
                const occupant = occupantMap[slot];

                if (occupant) {
                  const meta = STATUS_META[occupant.status];
                  const isSlotStart = occupant.time === slot;
                  if (!isSlotStart) return null;

                  return (
                    <div
                      key={slot}
                      className="flex items-center gap-3 border-t py-3 last:border-b"
                    >
                      <div className="w-14 shrink-0 font-mono text-sm font-semibold tabular-nums">
                        {slot}
                      </div>
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="truncate font-semibold">{occupant.name}</div>
                        <div className="truncate text-sm text-muted-foreground">
                          {occupant.service.name}
                        </div>
                      </div>
                      <Select
                        value={occupant.status}
                        onValueChange={(value) =>
                          handleStatusChange(occupant.id, value as AppointmentStatus)
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "h-7 w-fit shrink-0 gap-1 rounded-full px-2.5 text-xs font-medium shadow-none",
                            meta.className,
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {(Object.keys(STATUS_META) as AppointmentStatus[]).map(
                            (status) => (
                              <SelectItem key={status} value={status}>
                                {STATUS_META[status].label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setSelectedAppointment(occupant)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                }

                return (
                  <Link
                    key={slot}
                    href={`/clinica/${userId}`}
                    target="_blank"
                    className="group flex items-center gap-3 border-t py-3 last:border-b"
                  >
                    <div className="w-14 shrink-0 font-mono text-sm font-semibold tabular-nums text-muted-foreground">
                      {slot}
                    </div>
                    <div className="flex flex-1 items-center gap-1.5 text-sm text-muted-foreground group-hover:text-primary">
                      <Plus className="h-3.5 w-3.5" />
                      Disponível — toque para encaixar
                    </div>
                  </Link>
                );
              })
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}

function StatTile({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold text-foreground", mono && "font-mono")}>
        {value}
      </p>
    </div>
  );
}
