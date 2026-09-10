"use server";

import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import prisma from "@/lib/prisma";
import { subscriptionPlans } from "@/utils/plans";
import type { Plan } from "@prisma/client";

function priceForPlan(plan: Plan): number {
  return subscriptionPlans.find((p) => p.id === plan)?.price ?? 0;
}

export async function getGrowthSeries() {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const reference = subMonths(now, 11 - index);
    return {
      label: format(reference, "MMM/yy", { locale: ptBR }),
      start: startOfMonth(reference),
      end: endOfMonth(reference),
    };
  });

  const [organizations, activeSubscriptions] = await Promise.all([
    prisma.organization.findMany({ select: { createdAt: true } }),
    prisma.subscription.findMany({ where: { status: "active" }, select: { plan: true, createdAt: true } }),
  ]);

  return months.map(({ label, start, end }) => {
    const newCompanies = organizations.filter(
      (org) => org.createdAt >= start && org.createdAt <= end,
    ).length;

    const mrr = activeSubscriptions
      .filter((sub) => sub.createdAt <= end)
      .reduce((sum, sub) => sum + priceForPlan(sub.plan), 0);

    return { month: label, newCompanies, mrr };
  });
}

export type GrowthSeriesPoint = Awaited<ReturnType<typeof getGrowthSeries>>[number];
