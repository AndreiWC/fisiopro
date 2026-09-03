import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function LabelSubscription({ expired }: { expired: boolean }) {
  return (
    <div className="my-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm md:flex-row md:items-center md:text-base">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          {expired ? (
            <h3 className="font-semibold text-foreground">
              Seu plano expirou ou você não tem uma assinatura ativa
            </h3>
          ) : (
            <h3 className="font-semibold text-foreground">
              Você excedeu o limite do seu plano
            </h3>
          )}
          <p className="text-sm text-muted-foreground">
            Acesse seu plano para verificar sua assinatura.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/plans"
        className="w-fit shrink-0 rounded-md bg-primary px-3 py-1.5 text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Renovar assinatura
      </Link>
    </div>
  );
}
