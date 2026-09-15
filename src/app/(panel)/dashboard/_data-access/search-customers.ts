"use server";
import prisma from "@/lib/prisma";

export async function searchCustomers({
  organizationId,
  query,
  limit = 8,
}: {
  organizationId: string;
  query: string;
  limit?: number;
}) {
  const trimmed = query.trim();
  if (!organizationId || !trimmed) return [];

  return prisma.customer.findMany({
    where: {
      organizationId,
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
        { phone: { contains: trimmed } },
      ],
    },
    select: { id: true, name: true, email: true, phone: true, image: true },
    take: limit,
    orderBy: { name: "asc" },
  });
}

export type CustomerSearchResult = Awaited<ReturnType<typeof searchCustomers>>[number];
