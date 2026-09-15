"use client";

import type { AppointmentStatus, Service } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPOINTMENT_STATUS_META } from "@/utils/appointment-status";

export interface AgendaFiltersValue {
  serviceId: string; // "all" | Service["id"]
  status: AppointmentStatus | "all";
}

interface AgendaFiltersProps {
  services: Service[];
  value: AgendaFiltersValue;
  onChange: (value: AgendaFiltersValue) => void;
}

export function AgendaFilters({ services, value, onChange }: AgendaFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={value.serviceId}
        onValueChange={(serviceId) => onChange({ ...value, serviceId })}
      >
        <SelectTrigger className="h-8 w-auto min-w-32 text-xs">
          <SelectValue placeholder="Serviço" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os serviços</SelectItem>
          {services.map((service) => (
            <SelectItem key={service.id} value={service.id}>
              {service.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.status}
        onValueChange={(status) =>
          onChange({ ...value, status: status as AgendaFiltersValue["status"] })
        }
      >
        <SelectTrigger className="h-8 w-auto min-w-32 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {(Object.keys(APPOINTMENT_STATUS_META) as AppointmentStatus[]).map((status) => (
            <SelectItem key={status} value={status}>
              {APPOINTMENT_STATUS_META[status].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
