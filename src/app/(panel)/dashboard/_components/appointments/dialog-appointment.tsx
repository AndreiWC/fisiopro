import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentWithService, STATUS_META } from "../agenda/day-view";
import { format } from "date-fns";
import { formatvalueToReal } from "@/utils/formatValue";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import type { AppointmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DialogAppointmentProps {
  appointment: AppointmentWithService;
  onStatusChange?: (status: AppointmentStatus) => void | Promise<void>;
}
export function DialogAppointment({
  appointment,
  onStatusChange,
}: DialogAppointmentProps) {
  const isOpen =
    appointment.status === "CONFIRMED" || appointment.status === "IN_PROGRESS";

  return (
    <DialogContent>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <DialogTitle>Detalhes do Agendamento</DialogTitle>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_META[appointment.status].className,
            )}
          >
            {STATUS_META[appointment.status].label}
          </span>
        </div>
        <DialogDescription>
          Veja os detalhes do agendamento selecionado.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        {appointment && (
          <article>
            <p>
              <span className="font-semibold">Data Agendamento:</span>
              {new Intl.DateTimeFormat("pt-BR", {
                timeZone: "UTC",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(appointment.AppointmentDate))}
            </p>
            <p className="mb-2">
              <span className="font-semibold">Horário Agendamento:</span>
              {appointment.time}
            </p>
            <p>
              <span className="font-semibold">Nome:</span>
              {appointment.customer.name}
            </p>

            <p>
              <span className="font-semibold">Telefone:</span>
              {appointment.customer.phone}
            </p>
            <p>
              <span className="font-semibold">E-mail:</span>
              {appointment.customer.email}
            </p>

            <section className="bg-muted mt-4 p-2 rounded-md">
              <p>
                <span className="font-semibold">Serviço:</span>
                {appointment.service.name}
              </p>
              <p>
                <span className="font-semibold">Valor:</span>
                {formatvalueToReal(appointment.service.price / 100)}
              </p>
            </section>
          </article>
        )}
      </div>

      {onStatusChange && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-sm font-semibold">Ações</p>
          <div className="flex flex-wrap items-center gap-2">
            {isOpen && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => onStatusChange("COMPLETED")}
                >
                  <Check className="h-4 w-4" />
                  Concluir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => onStatusChange("NO_SHOW")}
                >
                  <X className="h-4 w-4" />
                  Faltou
                </Button>
              </>
            )}
            <Select
              value={appointment.status}
              onValueChange={(value) => onStatusChange(value as AppointmentStatus)}
            >
              <SelectTrigger className="w-fit gap-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {(Object.keys(STATUS_META) as AppointmentStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_META[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </DialogContent>
  );
}
