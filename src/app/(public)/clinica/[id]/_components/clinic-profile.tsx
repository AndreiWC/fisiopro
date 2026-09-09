"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Prisma } from "@prisma/client";
import { Clock, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";
import imgTest from "../../../../../../public/profissional.png";
import { formatvalue } from "@/utils/formatValue";
import { segmentLabel } from "@/utils/segments";
import { buildWhatsAppLink } from "@/utils/whatsapp";
import { cn } from "@/lib/utils";
import { isSlotInThePast } from "@/utils/schedule-utils";
import { Header } from "../../../_components/header";
import { BottomNav } from "../../../_components/bottom-nav";

type OrganizationWithServiceAndSubscriptions = Prisma.OrganizationGetPayload<{
  include: {
    services: true;
    subscription: true;
  };
}>;

interface ClinicProfileProps {
  clinic: OrganizationWithServiceAndSubscriptions;
  onSelectService: (serviceId: string) => void;
  onStartBooking: () => void;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}min`;
}

function todayDateParam() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ClinicProfile({
  clinic,
  onSelectService,
  onStartBooking,
}: ClinicProfileProps) {
  const [tab, setTab] = useState<"servicos" | "sobre">("servicos");
  const [nextSlotToday, setNextSlotToday] = useState<string | null>(null);

  useEffect(() => {
    if (!clinic.status || clinic.times.length === 0) return;

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/schedule/get-appointments?userId=${clinic.id}&date=${todayDateParam()}`,
    )
      .then((res) => res.json())
      .then((blocked: unknown) => {
        if (!Array.isArray(blocked)) return;
        const free = clinic.times.find(
          (time) => !blocked.includes(time) && !isSlotInThePast(time),
        );
        setNextSlotToday(free ?? null);
      })
      .catch(() => {});
  }, [clinic.id, clinic.status, clinic.times]);

  const activeServices = clinic.services.filter((s) => s.status);
  const startingPrice = activeServices.length
    ? formatvalue(Math.min(...activeServices.map((s) => s.price)).toString())
    : null;
  const hoursRange =
    clinic.times.length > 0
      ? `${clinic.times[0]} às ${clinic.times[clinic.times.length - 1]}`
      : null;
  const whatsappLink = clinic.phone
    ? buildWhatsAppLink(clinic.phone, `Olá! Vim pelo Encaixa e gostaria de agendar um horário.`)
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background pt-16 pb-32 md:pb-28">
      <Header />
      <div className="relative h-40 overflow-hidden bg-gradient-to-b from-accent/70 to-background">
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 -right-8 h-40 w-40 opacity-[0.08]"
        >
          <rect x="2" y="6" width="20" height="20" rx="7" className="fill-primary" />
          <rect x="17" y="11" width="13" height="13" rx="4" className="fill-accent-warm" />
        </svg>
      </div>

      <section className="container mx-auto px-4 -mt-16">
        <div className="mx-auto max-w-2xl">
          <article className="flex flex-col items-center text-center">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-background shadow-sm">
              <Image
                src={clinic.image ? clinic.image : imgTest}
                alt={`Foto de ${clinic.name ?? "profissional"}`}
                className="object-cover"
                fill
                sizes="128px"
                priority
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <h1 className="font-display text-2xl font-semibold">{clinic.name}</h1>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  clinic.status
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {clinic.status ? "Aberta" : "Fechada"}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {clinic.address || "Endereço não informado"}
              </span>
              {hoursRange && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {hoursRange}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {segmentLabel(clinic.segment) && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {segmentLabel(clinic.segment)}
                </span>
              )}
              {startingPrice && (
                <span className="font-mono text-sm font-medium text-primary">
                  a partir de {startingPrice}
                </span>
              )}
            </div>

            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <MessageCircle className="h-4 w-4 text-primary" />
                Falar no WhatsApp
              </a>
            )}
          </article>

          {clinic.status && nextSlotToday && (
            <button
              type="button"
              onClick={onStartBooking}
              className="mt-5 flex w-full items-center gap-2 rounded-xl border border-accent-warm/30 bg-accent px-4 py-3 text-left transition-colors hover:border-accent-warm/60"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-accent-warm" />
              <span className="text-sm text-accent-foreground">
                Ainda dá pra encaixar hoje — próximo horário livre às{" "}
                <span className="font-mono font-semibold">{nextSlotToday}</span>
              </span>
            </button>
          )}

          <div className="mt-6 flex border-b border-border">
            <button
              type="button"
              onClick={() => setTab("servicos")}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === "servicos"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Serviços
            </button>
            <button
              type="button"
              onClick={() => setTab("sobre")}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === "sobre"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Sobre
            </button>
          </div>

          {tab === "servicos" ? (
            activeServices.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">
                Nenhum serviço disponível no momento.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {activeServices.map((service) => (
                  <li key={service.id}>
                    <button
                      type="button"
                      onClick={() => onSelectService(service.id)}
                      className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:bg-secondary/40"
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
                ))}
              </ul>
            )
          ) : (
            <dl className="divide-y divide-border">
              <div className="flex items-center gap-3 py-4">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <dt className="sr-only">Endereço</dt>
                <dd className="text-sm text-foreground">
                  {clinic.address || "Endereço não informado"}
                </dd>
              </div>
              {clinic.phone && (
                <div className="flex items-center gap-3 py-4">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <dt className="sr-only">Telefone</dt>
                  <dd className="text-sm text-foreground">{clinic.phone}</dd>
                </div>
              )}
              {hoursRange && (
                <div className="flex items-center gap-3 py-4">
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <dt className="sr-only">Horário</dt>
                  <dd className="text-sm text-foreground">{hoursRange}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </section>

      {activeServices.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card/95 backdrop-blur-sm md:bottom-0">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">A partir de</p>
              <p className="font-mono text-lg font-semibold text-foreground">
                {startingPrice}
              </p>
            </div>
            <button
              type="button"
              onClick={onStartBooking}
              disabled={!clinic.status}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {clinic.status ? "Agendar sessão" : "Negócio fechado"}
            </button>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
