interface RevenueByServiceListProps {
  services: { name: string; revenue: number }[];
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function RevenueByServiceList({ services }: RevenueByServiceListProps) {
  const maxRevenue = Math.max(1, ...services.map((s) => s.revenue));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-medium text-foreground">Receita por serviço</h3>
      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum atendimento concluído no período.</p>
      ) : (
        <ul className="space-y-3">
          {services.map((service) => (
            <li key={service.name}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-foreground">{service.name}</span>
                <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-foreground">
                  {currencyFormatter.format(service.revenue / 100)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(service.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
