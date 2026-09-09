"use client";

import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { sendLoginCode, confirmLoginCode } from "../_actions/login";

export function EmailCodeForm({ next }: { next?: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await sendLoginCode(email);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("code");
  }

  async function handleConfirmCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await confirmLoginCode(email, code, next);
    if (result?.error) {
      setLoading(false);
      setError(result.error);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={handleSendCode} className="mt-2.5 flex flex-col gap-2.5">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          {loading ? "Enviando..." : "Enviar código por e-mail"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleConfirmCode} className="mt-2.5 flex flex-col gap-2.5">
      <p className="text-sm text-muted-foreground">Digite o código enviado para {email}</p>
      <input
        type="text"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="000000"
        className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-center text-lg tracking-widest outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Confirmando..." : "Confirmar código"}
      </button>
    </form>
  );
}
