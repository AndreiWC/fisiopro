"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClinicalRecordForm } from "./clinical-record-form";
import { ClinicalRecordItem } from "./clinical-record-item";
import { deleteClinicalRecordAction } from "../_actions/delete-clinical-record";
import type { ClinicalRecordListItem } from "../_data-access/get-clinical-records";
import type { ResultPermissionsProps } from "@/utils/permissions/canPermissions";

interface ClinicalRecordListProps {
  records: ClinicalRecordListItem[];
  customerId: string;
  organizationId: string;
  permissions: ResultPermissionsProps;
}

export function ClinicalRecordList({
  records,
  customerId,
  organizationId,
  permissions,
}: ClinicalRecordListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<ClinicalRecordListItem | null>(null);
  const router = useRouter();

  function handleEdit(record: ClinicalRecordListItem) {
    setEditingRecord(record);
    setIsDialogOpen(true);
  }

  async function handleDelete(record: ClinicalRecordListItem) {
    const response = await deleteClinicalRecordAction({
      recordId: record.id,
      customerId,
    });
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success(response.data);
    setIsDialogOpen(false);
    setEditingRecord(null);
    router.refresh();
  }

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setEditingRecord(null);
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {records.length === 0
            ? "Nenhuma anotação registrada"
            : `${records.length} ${records.length === 1 ? "anotação" : "anotações"}`}
        </p>

        {permissions.hasPermission && (
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova anotação
            </Button>
          </DialogTrigger>
        )}
      </div>

      <DialogContent
        onInteractOutside={(e) => {
          e.preventDefault();
          setIsDialogOpen(false);
          setEditingRecord(null);
        }}
      >
        <ClinicalRecordForm
          closeModal={() => {
            setIsDialogOpen(false);
            setEditingRecord(null);
          }}
          customerId={customerId}
          organizationId={organizationId}
          record={editingRecord}
          onDelete={
            editingRecord ? () => handleDelete(editingRecord) : undefined
          }
        />
      </DialogContent>

      {records.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-foreground">Nenhuma anotação ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Registre a primeira sessão desse paciente.
            </p>
          </div>
          {permissions.hasPermission && (
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Adicionar anotação
              </Button>
            </DialogTrigger>
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {records.map((record) => (
            <ClinicalRecordItem
              key={record.id}
              record={record}
              onEdit={handleEdit}
            />
          ))}
        </ul>
      )}
    </Dialog>
  );
}
