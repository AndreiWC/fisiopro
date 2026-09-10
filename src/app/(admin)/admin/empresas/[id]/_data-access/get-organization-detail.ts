"use server";

import prisma from "@/lib/prisma";
import { PLANS } from "@/utils/plans";
import { requireAdminSession } from "@/lib/require-admin";

export async function getOrganizationDetail(organizationId: string) {
  await requireAdminSession();

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscription: true,
      memberships: { where: { role: "OWNER" }, include: { user: true } },
      _count: { select: { services: true, customers: true, appointments: true } },
    },
  });

  if (!organization) return null;

  const owner = organization.memberships[0]?.user ?? null;
  const plan = organization.subscription?.plan ?? null;

  return {
    id: organization.id,
    name: organization.name,
    segment: organization.segment,
    phone: organization.phone,
    address: organization.address,
    status: organization.status,
    stripeCustomerId: organization.stripe_customer_id,
    createdAt: organization.createdAt,
    owner: owner ? { name: owner.name, email: owner.email } : null,
    subscription: organization.subscription,
    usage: {
      services: organization._count.services,
      customers: organization._count.customers,
      appointments: organization._count.appointments,
    },
    limits: plan ? PLANS[plan] : null,
  };
}

export type OrganizationDetail = NonNullable<
  Awaited<ReturnType<typeof getOrganizationDetail>>
>;
