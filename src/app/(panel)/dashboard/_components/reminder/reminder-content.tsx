"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { ReminderFormData, useReminderForm } from "./reminder-form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createReminder } from "../../_actions/create-reminder";
import { toast } from "sonner";
import { useRouter } from "next/dist/client/components/navigation";

interface ReminderContentProps {
  closeDialog: () => void;
}

export function ReminderContent({ closeDialog }: ReminderContentProps) {
  const form = useReminderForm();
  const router = useRouter();
  async function onSubmit(formData: ReminderFormData) {
    // Lógica para enviar o formulário
    const response = await createReminder({
      description: formData.description,
    });

    if (response.error) {
      // Lidar com erro (exibir mensagem, etc.)
      console.error(response.error);
      return;
    }

    toast.success(response.data);
    router.refresh();
    closeDialog();
  }
  return (
    <div className="grid gap-4 py-4">
      <Form {...form}>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Lembrete:</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex: Ligar para o cliente"
                    {...field}
                    className="max-h-52"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={!form.watch("description")}
          >
            Adicionar Lembrete
          </Button>
        </form>
      </Form>
    </div>
  );
}
