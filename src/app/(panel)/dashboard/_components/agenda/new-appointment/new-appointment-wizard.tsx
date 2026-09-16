"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Service } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/app/(public)/clinica/[id]/_components/step-indicator";
import { createPanelAppointment } from "../../../_actions/create-panel-appointment";
import type { CustomerSearchResult } from "../../../_data-access/search-customers";
import { StepCustomer } from "./step-customer";
import { StepService } from "./step-service";
import { StepDatetime } from "./step-datetime";
import { StepConfirm } from "./step-confirm";

export type CustomerSelection =
  | { mode: "existing"; customer: CustomerSearchResult }
  | { mode: "new"; name: string; email: string; phone: string }
  | null;

const STEPS = ["Paciente", "Serviço", "Data e horário", "Confirmar"];

interface NewAppointmentWizardProps {
  organizationId: string;
  times: string[];
  services: Service[];
  initialDate?: Date;
  initialTime?: string;
  onDone: () => void;
}

export function NewAppointmentWizard({
  organizationId,
  times,
  services,
  initialDate,
  initialTime,
  onDone,
}: NewAppointmentWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [customer, setCustomer] = useState<CustomerSelection>(null);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(initialDate ?? new Date());
  const [time, setTime] = useState(initialTime ?? "");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const selectedService = services.find((s) => s.id === serviceId);
  const requiredSlots = selectedService ? Math.ceil(selectedService.duration / 30) : 1;

  const canProceed = (() => {
    switch (stepIndex) {
      case 0:
        return (
          customer !== null &&
          (customer.mode === "existing" ||
            Boolean(customer.name && customer.email && customer.phone))
        );
      case 1:
        return Boolean(serviceId);
      case 2:
        return Boolean(time);
      default:
        return true;
    }
  })();

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleConfirm() {
    if (!customer || !selectedService || !time) return;
    setSubmitting(true);

    const base = { serviceId: selectedService.id, date, time };
    const response = await createPanelAppointment(
      customer.mode === "existing"
        ? { customerMode: "existing" as const, customerId: customer.customer.id, ...base }
        : {
            customerMode: "new" as const,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            ...base,
          },
    );

    setSubmitting(false);
    if (response.error) {
      toast.error(response.error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["get-appointments"] });
    queryClient.invalidateQueries({ queryKey: ["get-week-appointments"] });
    queryClient.invalidateQueries({ queryKey: ["get-month-appointments-summary"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-list"] });

    toast.success("Agendamento criado com sucesso!");
    onDone();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-5 py-4">
        <StepIndicator steps={STEPS} currentIndex={stepIndex} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {stepIndex === 0 && (
          <StepCustomer organizationId={organizationId} value={customer} onChange={setCustomer} />
        )}
        {stepIndex === 1 && (
          <StepService services={services} serviceId={serviceId} onSelect={setServiceId} />
        )}
        {stepIndex === 2 && (
          <StepDatetime
            organizationId={organizationId}
            clinicTimes={times}
            requiredSlots={requiredSlots}
            date={date}
            time={time}
            onDateChange={setDate}
            onTimeChange={setTime}
          />
        )}
        {stepIndex === 3 && (
          <StepConfirm customer={customer} service={selectedService} date={date} time={time} />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
        <Button type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0}>
          Voltar
        </Button>
        {stepIndex < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext} disabled={!canProceed}>
            Continuar
          </Button>
        ) : (
          <Button type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Agendando..." : "Confirmar agendamento"}
          </Button>
        )}
      </div>
    </div>
  );
}
