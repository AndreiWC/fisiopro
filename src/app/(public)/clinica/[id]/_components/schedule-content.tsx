"use client";

import Image from "next/image";
import imgTest from "../../../../../../public/profissional.png";
import { MapPin } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { useAppointmentForm, AppointmentFormData } from "./schedule-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatPhone } from "@/utils/formatPhone";
//import { DateTimerPicker } from "./date-picker";
import { DateTimerPicker } from "./DateTimePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tr } from "zod/v4/locales";
import { useState, useCallback, useEffect } from "react";
import { ScheduleTimeList } from "./schedule-time-list";
import { createNewAppointment } from "../_action/create-appointments";
import { toast } from "sonner";
import { se } from "date-fns/locale";
type UserWithServiceAndSubscriptions = Prisma.UserGetPayload<{
  include: {
    services: true;
    subscription: true;
  };
}>;

interface ScheduleContentProps {
  clinic: UserWithServiceAndSubscriptions;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}
export function ScheduleContent({ clinic }: ScheduleContentProps) {
  const form = useAppointmentForm();
  const { watch, setValue } = form;

  const selectedDate = watch("date");
  const selectedServiceId = watch("serviceId");

  const [selectedTime, setSelectedTime] = useState("");
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  // Quais os horários bloqueados 01/02/2025 > ["15:00", "18:00"]
  const [blockTimes, setBlockTimes] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Função que busca os horários bloqueados (via Fetch HTTP)
  const fetchBlockedTimes = useCallback(
    async (date: Date): Promise<string[]> => {
      setLoadingSlots(true);
      try {
        const dateString = date.toISOString().split("T")[0];
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/schedule/get-appointments?userId=${clinic.id}&date=${dateString}`,
        );

        const json = await response.json();
        setLoadingSlots(false);
        return json; // Retornar o array com horarios que já tem bloqueado desse Dia e dessa clinica.
      } catch (err) {
        setLoadingSlots(false);
        return [];
      }
    },
    [clinic.id],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchBlockedTimes(selectedDate).then((blocked) => {
        setBlockTimes(blocked);
      });
    }
  }, [selectedDate, fetchBlockedTimes]);

  useEffect(() => {
    const times = clinic.times || [];
    const finalSlots = times.map((time) => ({
      time: time,
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
  }, [blockTimes, clinic.times, selectedTime, setValue]);

  async function handleRegisterAppointmnent(formData: AppointmentFormData) {
    if (!selectedTime) {
      return;
    }

    const response = await createNewAppointment({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      date: formData.date,
      serviceId: formData.serviceId,
      time: selectedTime,
      clinicId: clinic.id,
    });

    if (response.error) {
      toast.error(response.error);
      return;
    } else {
      toast.success("Agendamento criado com sucesso!");
      form.reset();
      setSelectedTime("");
    }
  }

  //função que busca horarios bloqueados
  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-32 bg-blue-500" />

      <section className="container mx-auto px-4 -mt-16">
        <div className="max-w-2xl mx-auto">
          <article className="flex flex-col items-center">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-3 border-white">
              <Image
                src={clinic.image ? clinic.image : imgTest}
                alt="Foto Clínica"
                className="object-cover" // Mantém o corte bonito dentro do círculo
                fill // Faz a imagem preencher a div de 32x32
                sizes="128px" // Ajuda o Next.js a otimizar o tamanho
                priority // Carrega a foto da clínica mais rápido
              />
            </div>
            <h1 className="text-2xl font-bold mt-2">{clinic.name}</h1>
            <div className="flex items-center gap-1">
              <MapPin className="w-5 h-4  text-gray-600" />
              <span className="text-gray-600">
                {clinic.address ? clinic.address : "Endereço não disponível"}
              </span>
            </div>
            <span className="text-yellow-400">★★★★☆</span>
          </article>
        </div>
      </section>

      <section className="max-w-2xl mx-auto w-full">
        {/* Formulario de agendamento*/}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleRegisterAppointmnent)}
            className="mx-2 space-y-6 bg-white p-6 rounded-md shadow-sm"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="my-2">
                  <FormLabel className="font-semibold">Nome Completo</FormLabel>
                  <FormControl>
                    <Input id="name" placeholder="Seu nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="my-2">
                  <FormLabel className="font-semibold">Email</FormLabel>
                  <FormControl>
                    <Input id="email" placeholder="Seu email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="my-2">
                  <FormLabel className="font-semibold">Telefone</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      id="phone"
                      placeholder="(00) 00000-0000"
                      onChange={(e) => {
                        const formatvalue = formatPhone(e.target.value);
                        field.onChange(formatvalue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="my-2">
                  <FormLabel className="font-semibold">
                    Data Agendamento
                  </FormLabel>
                  <FormControl>
                    {isMounted ? (
                      <DateTimerPicker
                        minDate={new Date()}
                        initialDate={field.value}
                        onChange={(date: any) => {
                          if (date) {
                            field.onChange(date);
                            setSelectedTime("");
                          }
                        }}
                      />
                    ) : (
                      <div className="h-10 w-full rounded-md border border-input bg-transparent" />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem className="my-2">
                  <FormLabel className="font-semibold">
                    Selecione um Serviço
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedTime("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {clinic.services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - {Math.floor(service.duration / 60)}
                            h {service.duration % 60}min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botão de envio */}
            {selectedServiceId && (
              <div className="space-y-2">
                <label className="block font-medium">
                  Horários Disponíveis
                </label>
                <div className="bg-gray-100 p-4 rounded-lg">
                  {loadingSlots ? (
                    <p>Carregando horários...</p>
                  ) : availableTimeSlots.length === 0 ? (
                    <p>Nenhum horário disponível para o serviço selecionado.</p>
                  ) : (
                    <ScheduleTimeList
                      onSelectTime={(time) => {
                        setSelectedTime(time);
                        setValue("time", time, { shouldValidate: true });
                      }}
                      clinicTimes={clinic.times}
                      blockTimes={blockTimes}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      requiredSlots={
                        clinic.services.find(
                          (service) => service.id === selectedServiceId,
                        )
                          ? Math.ceil(
                              clinic.services.find(
                                (service) => service.id === selectedServiceId,
                              )!.duration / 30,
                            )
                          : 1
                      }
                      availableTimes={availableTimeSlots}
                    />
                  )}
                </div>
              </div>
            )}
            {clinic.status ? (
              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-400"
                disabled={
                  !watch("name") ||
                  !watch("email") ||
                  !watch("phone") ||
                  !watch("date")
                }
              >
                Realizar agendamento
              </Button>
            ) : (
              <p className="bg-red-500 text-white text-center px-4 py-2 rounded-md">
                A clinica está fechada nesse momento.
              </p>
            )}
          </form>
        </Form>
      </section>
    </div>
  );
}
