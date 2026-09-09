"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const formSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  insuranceName: z.string().optional(),
  insuranceNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

export async function updatePatientProfile(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: formData.name, phone: formData.phone || null },
    });

    await prisma.patientProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        cpf: formData.cpf || null,
        insuranceName: formData.insuranceName || null,
        insuranceNumber: formData.insuranceNumber || null,
        emergencyContactName: formData.emergencyContactName || null,
        emergencyContactPhone: formData.emergencyContactPhone || null,
      },
      update: {
        cpf: formData.cpf || null,
        insuranceName: formData.insuranceName || null,
        insuranceNumber: formData.insuranceNumber || null,
        emergencyContactName: formData.emergencyContactName || null,
        emergencyContactPhone: formData.emergencyContactPhone || null,
      },
    });

    revalidatePath("/perfil");
    return { data: "Perfil atualizado com sucesso!" };
  } catch (err: any) {
    if (err?.code === "P2002") {
      return { error: "Esse CPF já está cadastrado em outra conta." };
    }
    return { error: "Erro ao atualizar o perfil" };
  }
}
