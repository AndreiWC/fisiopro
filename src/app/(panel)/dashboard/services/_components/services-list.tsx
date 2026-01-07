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
import { Service } from "@/generated/prisma/client";
import { formatvalue } from "@/utils/formatValue";
import { Pencil, Trash } from "lucide-react";
import { deleteServiceAction } from "../_actions/delete-service";
import { toast } from "sonner";

interface ServicesListProps {
  services: Service[];
}

export function ServicesList({ services }: ServicesListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<null | Service>(null);

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
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <section className="mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pg-2">
            <CardTitle className="text-xl md:text-3xl font-bold">
              Serviços
            </CardTitle>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>

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
                          editingService.duration / 60
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
              {services.map((service) => (
                <article
                  key={service.id}
                  className="p-4 border rounded-xl bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="flex justify-between items-start">
                    {/* Nome + Preço */}
                    <div>
                      <h3 className="font-semibold">{service.name}</h3>
                      <span className="text-gray-700 font-medium block">
                        {formatvalue(service.price.toString())}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {service.duration} min
                      </p>
                    </div>

                    {/* Ícones de ações */}
                    <div className="flex items-center space-x-2">
                      {/* Editar */}
                      <button
                        onClick={() => handleEditService(service)}
                        className="p-2 rounded-lg hover:bg-gray-200 transition"
                      >
                        <Pencil size={18} className="text-gray-700" />
                      </button>

                      {/* Excluir */}
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="p-2 rounded-lg hover:bg-red-200 transition"
                      >
                        <Trash size={18} className="text-red-600" />
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
