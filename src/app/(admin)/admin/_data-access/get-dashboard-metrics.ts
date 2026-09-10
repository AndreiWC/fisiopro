"use server";

import prisma from "@/lib/prisma";
import { subscriptionPlans } from "@/utils/plans";
import type { Plan } from "@prisma/client";
import { requireAdminSession } from "@/lib/require-admin";

function priceForPlan(plan: Plan): number {
  return subscriptionPlans.find((p) => p.id === plan)?.price ?? 0;
}

export async function getDashboardMetrics() {
  await requireAdminSession();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeSubscriptions,
    statusGroups,
    planGroups,
    totalOrganizations,
    newOrganizationsThisMonth,
    canceledThisMonth,
    activeAtStartOfMonth,
  ] = await Promise.all([
    prisma.subscription.findMany({ where: { status: "active" }, select: { plan: true } }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.subscription.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.organization.count(),
    prisma.organization.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.subscription.count({ where: { status: "canceled", updatedAt: { gte: startOfMonth } } }),
    prisma.subscription.count({
      where: {
        createdAt: { lt: startOfMonth },
        OR: [{ status: "active" }, { status: "canceled", updatedAt: { gte: startOfMonth } }],
      },
    }),
  ]);

  const mrr = activeSubscriptions.reduce((sum, sub) => sum + priceForPlan(sub.plan), 0);
  const churnRate = activeAtStartOfMonth > 0 ? canceledThisMonth / activeAtStartOfMonth : 0;

  return {
    mrr,
    totalOrganizations,
    activeSubscriptionsCount: activeSubscriptions.length,
    newOrganizationsThisMonth,
    churnRate,
    statusBreakdown: statusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
    })),
    planBreakdown: planGroups.map((group) => ({
      plan: group.plan,
      count: group._count._all,
    })),
  };
}

export type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;
