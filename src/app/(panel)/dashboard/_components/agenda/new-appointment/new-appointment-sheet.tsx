"use client";

import type { Service } from "@prisma/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NewAppointmentWizard } from "./new-appointment-wizard";

interface NewAppointmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  times: string[];
  services: Service[];
  initialDate?: Date;
  initialTime?: string;
  onCreated?: () => void;
}

export function NewAppointmentSheet({
  open,
  onOpenChange,
  organizationId,
  times,
  services,
  initialDate,
  initialTime,
  onCreated,
}: NewAppointmentSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5 pb-4">
          <SheetTitle>Novo agendamento</SheetTitle>
          <SheetDescription>Encaixe um atendimento em poucos passos.</SheetDescription>
        </SheetHeader>
        {open && (
          <NewAppointmentWizard
            organizationId={organizationId}
            times={times}
            services={services}
            initialDate={initialDate}
            initialTime={initialTime}
            onDone={() => {
              onOpenChange(false);
              onCreated?.();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
