import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";

const formSchema = z.object({
  note: z.string().min(1, { message: "Descreva o que ocorreu na sessão" }),
  sessionDate: z.string().min(1, { message: "Selecione a data da sessão" }),
  images: z
    .array(z.string())
    .max(3, { message: "No máximo 3 imagens por anotação" }),
});

export interface UseClinicalRecordFormProps {
  initialValues?: {
    note: string;
    sessionDate: string;
    images: string[];
  };
}

export type ClinicalRecordFormData = z.infer<typeof formSchema>;

export function useClinicalRecordForm({
  initialValues,
}: UseClinicalRecordFormProps) {
  return useForm<ClinicalRecordFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues || {
      note: "",
      sessionDate: new Date().toISOString(),
      images: [],
    },
  });
}
