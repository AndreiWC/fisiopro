"use server";
import prisma from "@/lib/prisma";

export async function getTimesClinic({ userId }: { userId: string }) {
  try {
    if (!userId) {
      return {
        times: [],
        userId: userId,
      };
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        id: true,
        times: true,
      },
    });

    if (!user) {
      return {
        times: [],
        userId: "",
      };
    }

    return { times: user.times, userId: user.id };
  } catch (err) {
    return {
      times: [],
      userId: "",
      error: "Erro ao buscar horários: " + (err as any).message,
    };
  }
}
