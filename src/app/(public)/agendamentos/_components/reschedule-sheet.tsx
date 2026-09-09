"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { ScheduleTimeList } from "@/components/scheduling/schedule-time-list";
import type { TimeSlot } from "@/utils/schedule-utils";
import { rescheduleMyAppointment } from "../_actions/reschedule-my-appointment";
import type { MyAppointment } from "../_actions/find-my-appointments";

interface RescheduleSheetProps {
  appointment: MyAppointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRescheduled: () => void;
}

function dateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function RescheduleSheet({
  appointment,
  open,
  onOpenChange,
  onRescheduled,
}: RescheduleSheetProps) {
  const [date, setDate] = useState<Date>(new Date(appointment.AppointmentDate));
  const [selectedTime, setSelectedTime] = useState("");
  const [blockedTimes, setBlockedTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  const clinicTimes = appointment.organization.times ?? [];
  const requiredSlots = Math.ceil(appointment.service.duration / 30);

  useEffect(() => {
    if (!open) return;
    setDate(new Date(appointment.AppointmentDate));
    setSelectedTime("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment.id]);

  useEffect(() => {
    if (!open) return;
    setLoadingSlots(true);
    setSelectedTime("");
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/schedule/get-appointments?organizationId=${appointment.organization.id}&date=${dateParam(date)}&excludeAppointmentId=${appointment.id}`,
    )
      .then((res) => res.json())
      .then((blocked) => setBlockedTimes(Array.isArray(blocked) ? blocked : []))
      .catch(() => setBlockedTimes([]))
      .finally(() => setLoadingSlots(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date, appointment.id, appointment.organization.id]);

  const availableTimes: TimeSlot[] = clinicTimes.map((time) => ({
    time,
    available: !blockedTimes.includes(time),
  }));

  async function handleConfirm() {
    if (!selectedTime) return;
    setSaving(true);
    const response = await rescheduleMyAppointment({
      appointmentId: appointment.id,
      date,
      time: selectedTime,
    });
    setSaving(false);

    if (response.error) {
      toast.error(response.error);
      return;
    }

    toast.success(response.data);
    onOpenChange(false);
    onRescheduled();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Remarcar {appointment.service.name}</DialogTitle>
          <DialogDescription>
            Escolha o novo dia e horário na {appointment.organization.name}.
          </DialogDescription>
        </DialogHeader>

        <Calendar
          mode="single"
          locale={ptBR}
          selected={date}
          onSelect={(newDate) => newDate && setDate(newDate)}
          disabled={(d) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return d < today;
          }}
          className="mx-auto w-full rounded-xl border border-border"
        />

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">
            {format(date, "dd 'de' MMMM", { locale: ptBR })}
          </p>
          {loadingSlots ? (
            <p className="text-sm text-muted-foreground">Carregando horários...</p>
          ) : availableTimes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum horário disponível para este dia.
            </p>
          ) : (
            <ScheduleTimeList
              onSelectTime={setSelectedTime}
              clinicTimes={clinicTimes}
              blockTimes={blockedTimes}
              selectedDate={date}
              selectedTime={selectedTime}
              requiredSlots={requiredSlots}
              availableTimes={availableTimes}
            />
          )}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedTime || saving}
          className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Remarcando..." : "Confirmar novo horário"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
