"use server";

import prisma from "@/lib/prisma";

export async function getPermissionOrganizationToReports({
  organizationId,
}: {
  organizationId: string;
}) {
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
    },
    include: {
      subscription: true,
    },
  });

  if (!organization?.subscription || organization.subscription.plan !== "PROFESSIONAL") {
    return null;
  }
  return organization;
}
