"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DialogService } from "./dialog-service";
import { Service } from "@prisma/client";
import { formatvalue } from "@/utils/formatValue";
import { Pencil, Trash } from "lucide-react";
import { deleteServiceAction } from "../_actions/delete-service";
import { toast } from "sonner";
import { ResultPermissionsProps } from "@/utils/permissions/canPermissions";
import Link from "next/link";

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

  async function handleEditService(service: Service) {
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
      <section className="mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pg-2">
            <CardTitle className="text-xl md:text-3xl font-bold">
              Serviços
            </CardTitle>
            {permissions.hasPermission && (
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
            )}
            {!permissions.hasPermission && (
              <Link
                href="/dashboard/plans"
                className="text-destructive hover:underline"
              >
                Limite de serviços atingido
              </Link>
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
                        hours: Math.floor(
                          editingService.duration / 60,
                        ).toString(),
                        minutes: (editingService.duration % 60).toString(),
                      }
                    : undefined
                }
              />
            </DialogContent>
          </CardHeader>

          <CardContent>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {servicesList.map((service) => (
                <article
                  key={service.id}
                  className="p-4 border border-border rounded-xl bg-muted/40 hover:bg-muted transition-colors"
                >
                  <div className="flex justify-between items-start">
                    {/* Nome + Preço */}
                    <div>
                      <h3 className="font-semibold">{service.name}</h3>
                      <span className="block font-mono font-medium tabular-nums text-foreground">
                        {formatvalue(service.price.toString())}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {service.duration} min
                      </p>
                    </div>

                    {/* Ícones de ações */}
                    <div className="flex items-center space-x-2">
                      {/* Editar */}
                      <button
                        onClick={() => handleEditService(service)}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <Pencil size={18} className="text-foreground/70" />
                      </button>

                      {/* Excluir */}
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <Trash size={18} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </CardContent>
        </Card>
      </section>
    </Dialog>
  );
}
