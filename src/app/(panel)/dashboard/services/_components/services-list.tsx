"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, Pencil, Plus, Trash } from "lucide-react";
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

  const servicesList = permissions.hasPermission
    ? services
    : services.slice(0, permissions.plan?.maxServices || 3);

  async function handleDeleteService(serviceId: string) {
    const response = await deleteServiceAction({ serviceId: serviceId });
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success("Serviço deletado com sucesso!");
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {servicesList.length === 0
            ? "Nenhum serviço cadastrado"
            : `${servicesList.length} ${servicesList.length === 1 ? "serviço" : "serviços"}`}
        </p>

        {permissions.hasPermission && (
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Novo serviço
            </Button>
          </DialogTrigger>
        )}
      </div>

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
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {servicesList.map((service) => {
            const perMinuteCents =
              service.duration > 0 ? Math.round(service.price / service.duration) : 0;

            return (
              <li
                key={service.id}
                className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate font-semibold text-foreground">
                    {service.name}
                  </h3>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditService(service)}
                      aria-label={`Editar ${service.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(service.id)}
                      aria-label={`Excluir ${service.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-primary">
                  {formatvalue(service.price.toString())}
                </p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {service.duration} min · {formatvalue(String(perMinuteCents))}/min
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
