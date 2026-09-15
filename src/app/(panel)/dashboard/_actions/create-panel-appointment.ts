"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";
import { buildOccupantMap } from "@/utils/slot-occupancy";

const baseFields = {
  serviceId: z.string().min(1, "O serviço é obrigatório"),
  date: z.date(),
  time: z.string().min(1, "O horário é obrigatório"),
};

const formSchema = z.discriminatedUnion("customerMode", [
  z.object({
    customerMode: z.literal("existing"),
    customerId: z.string().min(1, "Selecione um paciente"),
    ...baseFields,
  }),
  z.object({
    customerMode: z.literal("new"),
    name: z.string().min(1, "O nome é obrigatório"),
    email: z.string().email("O e-mail é obrigatório"),
    phone: z.string().min(1, "O telefone é obrigatório"),
    ...baseFields,
  }),
]);

type FormSchema = z.infer<typeof formSchema>;

export async function createPanelAppointment(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }
  const data = schema.data;

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  // organizationId nunca vem do cliente: esta ação roda autenticada dentro do
  // painel, então a organização é sempre resolvida a partir da sessão.
  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, organizationId: organization.id, status: true },
    });
    if (!service) {
      return { error: "Serviço não encontrado para esta clínica" };
    }

    const selectedDate = new Date(data.date);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    const appointmentDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    // Revalida no servidor que o horário ainda está livre — o formulário já impede
    // isso no cliente, mas evita uma corrida entre duas pessoas escolhendo o mesmo slot.
    const sameDayAppointments = await prisma.appointments.findMany({
      where: {
        organizationId: organization.id,
        status: { not: "CANCELLED" },
        AppointmentDate: { gte: appointmentDate, lte: dayEnd },
      },
      select: { time: true, service: { select: { duration: true } } },
    });
    const occupantMap = buildOccupantMap(sameDayAppointments, organization.times);
    const requiredSlots = Math.ceil(service.duration / 30);
    const startIndex = organization.times.indexOf(data.time);
    if (startIndex === -1) {
      return { error: "Horário inválido para esta clínica" };
    }
    for (let i = 0; i < requiredSlots; i++) {
      const slot = organization.times[startIndex + i];
      if (!slot || occupantMap.has(slot)) {
        return { error: "Esse horário acabou de ser preenchido, escolha outro." };
      }
    }

    let customerId: string;
    if (data.customerMode === "existing") {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, organizationId: organization.id },
      });
      if (!customer) {
        return { error: "Paciente não encontrado nesta clínica" };
      }
      customerId = customer.id;
    } else {
      const customer = await prisma.customer.upsert({
        where: {
          organizationId_email: { organizationId: organization.id, email: data.email },
        },
        create: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          organizationId: organization.id,
        },
        update: {
          name: data.name,
          phone: data.phone,
        },
      });
      customerId = customer.id;
    }

    const newAppointment = await prisma.appointments.create({
      data: {
        time: data.time,
        AppointmentDate: appointmentDate,
        service: { connect: { id: data.serviceId } },
        organization: { connect: { id: organization.id } },
        customer: { connect: { id: customerId } },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/patients");
    return { data: newAppointment };
  } catch (error) {
    return { error: "Erro ao criar agendamento" };
  }
}
