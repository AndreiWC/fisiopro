const SUBSCRIPTION_STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: "Ativa", className: "bg-primary/10 text-primary" },
  trialing: { label: "Em teste", className: "bg-accent text-accent-foreground" },
  past_due: { label: "Pagamento atrasado", className: "bg-destructive/10 text-destructive" },
  canceled: { label: "Cancelada", className: "bg-secondary text-secondary-foreground" },
  unpaid: { label: "Não paga", className: "bg-destructive/10 text-destructive" },
  incomplete: { label: "Incompleta", className: "bg-secondary text-secondary-foreground" },
  incomplete_expired: { label: "Expirada", className: "bg-secondary text-secondary-foreground" },
  paused: { label: "Pausada", className: "bg-secondary text-secondary-foreground" },
};

export function subscriptionStatusMeta(status: string | null | undefined) {
  if (!status) {
    return { label: "Sem assinatura", className: "bg-muted text-muted-foreground" };
  }
  return (
    SUBSCRIPTION_STATUS_META[status] ?? {
      label: status,
      className: "bg-muted text-muted-foreground",
    }
  );
}
