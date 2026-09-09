"use server";

import prisma from "@/lib/prisma";

interface GetOrganizationDataProps {
  organizationId: string;
}

export async function getOrganizationData({ organizationId }: GetOrganizationDataProps) {
  try {
    if (!organizationId) {
      return null;
    }

    const organization = await prisma.organization.findFirst({
      where: {
        id: organizationId,
      },
      include: {
        subscription: true,
      },
    });

    if (!organization) {
      return null;
    }

    return organization;
  } catch (err) {
    console.error(err);
    return null;
  }
}
