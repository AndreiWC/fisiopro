import { LogIn } from "lucide-react";

interface PatientLoginFormProps {
  title?: string;
  description?: string;
  next?: string;
}

export function PatientLoginForm({
  title,
  description = "Entre com sua conta Google para ver e gerenciar seus agendamentos.",
  next = "/perfil",
}: PatientLoginFormProps) {
  return (
    <div>
      {title && <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>}
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <a
        href={`/api/patient-auth/google?next=${encodeURIComponent(next)}`}
        className="mt-4 flex max-w-md items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <LogIn className="h-4 w-4" />
        Continuar com Google
      </a>
    </div>
  );
}
