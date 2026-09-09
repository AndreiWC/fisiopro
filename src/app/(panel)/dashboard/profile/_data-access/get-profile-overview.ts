"use server";

import prisma from "@/lib/prisma";
import type { Organization } from "@prisma/client";

export interface CompletionItem {
  label: string;
  done: boolean;
}

export interface ProfileOverview {
  activePatients: number;
  totalPatients: number;
  sessionsCompleted: number;
  noShowRate: number | null;
  completion: CompletionItem[];
  completionPercent: number;
}

export async function getProfileOverview(organizationId: string): Promise<ProfileOverview> {
  const [organization, customers, appointments, servicesCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.customer.findMany({ where: { organizationId }, select: { treatmentStatus: true } }),
    prisma.appointments.findMany({
      where: { organizationId },
      select: { status: true },
    }),
    prisma.service.count({ where: { organizationId, status: true } }),
  ]);

  const activePatients = customers.filter((c) => c.treatmentStatus === "EM_TRATAMENTO").length;
  const sessionsCompleted = appointments.filter((a) => a.status === "COMPLETED").length;
  const noShowCount = appointments.filter((a) => a.status === "NO_SHOW").length;
  const noShowDenominator = sessionsCompleted + noShowCount;
  const noShowRate =
    noShowDenominator > 0 ? Math.round((noShowCount / noShowDenominator) * 100) : null;

  const completion = buildCompletionChecklist(organization, servicesCount);
  const completionPercent = Math.round(
    (completion.filter((item) => item.done).length / completion.length) * 100,
  );

  return {
    activePatients,
    totalPatients: customers.length,
    sessionsCompleted,
    noShowRate,
    completion,
    completionPercent,
  };
}

function buildCompletionChecklist(
  organization: Organization | null,
  servicesCount: number,
): CompletionItem[] {
  return [
    { label: "Foto de perfil", done: Boolean(organization?.image) },
    { label: "Endereço da clínica", done: Boolean(organization?.address) },
    { label: "Telefone de contato", done: Boolean(organization?.phone) },
    { label: "Segmento do negócio", done: Boolean(organization?.segment) },
    { label: "Registro profissional", done: Boolean(organization?.professionalRegistration) },
    { label: "Pelo menos um serviço ativo", done: servicesCount > 0 },
    { label: "Horários de atendimento", done: (organization?.times.length ?? 0) > 0 },
  ];
}
