import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentWithService, STATUS_META } from "./appointments-list";
import { format } from "date-fns";
import { formatvalueToReal } from "@/utils/formatValue";
import { cn } from "@/lib/utils";
interface DialogAppointmentProps {
  appointment: AppointmentWithService;
}
export function DialogAppointment({ appointment }: DialogAppointmentProps) {
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
    </DialogContent>
  );
}
