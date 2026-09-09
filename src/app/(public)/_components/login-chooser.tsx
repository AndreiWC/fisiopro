"use client";

import { Github, LogIn } from "lucide-react";
import { handleRegister } from "../_actions/login";
import { EmailCodeForm } from "./email-code-form";

interface LoginChooserProps {
  heading?: string;
  description?: string;
  next?: string;
}

export function LoginChooser({
  heading = "Entrar na Encaixa",
  description = "Como você quer entrar?",
  next,
}: LoginChooserProps) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground">{heading}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => void handleRegister("google", next)}
          className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <LogIn className="h-4 w-4" />
          Continuar com Google
        </button>
        <button
          type="button"
          onClick={() => void handleRegister("github", next)}
          className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <Github className="h-4 w-4" />
          Continuar com GitHub
        </button>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <p className="text-sm font-medium text-foreground">Ou entre com um código por e-mail</p>
        <EmailCodeForm next={next} />
      </div>
    </div>
  );
}
