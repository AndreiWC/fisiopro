"use client";

import { useCallback, useEffect, useState } from "react";
import type { Prisma } from "@prisma/client";
import { ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppointmentForm, AppointmentFormData } from "./schedule-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { formatPhone } from "@/utils/formatPhone";
import { formatvalue } from "@/utils/formatValue";
import { createNewAppointment } from "../_action/create-appointments";
import { toast } from "sonner";
import { ScheduleTimeList } from "@/components/scheduling/schedule-time-list";
import { TimeSlot } from "@/utils/schedule-utils";
import { StepIndicator } from "./step-indicator";
import { cn } from "@/lib/utils";

type OrganizationWithServiceAndSubscriptions = Prisma.OrganizationGetPayload<{
  include: {
    services: true;
    subscription: true;
  };
}>;

interface BookingWizardProps {
  clinic: OrganizationWithServiceAndSubscriptions;
  initialServiceId?: string;
  onDone: () => void;
  knownPatient?: { name: string | null; email: string | null; phone: string | null };
}

const STEPS = ["Serviço", "Data e horário", "Seus dados"];

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}min`;
}

export function BookingWizard({ clinic, initialServiceId, onDone, knownPatient }: BookingWizardProps) {
  const form = useAppointmentForm(knownPatient);
  const { watch, setValue } = form;

  const [stepIndex, setStepIndex] = useState(initialServiceId ? 1 : 0);
  const [selectedTime, setSelectedTime] = useState("");
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [blockTimes, setBlockTimes] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const activeServices = clinic.services.filter((s) => s.status);
  const selectedServiceId = watch("serviceId");
  const selectedService = activeServices.find((s) => s.id === selectedServiceId);
  const selectedDate = watch("date");

  useEffect(() => {
    setIsMounted(true);
    if (initialServiceId) {
      setValue("serviceId", initialServiceId, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBlockedTimes = useCallback(
    async (date: Date): Promise<string[]> => {
      setLoadingSlots(true);
      try {
        const dateString = date.toISOString().split("T")[0];
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/schedule/get-appointments?organizationId=${clinic.id}&date=${dateString}`,
        );
        const json = await response.json();
        setLoadingSlots(false);
        return Array.isArray(json) ? json : [];
      } catch {
        setLoadingSlots(false);
        return [];
      }
    },
    [clinic.id],
  );

  useEffect(() => {
    if (selectedDate) {
      fetchBlockedTimes(selectedDate).then((blocked) => setBlockTimes(blocked));
    }
  }, [selectedDate, fetchBlockedTimes]);

  useEffect(() => {
    const times = clinic.times || [];
    const finalSlots = times.map((time) => ({
      time,
      available: !blockTimes.includes(time),
    }));
    setAvailableTimeSlots(finalSlots);

    const stillAvailable = finalSlots.find(
      (slot) => slot.time === selectedTime && slot.available,
    );
    if (selectedTime && !stillAvailable) {
      setSelectedTime("");
      setValue("time", "", { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockTimes, clinic.times]);

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    if (stepIndex === 0) {
      onDone();
      return;
    }
    setStepIndex((i) => i - 1);
  }

  async function handleRegisterAppointment(formData: AppointmentFormData) {
    if (!selectedTime) return;

    const response = await createNewAppointment({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      date: formData.date,
      serviceId: formData.serviceId,
      time: selectedTime,
      organizationId: clinic.id,
    });

    if (response.error) {
      toast.error(response.error);
      return;
    }

    toast.success("Agendamento criado com sucesso!");
    form.reset();
    setSelectedTime("");
    onDone();
  }

  const requiredSlots = selectedService ? Math.ceil(selectedService.duration / 30) : 1;
  const canConfirm = Boolean(watch("name") && watch("email") && watch("phone") && selectedTime);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-secondary"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Novo agendamento</p>
            <p className="truncate text-xs text-muted-foreground">
              {clinic.name} · passo {stepIndex + 1} de {STEPS.length}
            </p>
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-2xl">
          <StepIndicator steps={STEPS} currentIndex={stepIndex} />
        </div>
      </header>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleRegisterAppointment)}
          className="mx-auto w-full max-w-2xl flex-1 px-4 py-6"
        >
          {stepIndex === 0 && (
            <ul className="space-y-2">
              {activeServices.map((service) => {
                const isActive = service.id === selectedServiceId;
                return (
                  <li key={service.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setValue("serviceId", service.id, { shouldValidate: true });
                        goNext();
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors",
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-secondary/40",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(service.duration)}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
                        {formatvalue(service.price.toString())}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {stepIndex === 1 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-semibold">Escolha a data</FormLabel>
                      {clinic.timezone && (
                        <span className="text-xs text-muted-foreground">
                          Fuso: {clinic.timezone}
                        </span>
                      )}
                    </div>
                    <FormControl>
                      {isMounted ? (
                        <Calendar
                          mode="single"
                          locale={ptBR}
                          selected={field.value}
                          onSelect={(date) => {
                            if (!date) return;
                            field.onChange(date);
                            setSelectedTime("");
                            setValue("time", "", { shouldValidate: false });
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          className="mx-auto w-full rounded-xl border border-border"
                        />
                      ) : (
                        <div className="h-72 w-full rounded-xl border border-border bg-muted/40" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="block font-semibold">Horários disponíveis</label>
                {loadingSlots ? (
                  <p className="text-sm text-muted-foreground">Carregando horários...</p>
                ) : availableTimeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum horário disponível para este dia.
                  </p>
                ) : (
                  <ScheduleTimeList
                    onSelectTime={(time) => {
                      setSelectedTime(time);
                      setValue("time", time, { shouldValidate: true });
                      goNext();
                    }}
                    clinicTimes={clinic.times}
                    blockTimes={blockTimes}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    requiredSlots={requiredSlots}
                    availableTimes={availableTimeSlots}
                  />
                )}
              </div>
            </div>
          )}

          {stepIndex === 2 && (
            <div className="space-y-6">
              {selectedService && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="font-medium text-foreground">{selectedService.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} ·{" "}
                    <span className="font-mono">{selectedTime}</span>
                  </p>
                  <p className="mt-2 font-mono text-lg font-semibold text-primary">
                    {formatvalue(selectedService.price.toString())}
                  </p>
                </div>
              )}

              {knownPatient && (
                <p className="text-sm text-muted-foreground">
                  Preenchemos com os dados da sua conta — pode ajustar se for para outra pessoa.
                </p>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Telefone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="(00) 00000-0000"
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </form>
      </Form>

      {stepIndex > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {selectedService?.name}
              </p>
              {selectedTime && (
                <p className="text-xs text-muted-foreground">
                  {format(selectedDate, "dd/MM")} · {selectedTime}
                </p>
              )}
            </div>
            {stepIndex === 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!selectedTime}
                className="shrink-0 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={form.handleSubmit(handleRegisterAppointment)}
                disabled={!canConfirm}
                className="shrink-0 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmar agendamento
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
