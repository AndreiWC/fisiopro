"use server";

import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";

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

export async function getProfileOverview(userId: string): Promise<ProfileOverview> {
  const [user, customers, appointments, servicesCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.customer.findMany({ where: { userId }, select: { treatmentStatus: true } }),
    prisma.appointments.findMany({
      where: { userId },
      select: { status: true },
    }),
    prisma.service.count({ where: { userId, status: true } }),
  ]);

  const activePatients = customers.filter((c) => c.treatmentStatus === "EM_TRATAMENTO").length;
  const sessionsCompleted = appointments.filter((a) => a.status === "COMPLETED").length;
  const noShowCount = appointments.filter((a) => a.status === "NO_SHOW").length;
  const noShowDenominator = sessionsCompleted + noShowCount;
  const noShowRate =
    noShowDenominator > 0 ? Math.round((noShowCount / noShowDenominator) * 100) : null;

  const completion = buildCompletionChecklist(user, servicesCount);
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
  user: User | null,
  servicesCount: number,
): CompletionItem[] {
  return [
    { label: "Foto de perfil", done: Boolean(user?.image) },
    { label: "Endereço da clínica", done: Boolean(user?.address) },
    { label: "Telefone de contato", done: Boolean(user?.phone) },
    { label: "Segmento do negócio", done: Boolean(user?.segment) },
    { label: "Registro profissional", done: Boolean(user?.professionalRegistration) },
    { label: "Pelo menos um serviço ativo", done: servicesCount > 0 },
    { label: "Horários de atendimento", done: (user?.times.length ?? 0) > 0 },
  ];
}
