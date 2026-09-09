"use server";
import prisma from "@/lib/prisma";

export async function getProfessionals() {
  try {
    const professionals = await prisma.organization.findMany({
      where: {
        status: true,
      },
      include: {
        subscription: true,
        services: {
          where: { status: true },
          select: { name: true },
        },
      },
    });
    return professionals;
  } catch (err) {
    return [];
  }
}
