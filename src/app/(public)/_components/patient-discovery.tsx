"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Prisma, Segment } from "@prisma/client";
import {
  Activity,
  ArrowRight,
  Flower2,
  MapPin,
  Scissors,
  Search,
  Smile,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import fotoImg from "../../../../public/phaceholder 3.png";
import { SEGMENT_OPTIONS } from "@/utils/segments";
import { cn } from "@/lib/utils";
import { PremiumBadge } from "./premium-badge";

type OrganizationWithServiceAndSubscriptions = Prisma.OrganizationGetPayload<{
  include: {
    subscription: true;
    services: { select: { name: true } };
  };
}>;

interface PatientDiscoveryProps {
  professionals: OrganizationWithServiceAndSubscriptions[];
}

const SEGMENT_ICONS: Record<Segment, typeof Scissors> = {
  BARBEARIA: Scissors,
  SALAO_BELEZA: Sparkles,
  CLINICA_ESTETICA: Flower2,
  FISIOTERAPIA: Activity,
  ODONTOLOGIA: Smile,
  MEDICO: Stethoscope,
};

function isFeatured(professional: OrganizationWithServiceAndSubscriptions) {
  return (
    professional.subscription?.status === "active" &&
    professional.subscription?.plan === "PROFESSIONAL"
  );
}

/** Marca "encaixe": os dois blocos que dão nome à Encaixa, usados como respiro visual. */
function EncaixeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect x="2" y="6" width="20" height="20" rx="7" className="fill-primary" />
      <rect x="17" y="11" width="13" height="13" rx="4" className="fill-accent-warm" />
    </svg>
  );
}

export function PatientDiscovery({ professionals }: PatientDiscoveryProps) {
  const [query, setQuery] = useState("");
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);

  const bySegment = useMemo(() => {
    if (!activeSegment) return professionals;
    return professionals.filter((p) => p.segment === activeSegment);
  }, [professionals, activeSegment]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bySegment;
    return bySegment.filter(
      (p) =>
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.address ?? "").toLowerCase().includes(q) ||
        p.services.some((s) => s.name.toLowerCase().includes(q)),
    );
  }, [bySegment, query]);

  const featured = bySegment.filter(isFeatured).slice(0, 6);
  const spotlight = featured.length > 0 ? featured : bySegment.slice(0, 4);

  const activeLabel = SEGMENT_OPTIONS.find((s) => s.value === activeSegment)?.label;

  return (
    <>
      <section className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-b from-accent/60 via-background to-background pt-28 pb-10 text-foreground sm:rounded-b-[3rem]">
        <EncaixeMark className="pointer-events-none absolute -top-10 -right-14 h-56 w-56 opacity-[0.08] blur-[1px]" />
        <EncaixeMark className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rotate-12 opacity-[0.06]" />

        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-muted-foreground">
            Para você que cuida da saúde e do corpo
          </p>
          <h1 className="font-display mt-2 max-w-lg text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            Encontre um horário que se encaixa na sua rotina.
          </h1>

          <div className="relative mt-7 max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Nome, serviço ou endereço"
              className="h-14 w-full rounded-full border border-border bg-card pr-4 pl-12 text-base text-foreground shadow-lg outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div className="relative mt-5 max-w-xl">
            <div className="scrollbar-none flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveSegment(null)}
                aria-pressed={activeSegment === null}
                className={cn(
                  "shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  activeSegment === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/60 text-foreground hover:bg-secondary",
                )}
              >
                Todas
              </button>
              {SEGMENT_OPTIONS.map(({ value, label }) => {
                const Icon = SEGMENT_ICONS[value];
                const isActive = activeSegment === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActiveSegment(isActive ? null : value)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary/60 text-foreground hover:bg-secondary",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                    {label}
                  </button>
                );
              })}
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-linear-to-r from-transparent to-background"
            />
          </div>

          {spotlight.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-foreground">
                {featured.length > 0 ? "Profissionais em destaque" : "Comece por aqui"}
              </h2>
              <div className="scrollbar-none mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                {spotlight.map((professional) => {
                  return (
                    <Link
                      key={professional.id}
                      href={`/clinica/${professional.id}`}
                      className="w-40 shrink-0 snap-start rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/50"
                    >
                      <div className="relative h-24 w-full overflow-hidden rounded-xl">
                        <Image
                          src={professional.image ? professional.image : fotoImg}
                          alt={`Foto de ${professional.name ?? "profissional"}`}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                        {isFeatured(professional) && <PremiumBadge />}
                      </div>
                      <p className="mt-2 truncate text-sm font-medium text-foreground">
                        {professional.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {professional.address || "Endereço não informado"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="profissionais" className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {activeLabel ?? "Todos os profissionais"}
          </h2>
          <span className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "encontrado" : "encontrados"}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
            <EncaixeMark className="h-10 w-10 opacity-40" />
            <p className="text-muted-foreground">
              {query
                ? `Nenhum profissional encontrado para “${query}”.`
                : "Nenhum profissional encontrado neste segmento."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {filtered.map((professional) => {
              return (
                <li key={professional.id}>
                  <Link
                    href={`/clinica/${professional.id}`}
                    className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-secondary/60 sm:px-6"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-background">
                      <Image
                        src={professional.image ? professional.image : fotoImg}
                        alt={`Foto de ${professional.name ?? "profissional"}`}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-foreground">
                          {professional.name}
                        </p>
                        {isFeatured(professional) && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                            Destaque
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {professional.address || "Endereço não informado"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
