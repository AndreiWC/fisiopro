"use client";
import Image from "next/image";
import imgTest from "../../../../../../public/profissional.png";
import { MapPin } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
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

type UserWithServiceAndSubscriptions = Prisma.UserGetPayload<{
  include: {
    services: true;
    subscription: true;
  };
}>;

interface ScheduleContentProps {
  clinic: UserWithServiceAndSubscriptions;
}

export function ScheduleContent({ clinic }: ScheduleContentProps) {
  const form = useAppointmentForm();

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
                className="object-cover"
                fill
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
          <form className="mx-2 space-y-6 bg-white p-6 rounded-md shadow-sm">
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
                    <DateTimerPicker
                      //   className="w-full rounded border p-2"
                      minDate={new Date()}
                      initialDate={field.value}
                      onChange={(date: any) => {
                        if (date) {
                          field.onChange(date);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botão de envio */}
            <Button type="submit">Agendar</Button>
          </form>
        </Form>
      </section>
    </div>
  );
}
