"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Prisma } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { X, Eye } from "lucide-react";
import { toast } from "sonner";
import { cancelAppointment } from "../../_actions/cancel-appointments";
import { DialogAppointment } from "./dialog-appointment";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ButtonPickerAppointment } from "./button-date";
export type AppointmentWithService = Prisma.AppointmentsGetPayload<{
  include: {
    service: true;
  };
}>;

interface AppointmentsListProps {
  times: string[];
}

export function AppointmentsList({ times }: AppointmentsListProps) {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const queryClient = useQueryClient();
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithService | null>(null);

  const { data, isLoading, refetch } = useQuery({
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

  // Monta occupantMap slot > appointment
  // Se um Appointment começa no time (15:00) e tem requiredSlots 2
  // occupantMap["15:00", appoitment] occupantMap["15:30", appoitment]
  const occupantMap = useMemo(() => {
    const map: Record<string, AppointmentWithService> = {};

    if (data && data.length > 0) {
      for (const appointment of data) {
        // Calcular quantos slots necessarios ocupa
        const requiredSlots = Math.ceil(appointment.service.duration / 30);

        // Descobrir qual é o indice do nosso array de horarios esse agendamento começa.
        const startIndex = times.indexOf(appointment.time);

        // Se encontrou o index
        if (startIndex !== -1) {
          for (let i = 0; i < requiredSlots; i++) {
            const slotIndex = startIndex + i;

            if (slotIndex < times.length) {
              map[times[slotIndex]] = appointment;
            }
          }
        }
      }
    }
    return map;
  }, [data, times]);

  async function handleCancelAppointment(appointmentid: string) {
    const response = await cancelAppointment({ appointmentId: appointmentid });

    if (response.error) {
      toast.error(response.error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["get-appointments"] });
    refetch();
    toast.success(response.data);
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl md:text-2xl font-bold">
            Agendamentos
          </CardTitle>

          <ButtonPickerAppointment />
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[calc(100vh-20rem)] lg:h-[calc(100vh-15rem)] pr-4">
            {isLoading ? (
              <p>Carregando agenda...</p>
            ) : (
              times.map((slot) => {
                // ocupantMap["15:00"]
                const occupant = occupantMap[slot];

                if (occupant) {
                  return (
                    <div
                      key={slot}
                      className="flex items-center py-2 border-t last:border-b"
                    >
                      <div className="w-16 text-sm font-semibold">{slot}</div>
                      <div className="flex-1 text-sm">
                        <div className="font-semibold">{occupant.name}</div>
                        <div className="text-sm text-gray-500">
                          {occupant.phone}
                        </div>
                      </div>
                      <div className="ml-auto">
                        <div className="flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedAppointment(occupant)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelAppointment(occupant.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={slot}
                    className="flex items-center py-2 border-t last:border-b"
                  >
                    <div className="w-16 text-sm font-semibold">{slot}</div>
                    <div className="flex-1 text-sm">Disponível</div>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}
