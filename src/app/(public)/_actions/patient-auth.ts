"use server";

import prisma from "@/lib/prisma";
import { getPatientSessionData, clearPatientSessionCookie } from "@/lib/patient-session";

export async function getCurrentPatient() {
  const session = await getPatientSessionData();
  if (!session) return null;

  try {
    const patient = await prisma.patient.findUnique({ where: { id: session.id } });
    if (!patient || patient.email.toLowerCase() !== session.email.toLowerCase()) {
      return null;
    }
    return patient;
  } catch {
    return null;
  }
}

export async function signOutPatient() {
  await clearPatientSessionCookie();
}
