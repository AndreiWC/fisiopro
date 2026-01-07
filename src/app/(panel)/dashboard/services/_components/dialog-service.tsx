"user client"; // roda no lado cliente

import {
  DialogHeader,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDialogServiceForm,
  DialogServiceFormData,
} from "./dialog-service-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  formatvalue,
  unformatvalue,
  unformatvalueToCents,
} from "@/utils/formatValue";
import { createServiceAction } from "../_actions/create-service";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateServiceAction } from "../_actions/update-service";

interface DialogServiceProps {
  closeModal: () => void;
  serviceId?: string;
  initialValues?: {
    name: string;
    price: string;
    hours: string;
    minutes: string;
  } | null;
}

export function DialogService({
  closeModal,
  serviceId,
  initialValues,
}: DialogServiceProps) {
  const form = useDialogServiceForm({
    initialValues: initialValues || undefined,
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(value: DialogServiceFormData) {
    setLoading(true);
    const priceInCents = unformatvalueToCents(value.price);
    const hours = parseInt(value.hours) || 0;
    const minutes = parseInt(value.minutes) || 0;
    const durationInMinutes = hours * 60 + minutes;

    if (serviceId) {
      // Editar serviço
      await editServiceById({
        serviceId,
        name: value.name,
        preiceInCents: priceInCents,
        duration: durationInMinutes,
      });

      return;
    }
    const response = await createServiceAction({
      name: value.name,
      price: priceInCents,
      duration: durationInMinutes,
    });
    setLoading(false);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success("Serviço criado com sucesso!");
    handleCloseModal();
    router.refresh();
  }

  async function editServiceById({
    serviceId,
    name,
    preiceInCents,
    duration,
  }: {
    serviceId: string;
    name: string;
    preiceInCents: number;
    duration: number;
  }) {
    const response = await updateServiceAction({
      serviceId: serviceId,
      name: name,
      price: preiceInCents,
      duration: duration,
    });
    if (response.error) {
      toast.error(response.error);

      return;
    }
    toast.success("Serviço atualizado com sucesso!");
    handleCloseModal();
    router.refresh();

    setLoading(false);
  }

  function handleCloseModal() {
    form.reset();
    closeModal();
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          Novo Serviço
        </DialogTitle>
        <DialogDescription>
          Adicione um novo serviço para sua clínica.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form className="space-y-2" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="my-2">
                  <FormLabel>Nome do Serviço</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome do serviço" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem className="my-2">
                  <FormLabel>Valor do Serviço</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: 120,00"
                      onChange={(e) => {
                        const valor = formatvalue(e.target.value);
                        field.onChange(valor);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="mt-4 mb-2 font-semibold">
              Tempo de duração do Serviço
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem className="my-2">
                    <FormLabel>Horas</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1" min="0" type="number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minutes"
                render={({ field }) => (
                  <FormItem className="my-2">
                    <FormLabel>Minutos</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0" min="0" type="number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-400"
              disabled={loading}
            >
              {loading
                ? "Cadastrando..."
                : `${serviceId ? "Atualizar Serviço" : "Cadastrar Serviço"}`}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
