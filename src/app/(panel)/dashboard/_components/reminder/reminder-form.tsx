"use client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export const reminderFormSchema = z.object({
  description: z.string().min(1, "A descrição é obrigatória"),
});

export type ReminderFormData = z.infer<typeof reminderFormSchema>;

export function useReminderForm() {
  return useForm<ReminderFormData>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      description: "",
    },
  });
}
