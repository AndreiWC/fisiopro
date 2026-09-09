"use server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  email: z.string().email("O e-mail é obrigatório"),
  phone: z.string().min(1, "O telefone é obrigatório"),
  date: z.date(),
  serviceId: z.string().min(1, "O serviço é obrigatório"),
  time: z.string().min(1, "O horário é obrigatório"),
  organizationId: z.string().min(1, "A clínica é obrigatória"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function createNewAppointment(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);

  if (!schema.success) {
    return {
      error: schema.error.issues[0].message,
    };
  }

  try {
    const selectedDate = new Date(formData.date);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth(); // Os meses são indexados a partir de 0
    const day = selectedDate.getDate();

    const appointmentDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0)); // Cria a data no formato UTC

    const customer = await prisma.customer.upsert({
      where: {
        organizationId_email: { organizationId: formData.organizationId, email: formData.email },
      },
      create: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        organizationId: formData.organizationId,
      },
      update: {
        name: formData.name,
        phone: formData.phone,
      },
    });

    const newAppointment = await prisma.appointments.create({
      data: {
        time: formData.time,
        AppointmentDate: appointmentDate,
        service: {
          connect: { id: formData.serviceId },
        },
        organization: {
          connect: { id: formData.organizationId },
        },
        customer: {
          connect: { id: customer.id },
        },
      },
    });
    return { data: newAppointment };
  } catch (err) {
    return {
      error: "Erro ao criar agendamento: " + (err as any).message,
    };
  }
}
