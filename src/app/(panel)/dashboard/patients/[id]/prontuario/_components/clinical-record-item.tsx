"use client";

import Image from "next/image";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil } from "lucide-react";
import type { ClinicalRecordListItem } from "../_data-access/get-clinical-records";

interface ClinicalRecordItemProps {
  record: ClinicalRecordListItem;
  onEdit: (record: ClinicalRecordListItem) => void;
}

export function ClinicalRecordItem({ record, onEdit }: ClinicalRecordItemProps) {
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {format(record.sessionDate, "dd 'de' MMMM 'de' yyyy", {
              locale: ptBR,
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            Registrado por {record.authorName || "Membro da equipe"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEdit(record)}
          aria-label="Editar anotação"
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
        {record.note}
      </p>

      {record.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {record.images.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border"
            >
              <Image src={url} alt="" fill sizes="80px" className="object-cover" />
            </a>
          ))}
        </div>
      )}
    </li>
  );
}
