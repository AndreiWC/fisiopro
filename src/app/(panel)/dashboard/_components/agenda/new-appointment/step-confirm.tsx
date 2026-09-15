import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Service } from "@prisma/client";
import { formatvalue } from "@/utils/formatValue";
import type { CustomerSelection } from "./new-appointment-wizard";

interface StepConfirmProps {
  customer: CustomerSelection;
  service: Service | undefined;
  date: Date;
  time: string;
}

export function StepConfirm({ customer, service, date, time }: StepConfirmProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Paciente</p>
        <p className="font-medium text-foreground">
          {customer?.mode === "existing" ? customer.customer.name || "Sem nome" : customer?.name}
        </p>
      </div>
      {service && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-medium text-foreground">{service.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} ·{" "}
            <span className="font-mono">{time}</span>
          </p>
          <p className="mt-2 font-mono text-lg font-semibold text-primary">
            {formatvalue(service.price.toString())}
          </p>
        </div>
      )}
    </div>
  );
}
