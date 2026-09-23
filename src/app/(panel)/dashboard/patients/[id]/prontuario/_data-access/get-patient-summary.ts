"use server";
import prisma from "@/lib/prisma";

export async function getPatientSummary({
  customerId,
  organizationId,
}: {
  customerId: string;
  organizationId: string;
}) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      treatmentStatus: true,
    },
  });

  return customer;
}

export type PatientSummary = NonNullable<
  Awaited<ReturnType<typeof getPatientSummary>>
>;
