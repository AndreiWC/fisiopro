import type { Segment } from "@prisma/client";

export const SEGMENT_OPTIONS: { value: Segment; label: string }[] = [
  { value: "BARBEARIA", label: "Barbearias" },
  { value: "SALAO_BELEZA", label: "Salões de beleza" },
  { value: "CLINICA_ESTETICA", label: "Clínicas de estética" },
  { value: "FISIOTERAPIA", label: "Fisioterapia" },
  { value: "ODONTOLOGIA", label: "Odontologia" },
  { value: "MEDICO", label: "Médicos" },
];

export function segmentLabel(segment: Segment | null | undefined) {
  return SEGMENT_OPTIONS.find((option) => option.value === segment)?.label;
}
