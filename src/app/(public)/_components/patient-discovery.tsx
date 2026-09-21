"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Prisma, Segment } from "@prisma/client";
import { ArrowRight, MapPin, Search } from "lucide-react";
import fotoImg from "../../../../public/phaceholder 3.png";
import { segmentLabel } from "@/utils/segments";
import { CategoryGrid } from "./category-grid";
import { HowItWorks } from "./how-it-works";
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

function isFeatured(professional: OrganizationWithServiceAndSubscriptions) {
  return (
    professional.subscription?.status === "active" &&
    professional.subscription?.plan === "PROFESSIONAL"
  );
}

/** Marca "encaixe": os dois blocos que dão nome à Encaixa, ampliados como peça gráfica do herói. */
function HeroMark() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className="h-full w-full">
      <rect x="12" y="10" width="44" height="44" rx="16" className="fill-sidebar-foreground/10" />
      <rect x="108" y="16" width="58" height="58" rx="20" className="fill-sidebar-foreground/10" />
      <rect x="20" y="68" width="98" height="98" rx="30" className="fill-primary" />
      <rect x="98" y="118" width="70" height="70" rx="22" className="fill-accent-warm" />
    </svg>
  );
}

export function PatientDiscovery({ professionals }: PatientDiscoveryProps) {
  const [query, setQuery] = useState("");
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);

  const counts = useMemo(() => {
    const record = {} as Record<Segment, number>;
    for (const professional of professionals) {
      if (!professional.segment) continue;
      record[professional.segment] = (record[professional.segment] ?? 0) + 1;
    }
    return record;
  }, [professionals]);

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

  const activeLabel = segmentLabel(activeSegment);

  return (
    <>
      <section className="relative overflow-hidden rounded-b-[2.5rem] bg-sidebar pt-28 pb-16 text-sidebar-foreground sm:rounded-b-[3rem]">
        <div className="pointer-events-none absolute -top-16 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-accent-warm/10 blur-3xl" />

        <div className="container relative mx-auto flex flex-col gap-10 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-8">
          <div className="relative z-10 max-w-xl">
            <p className="text-sm font-medium text-sidebar-foreground/70">
              Para quem cuida da beleza, da saúde e do corpo
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl lg:text-[2.75rem]">
              Encontre um horário que se encaixa na sua rotina.
            </h1>

            <div className="relative mt-7 max-w-xl">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Nome, serviço ou endereço"
                className="h-14 w-full rounded-full border border-transparent bg-card pr-4 pl-12 text-base text-foreground shadow-lg outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>

            <p className="mt-4 text-sm text-sidebar-foreground/60">
              {professionals.length > 0
                ? `${professionals.length} ${professionals.length === 1 ? "profissional disponível" : "profissionais disponíveis"} agora`
                : "Novos profissionais chegando em breve"}
            </p>
          </div>

          <div className="relative z-10 hidden shrink-0 lg:block">
            <div className="h-64 w-64 xl:h-72 xl:w-72">
              <HeroMark />
            </div>
          </div>
        </div>
      </section>

      <CategoryGrid counts={counts} activeSegment={activeSegment} onSelect={setActiveSegment} />

      <HowItWorks />

      {spotlight.length > 0 && (
        <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {featured.length > 0 ? "Profissionais em destaque" : "Comece por aqui"}
          </h2>
          <div className="scrollbar-none mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {spotlight.map((professional) => {
              const label = segmentLabel(professional.segment);
              return (
                <Link
                  key={professional.id}
                  href={`/clinica/${professional.id}`}
                  className="w-52 shrink-0 snap-start rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/50"
                >
                  <div className="relative h-32 w-full overflow-hidden rounded-xl">
                    <Image
                      src={professional.image ? professional.image : fotoImg}
                      alt={`Foto de ${professional.name ?? "profissional"}`}
                      fill
                      sizes="208px"
                      className="object-cover"
                    />
                    {isFeatured(professional) && <PremiumBadge />}
                  </div>
                  <p className="mt-2.5 truncate text-sm font-medium text-foreground">
                    {professional.name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {professional.address || "Endereço não informado"}
                  </p>
                  {label && (
                    <span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      {label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

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
            <div className="h-10 w-10 opacity-40">
              <HeroMark />
            </div>
            <p className="text-muted-foreground">
              {query
                ? `Nenhum profissional encontrado para "${query}".`
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
