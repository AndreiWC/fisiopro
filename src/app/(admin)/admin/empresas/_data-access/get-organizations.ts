"use server";

import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";

export async function getOrganizations() {
  await requireAdminSession();

  const organizations = await prisma.organization.findMany({
    include: { subscription: true },
    orderBy: { createdAt: "desc" },
  });

  return organizations.map((org) => ({
    id: org.id,
    name: org.name,
    segment: org.segment,
    status: org.status,
    createdAt: org.createdAt,
    plan: org.subscription?.plan ?? null,
    subscriptionStatus: org.subscription?.status ?? null,
  }));
}

export type OrganizationListItem = Awaited<ReturnType<typeof getOrganizations>>[number];
