"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePickerButton } from "@/app/(panel)/dashboard/_components/agenda/date-picker-button";
import {
  useClinicalRecordForm,
  ClinicalRecordFormData,
} from "../_lib/use-clinical-record-form";
import { createClinicalRecordAction } from "../_actions/create-clinical-record";
import { updateClinicalRecordAction } from "../_actions/update-clinical-record";
import type { ClinicalRecordListItem } from "../_data-access/get-clinical-records";

interface ClinicalRecordFormProps {
  closeModal: () => void;
  customerId: string;
  organizationId: string;
  record?: ClinicalRecordListItem | null;
  onDelete?: () => void | Promise<void>;
}

const MAX_IMAGES = 3;

export function ClinicalRecordForm({
  closeModal,
  customerId,
  organizationId,
  record,
  onDelete,
}: ClinicalRecordFormProps) {
  const form = useClinicalRecordForm({
    initialValues: record
      ? {
          note: record.note,
          sessionDate: new Date(record.sessionDate).toISOString(),
          images: record.images,
        }
      : undefined,
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const images = form.watch("images");

  async function handleUploadImage(file: File) {
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      toast.error("Formato de imagem inválido");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      toast.error(`No máximo ${MAX_IMAGES} imagens por anotação`);
      return;
    }

    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("userId", organizationId);

      const response = await fetch("/api/image/upload", {
        method: "POST",
        body: uploadData,
      });

      if (!response.ok) {
        toast.error("Falha ao enviar uma das imagens, tente novamente");
        return;
      }

      const data = await response.json();
      form.setValue("images", [...images, data.secure_url as string]);
    } catch (err) {
      toast.error("Falha ao enviar uma das imagens, tente novamente");
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage(url: string) {
    form.setValue(
      "images",
      images.filter((image) => image !== url),
    );
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  async function onSubmit(value: ClinicalRecordFormData) {
    setLoading(true);

    if (record) {
      const response = await updateClinicalRecordAction({
        recordId: record.id,
        customerId,
        note: value.note,
        sessionDate: value.sessionDate,
        images: value.images,
      });
      setLoading(false);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success(response.data);
      handleCloseModal();
      router.refresh();
      return;
    }

    const response = await createClinicalRecordAction({
      customerId,
      note: value.note,
      sessionDate: value.sessionDate,
      images: value.images,
    });
    setLoading(false);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success(response.data);
    handleCloseModal();
    router.refresh();
  }

  function handleCloseModal() {
    form.reset();
    closeModal();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          {record ? "Editar anotação" : "Nova anotação"}
        </DialogTitle>
        <DialogDescription>
          {record
            ? "Atualize o registro dessa sessão."
            : "Registre o que aconteceu nessa sessão do paciente."}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="sessionDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data da sessão</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <DatePickerButton
                      date={new Date(field.value)}
                      onChange={(date) => field.onChange(date.toISOString())}
                    />
                    <span className="text-sm text-muted-foreground">
                      {new Date(field.value).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>O que aconteceu na sessão</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descreva a evolução, procedimentos e observações da sessão"
                    rows={6}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel>Imagens (opcional)</FormLabel>
            <div className="mt-2 flex flex-wrap gap-3">
              {images.map((url) => (
                <div
                  key={url}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(url)}
                    aria-label="Remover imagem"
                    className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES && (
                <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-secondary/40">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || deleting || uploading}
          >
            {loading
              ? "Salvando..."
              : record
                ? "Salvar alterações"
                : "Adicionar ao prontuário"}
          </Button>

          {record && onDelete && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={loading || deleting}
              onClick={handleDelete}
            >
              {deleting ? "Excluindo..." : "Excluir anotação"}
            </Button>
          )}
        </form>
      </Form>
    </>
  );
}
