"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, MapPin, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import type { AppointmentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { buildWhatsAppLink } from "@/utils/whatsapp";
import { APPOINTMENT_STATUS_META } from "@/utils/appointment-status";
import {
  findMyAppointments,
  type MyAppointment,
} from "../_actions/find-my-appointments";
import { cancelMyAppointment } from "../_actions/cancel-my-appointment";
import { RescheduleSheet } from "./reschedule-sheet";

interface MyAppointmentsContentProps {
  initialAppointments: MyAppointment[];
}

function isUpcoming(appointment: MyAppointment) {
  const isActiveStatus =
    appointment.status === "CONFIRMED" || appointment.status === "IN_PROGRESS";
  return isActiveStatus && new Date(appointment.AppointmentDate) >= startOfToday();
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function statusBorderClass(status: AppointmentStatus) {
  switch (status) {
    case "CONFIRMED":
      return "border-l-primary";
    case "IN_PROGRESS":
      return "border-l-accent-warm";
    case "COMPLETED":
      return "border-l-primary/30";
    case "NO_SHOW":
      return "border-l-destructive/50";
    case "CANCELLED":
      return "border-l-border";
  }
}

export function MyAppointmentsContent({ initialAppointments }: MyAppointmentsContentProps) {
  const [appointments, setAppointments] = useState<MyAppointment[]>(initialAppointments);
  const [tab, setTab] = useState<"proximos" | "historico">("proximos");
  const [rescheduling, setRescheduling] = useState<MyAppointment | null>(null);

  async function refresh() {
    const response = await findMyAppointments();
    if (response.data) setAppointments(response.data);
  }

  async function handleCancel(appointment: MyAppointment) {
    const confirmed = window.confirm(
      `Cancelar o agendamento de ${appointment.service.name} em ${format(
        new Date(appointment.AppointmentDate),
        "dd/MM",
      )}?`,
    );
    if (!confirmed) return;

    const response = await cancelMyAppointment({ appointmentId: appointment.id });

    if (response.error) {
      toast.error(response.error);
      return;
    }

    toast.success("Agendamento cancelado com sucesso!");
    void refresh();
  }

  const upcoming = useMemo(() => appointments.filter(isUpcoming), [appointments]);
  const history = useMemo(() => appointments.filter((a) => !isUpcoming(a)), [appointments]);

  const nextSession = upcoming[0] ?? null;
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;
  const list = tab === "proximos" ? upcoming : history;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Meus agendamentos
        </h1>
        <Link
          href="/"
          aria-label="Fazer novo agendamento"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      {appointments.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Nenhum agendamento encontrado para sua conta ainda.
        </p>
      ) : (
        <>
          <div className="scrollbar-none mt-5 -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <div className="w-38 shrink-0 snap-start rounded-xl border border-border bg-card px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Próxima sessão</p>
              <p className="text-base font-semibold text-foreground">
                {nextSession
                  ? format(new Date(nextSession.AppointmentDate), "EEE dd/MM", {
                      locale: ptBR,
                    })
                  : "—"}
              </p>
              {nextSession && (
                <p className="font-mono text-xs text-muted-foreground">{nextSession.time}</p>
              )}
            </div>
            <div className="w-38 shrink-0 snap-start rounded-xl border border-border bg-card px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Confirmados</p>
              <p className="text-lg font-semibold text-foreground">{upcoming.length}</p>
            </div>
            <div className="w-38 shrink-0 snap-start rounded-xl border border-border bg-card px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Concluídas</p>
              <p className="text-lg font-semibold text-foreground">{completedCount}</p>
            </div>
          </div>

          <div className="mt-5 flex border-b border-border">
            <button
              type="button"
              onClick={() => setTab("proximos")}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === "proximos"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Próximos
            </button>
            <button
              type="button"
              onClick={() => setTab("historico")}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === "historico"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Histórico
            </button>
          </div>

          {list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {tab === "proximos"
                ? "Nenhuma sessão futura confirmada."
                : "Nenhuma sessão no histórico ainda."}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {list.map((appointment) => {
                const meta = APPOINTMENT_STATUS_META[appointment.status];
                const whatsappLink = appointment.organization.phone
                  ? buildWhatsAppLink(
                      appointment.organization.phone,
                      `Olá! Sou paciente e agendei ${appointment.service.name} para ${format(
                        new Date(appointment.AppointmentDate),
                        "dd/MM",
                      )} às ${appointment.time}.`,
                    )
                  : null;

                return (
                  <li
                    key={appointment.id}
                    className={cn(
                      "rounded-xl border border-border border-l-4 bg-card p-4",
                      statusBorderClass(appointment.status),
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">
                          {appointment.service.name}
                        </p>
                        <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {appointment.organization.name}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                          meta.className,
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                      {format(new Date(appointment.AppointmentDate), "EEEE, dd 'de' MMMM", {
                        locale: ptBR,
                      })}{" "}
                      · <span className="font-mono">{appointment.time}</span>
                    </p>

                    <div className="mt-3 space-y-2">
                      {appointment.status === "CONFIRMED" && (
                        <>
                          <div className="flex gap-2">
                            {whatsappLink ? (
                              <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                              >
                                <MessageCircle className="h-4 w-4" />
                                Mensagem
                              </a>
                            ) : (
                              <Link
                                href={`/clinica/${appointment.organization.id}`}
                                className="flex-1 rounded-full bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                              >
                                Ver clínica
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => setRescheduling(appointment)}
                              className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                            >
                              Remarcar
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCancel(appointment)}
                            className="w-full text-center text-xs font-medium text-destructive hover:underline"
                          >
                            Cancelar agendamento
                          </button>
                        </>
                      )}

                      {appointment.status === "IN_PROGRESS" && whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Mensagem
                        </a>
                      )}

                      {(appointment.status === "COMPLETED" ||
                        appointment.status === "CANCELLED" ||
                        appointment.status === "NO_SHOW") && (
                        <div className="flex gap-2">
                          <Link
                            href={`/clinica/${appointment.organization.id}`}
                            className="flex-1 rounded-full bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                          >
                            Repetir
                          </Link>
                          <Link
                            href={`/clinica/${appointment.organization.id}`}
                            className="flex-1 rounded-full border border-border px-4 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                          >
                            Ver clínica
                          </Link>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {rescheduling && (
        <RescheduleSheet
          appointment={rescheduling}
          open={Boolean(rescheduling)}
          onOpenChange={(open) => !open && setRescheduling(null)}
          onRescheduled={refresh}
        />
      )}
    </div>
  );
}
