"use server";
import prisma from "@/lib/prisma";

export async function getTimesClinic({ organizationId }: { organizationId: string }) {
  try {
    if (!organizationId) {
      return {
        times: [],
        organizationId: organizationId,
      };
    }

    const organization = await prisma.organization.findFirst({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
        times: true,
      },
    });

    if (!organization) {
      return {
        times: [],
        organizationId: "",
      };
    }

    return { times: organization.times, organizationId: organization.id };
  } catch (err) {
    return {
      times: [],
      organizationId: "",
      error: "Erro ao buscar horários: " + (err as any).message,
    };
  }
}
