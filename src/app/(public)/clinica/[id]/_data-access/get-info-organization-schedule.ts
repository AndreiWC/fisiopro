"use server";
import prisma from "@/lib/prisma";

export async function getInfoOrganizationSchedule({ organizationId }: { organizationId: string }) {
  try {
    if (!organizationId) {
      return null;
    }
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId },
      include: {
        subscription: true,
        services: {
          where: {
            status: true,
          },
        },
      },
    });

    if (!organization) {
      return null;
    }

    return organization;
  } catch (error) {
    console.log(error);
    return null;
  }
}
