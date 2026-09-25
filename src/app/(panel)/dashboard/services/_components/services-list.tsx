"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { ChevronRight, ClipboardList, Clock, Pencil, Plus } from "lucide-react";
import { ViewModeToggle, useViewMode } from "@/components/view-mode-toggle";
import { DialogService } from "./dialog-service";
import { Service } from "@prisma/client";
import { formatvalue } from "@/utils/formatValue";
import { deleteServiceAction } from "../_actions/delete-service";
import { toast } from "sonner";
import { ResultPermissionsProps } from "@/utils/permissions/canPermissions";

interface ServicesListProps {
  services: Service[];
  permissions: ResultPermissionsProps;
}

export function ServicesList({ services, permissions }: ServicesListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<null | Service>(null);
  const [view, changeView] = useViewMode("encaixa:services-view", "list");

  const servicesList = permissions.hasPermission
    ? services
    : services.slice(0, permissions.plan?.maxServices || 3);

  async function handleDeleteService(serviceId: string) {
    const response = await deleteServiceAction({ serviceId: serviceId });
    if (response.error) {
      toast.error(response.error);
      return false;
    }
    toast.success("Serviço deletado com sucesso!");
    return true;
  }

  function handleEditService(service: Service) {
    setEditingService(service);
    setIsDialogOpen(true);
  }

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setEditingService(null);
        }
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {servicesList.length === 0
              ? "Nenhum serviço cadastrado"
              : `${servicesList.length} ${servicesList.length === 1 ? "serviço" : "serviços"}`}
          </p>

          {servicesList.length > 0 && <ViewModeToggle view={view} onChange={changeView} />}
        </div>

        {permissions.hasPermission && (
          <DialogTrigger asChild>
            <Button className="hidden gap-2 md:inline-flex">
              <Plus className="h-4 w-4" />
              Novo serviço
            </Button>
          </DialogTrigger>
        )}
      </div>

      {permissions.hasPermission && (
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Novo serviço"
            className="fixed right-4 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:hidden"
          >
            <Plus className="h-6 w-6" />
          </button>
        </DialogTrigger>
      )}

      <DialogContent
        onInteractOutside={(e) => {
          e.preventDefault();
          setIsDialogOpen(false);
          setEditingService(null);
        }}
      >
        <DialogService
          closeModal={() => {
            setIsDialogOpen(false);
            setEditingService(null);
          }}
          serviceId={editingService ? editingService.id : undefined}
          initialValues={
            editingService
              ? {
                  name: editingService.name,
                  price: formatvalue(editingService.price.toString()),
                  hours: Math.floor(editingService.duration / 60).toString(),
                  minutes: (editingService.duration % 60).toString(),
                }
              : undefined
          }
          onDelete={
            editingService
              ? async () => {
                  const ok = await handleDeleteService(editingService.id);
                  if (ok) {
                    setIsDialogOpen(false);
                    setEditingService(null);
                  }
                }
              : undefined
          }
        />
      </DialogContent>

      {servicesList.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-foreground">Nenhum serviço cadastrado ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione o primeiro serviço para começar a receber agendamentos.
            </p>
          </div>
          {permissions.hasPermission && (
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Adicionar serviço
              </Button>
            </DialogTrigger>
          )}
        </div>
      ) : view === "list" ? (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {servicesList.map((service) => {
            const perMinuteCents =
              service.duration > 0 ? Math.round(service.price / service.duration) : 0;

            return (
              <li key={service.id}>
                <button
                  type="button"
                  onClick={() => handleEditService(service)}
                  aria-label={`Editar ${service.name}`}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <h3 className="font-display truncate font-semibold text-foreground">
                      {service.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {service.duration} min · {formatvalue(String(perMinuteCents))}/min
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <p className="font-mono text-lg font-semibold tabular-nums text-primary">
                      {formatvalue(service.price.toString())}
                    </p>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {servicesList.map((service) => {
            const perMinuteCents =
              service.duration > 0 ? Math.round(service.price / service.duration) : 0;

            return (
              <li key={service.id}>
                <button
                  type="button"
                  onClick={() => handleEditService(service)}
                  aria-label={`Editar ${service.name}`}
                  className="flex h-full w-full flex-col items-stretch gap-3 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-secondary/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display min-w-0 truncate font-semibold text-foreground">
                      {service.name}
                    </h3>
                    <Pencil
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                    />
                  </div>

                  <div>
                    <p className="font-mono text-xl font-semibold tabular-nums text-primary">
                      {formatvalue(service.price.toString())}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {service.duration} min · {formatvalue(String(perMinuteCents))}/min
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
