import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Organization, PatientProfile } from "@prisma/client";

/** Organização ativa da sessão atual (dono ou staff), ou null se não houver sessão/vínculo. */
export async function getActiveOrganization(): Promise<Organization | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  return membership?.organization ?? null;
}

/** Como getActiveOrganization(), mas lança se não houver organização vinculada. */
export async function requireActiveOrganization(): Promise<Organization> {
  const organization = await getActiveOrganization();
  if (!organization) {
    throw new Error("Nenhuma organização vinculada à sessão atual");
  }
  return organization;
}

/** Perfil de paciente vinculado à sessão atual, ou null. */
export async function getActivePatientProfile(): Promise<PatientProfile | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.patientProfile.findUnique({ where: { userId: session.user.id } });
}
