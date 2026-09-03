"use client";

import { useState } from "react";
import { Github, LogIn, Stethoscope, User } from "lucide-react";
import { handleRegister } from "../../_actions/login";
import { PatientLoginForm } from "../../_components/patient-login-form";
import { cn } from "@/lib/utils";

type Mode = "choose" | "clinica" | "paciente";

export function LoginChooser() {
  const [mode, setMode] = useState<Mode>("choose");

  if (mode === "clinica") {
    return (
      <div>
        <BackButton onClick={() => setMode("choose")} />
        <h1 className="font-display mt-3 text-2xl font-semibold text-foreground">
          Entrar como clínica
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use sua conta Google ou GitHub para acessar o painel do seu negócio.
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => void handleRegister("google")}
            className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <LogIn className="h-4 w-4" />
            Continuar com Google
          </button>
          <button
            type="button"
            onClick={() => void handleRegister("github")}
            className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Github className="h-4 w-4" />
            Continuar com GitHub
          </button>
        </div>
      </div>
    );
  }

  if (mode === "paciente") {
    return (
      <div>
        <BackButton onClick={() => setMode("choose")} />
        <div className="mt-3">
          <PatientLoginForm title="Entrar como paciente" next="/perfil" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground">Entrar na Encaixa</h1>
      <p className="mt-1 text-sm text-muted-foreground">Como você quer entrar?</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          icon={Stethoscope}
          title="Sou uma clínica"
          description="Gerencie sua agenda, serviços e pacientes."
          onClick={() => setMode("clinica")}
        />
        <ChoiceCard
          icon={User}
          title="Sou paciente"
          description="Veja seus agendamentos e edite seu perfil."
          onClick={() => setMode("paciente")}
        />
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
    >
      ← Voltar
    </button>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof User;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-secondary/40",
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="font-semibold text-foreground">{title}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </button>
  );
}
