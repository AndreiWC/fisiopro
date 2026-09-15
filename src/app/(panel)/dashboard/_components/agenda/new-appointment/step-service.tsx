"use client";

import type { Service } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatvalue } from "@/utils/formatValue";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}min`;
}

interface StepServiceProps {
  services: Service[];
  serviceId: string;
  onSelect: (serviceId: string) => void;
}

export function StepService({ services, serviceId, onSelect }: StepServiceProps) {
  if (services.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum serviço ativo cadastrado. Cadastre um serviço antes de criar um agendamento.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {services.map((service) => {
        const isActive = service.id === serviceId;
        return (
          <li key={service.id}>
            <button
              type="button"
              onClick={() => onSelect(service.id)}
              className={cn(
                "flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors",
                isActive ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40",
              )}
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{service.name}</p>
                <p className="text-sm text-muted-foreground">{formatDuration(service.duration)}</p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
                {formatvalue(service.price.toString())}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
