"use server";

import { auth } from "@/lib/auth";
import { getActiveOrganization, getActivePatientProfile } from "@/lib/organization";

export type HeaderIdentity =
  | { role: "clinic" }
  | { role: "patient"; name: string | null; image: string | null }
  | { role: "guest" };

export async function getHeaderIdentity(): Promise<HeaderIdentity> {
  const session = await auth();
  if (!session?.user?.id) return { role: "guest" };

  const organization = await getActiveOrganization();
  if (organization) return { role: "clinic" };

  const patientProfile = await getActivePatientProfile();
  if (patientProfile) {
    return { role: "patient", name: session.user.name ?? null, image: session.user.image ?? null };
  }

  return { role: "guest" };
}
