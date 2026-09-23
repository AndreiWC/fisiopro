"use server";
import prisma from "@/lib/prisma";

export async function getClinicalRecords({
  customerId,
  organizationId,
}: {
  customerId: string;
  organizationId: string;
}) {
  const records = await prisma.clinicalRecord.findMany({
    where: {
      customerId,
      organizationId,
      deletedAt: null,
    },
    include: {
      author: { select: { name: true } },
    },
    orderBy: { sessionDate: "desc" },
  });

  return records.map((record) => ({
    id: record.id,
    note: record.note,
    sessionDate: record.sessionDate,
    images: record.images,
    authorName: record.author.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }));
}

export type ClinicalRecordListItem = Awaited<
  ReturnType<typeof getClinicalRecords>
>[number];
