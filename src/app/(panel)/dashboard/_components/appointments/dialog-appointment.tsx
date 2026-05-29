import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentWithService } from "./appointments-list";
import { format } from "date-fns";
import { formatvalueToReal } from "@/utils/formatValue";
interface DialogAppointmentProps {
  appointment: AppointmentWithService;
}
export function DialogAppointment({ appointment }: DialogAppointmentProps) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Detalhes do Agendamento</DialogTitle>
        <DialogDescription>
          Veja os detalhes do agendamento selecionado.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        {appointment && (
          <article>
            <p>
              <span className="font-semibold">Data Agendamento:</span>
              {format(appointment.AppointmentDate, "dd/MM/yyyy")}
            </p>
            <p className="mb-2">
              <span className="font-semibold">Horário Agendamento:</span>
              {appointment.time}
            </p>
            <p>
              <span className="font-semibold">Nome:</span>
              {appointment.name}
            </p>

            <p>
              <span className="font-semibold">Telefone:</span>
              {appointment.phone}
            </p>
            <p>
              <span className="font-semibold">E-mail:</span>
              {appointment.email}
            </p>

            <section className="bg-gray-100 mt-4 p-2 rounded-md">
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
