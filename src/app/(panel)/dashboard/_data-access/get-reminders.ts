"use server";

import prisma from "@/lib/prisma";

export async function getReminders({ organizationId }: { organizationId: string }) {
  if (!organizationId) {
    return [];
  }

  try {
    const reminders = await prisma.reminder.findMany({
      where: { organizationId },
    });
    return reminders;
  } catch (err) {
    console.error("Erro ao buscar lembretes:", err);
    return [];
  }
}
