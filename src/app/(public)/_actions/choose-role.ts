"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function chooseClinicRole() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const organization = await prisma.organization.create({ data: {} });
  await prisma.membership.create({
    data: { userId: session.user.id, organizationId: organization.id, role: "OWNER" },
  });

  redirect("/dashboard");
}

export async function choosePatientRole(next?: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  await prisma.patientProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });

  // Vincula retroativamente Customer rows que alguma clínica já cadastrou com esse
  // e-mail antes deste paciente ter criado conta (ex.: cadastro manual no dashboard).
  await prisma.customer.updateMany({
    where: {
      userId: null,
      email: { equals: session.user.email, mode: "insensitive" },
    },
    data: { userId: session.user.id },
  });

  redirect(next && next.startsWith("/") ? next : "/perfil");
}
