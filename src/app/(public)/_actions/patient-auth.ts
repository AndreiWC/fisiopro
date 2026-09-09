"use server";

import { auth, signOut } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type CurrentPatient = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  phone: string | null;
  cpf: string | null;
  insuranceName: string | null;
  insuranceNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

export async function getCurrentPatient(): Promise<CurrentPatient | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [user, patientProfile] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.patientProfile.findUnique({ where: { userId: session.user.id } }),
  ]);

  if (!user || !patientProfile) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    phone: user.phone,
    cpf: patientProfile.cpf,
    insuranceName: patientProfile.insuranceName,
    insuranceNumber: patientProfile.insuranceNumber,
    emergencyContactName: patientProfile.emergencyContactName,
    emergencyContactPhone: patientProfile.emergencyContactPhone,
  };
}

export async function signOutPatient() {
  await signOut({ redirectTo: "/" });
}
