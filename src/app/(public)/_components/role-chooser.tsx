"use client";

import { Stethoscope, User } from "lucide-react";
import { chooseClinicRole, choosePatientRole } from "../_actions/choose-role";

export function RoleChooser({ next }: { next?: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground">Quase lá</h1>
      <p className="mt-1 text-sm text-muted-foreground">Como você vai usar a Encaixa?</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void chooseClinicRole()}
          className="group flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-secondary/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="font-semibold text-foreground">Quero cadastrar minha clínica</span>
          <span className="text-sm text-muted-foreground">
            Gerencie sua agenda, serviços e pacientes.
          </span>
        </button>
        <button
          type="button"
          onClick={() => void choosePatientRole(next)}
          className="group flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-secondary/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </span>
          <span className="font-semibold text-foreground">Quero agendar como paciente</span>
          <span className="text-sm text-muted-foreground">
            Veja seus agendamentos e edite seu perfil.
          </span>
        </button>
      </div>
    </div>
  );
}
