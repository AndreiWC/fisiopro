"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getActiveOrganization } from "@/lib/organization";
import { isSafeRedirectTarget } from "@/lib/utils";
import { redirect } from "next/navigation";

export async function chooseClinicRole() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Guarda de idempotência: cliques duplicados/retries não devem criar uma segunda
  // Organization+Membership para quem já escolheu esse papel.
  const existingOrganization = await getActiveOrganization();
  if (existingOrganization) {
    redirect("/dashboard");
  }

  const organization = await prisma.organization.create({
    data: { name: session.user.name ?? null, image: session.user.image ?? null },
  });
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

  redirect(isSafeRedirectTarget(next) ? next : "/perfil");
}
