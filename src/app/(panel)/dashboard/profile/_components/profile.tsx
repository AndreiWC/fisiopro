"use client";
import { ProfileFormData, useProfileForm } from "./profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import imgTest from "../../../../../../public/phaceholder 3.png";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { set } from "zod";
import { cn } from "@/lib/utils";
import { Prisma } from "@/generated/prisma/client";
import { updateProfileAction } from "../_actions/update-profile";
import { toast } from "sonner";
import { formatPhone } from "@/utils/formatPhone";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type UserWithSubscription = Prisma.UserGetPayload<{
  include: {
    subscription: true;
  };
}>;

/**
 *
 */
interface ProfileContentProps {
  user: UserWithSubscription;
}
// função de gerar os horários de 30 em 30 minutos das 8h às 23:30h
export function ProfileContent({ user }: ProfileContentProps) {
  console.log("userprofile", user);

  function generateTimeSlote(): string[] {
    const timeSlots: string[] = [];
    for (let hour = 8; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        timeSlots.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return timeSlots;
  }
  //controla abertura do dialog
  const [DialogOpen, setDialogOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string[]>(user.times ?? []);
  const { update } = useSession();
  const router = useRouter();
  //função de selecionar e desselecionar os horários
  function toggleTimeSelection(time: string) {
    setSelectedTime((prevSelectedTime) =>
      prevSelectedTime.includes(time)
        ? prevSelectedTime.filter((t) => t !== time)
        : [...prevSelectedTime, time].sort()
    );
  }
  const timeZones = Intl.supportedValuesOf("timeZone").filter(
    (zone) =>
      zone.startsWith("America/Sao_Paulo") ||
      zone.startsWith("America/Fortaleza") ||
      zone.startsWith("America/Recife") ||
      zone.startsWith("America/Bahia") ||
      zone.startsWith("America/Belem") ||
      zone.startsWith("America/Cuiaba") ||
      zone.startsWith("America/Porto_Velho") ||
      zone.startsWith("America/Manaus")
  );

  const form = useProfileForm({
    name: user.name,
    address: user.address,
    phone: user.phone,
    status: user.status,
    timeZone: user.timezone,
  });

  async function onSubmit(value: ProfileFormData) {
    const response = await updateProfileAction({
      name: value.name,
      address: value.address,
      phone: value.phone,
      status: value.status === "active" ? true : false,
      timeZone: value.timeZone,
      times: selectedTime || [],
    });

    if (response.error) {
      toast.error(response.error);
      return;
    }

    toast.success("Perfil atualizado com sucesso!");
  }

  async function handleSignOut() {
    await signOut();
    await update();
    router.replace("/");
  }

  return (
    <div className="mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Meu perfil</CardTitle>
            </CardHeader>

            <CardContent className="space-6">
              <div className="flex justify-center">
                <div className="bg-gray-200 relative h-40 w-40 rounded-full overflow-hidden">
                  <Image
                    src={user.image ? user.image : imgTest} //troca de imagem pelo user.image
                    alt="Foto clínica"
                    fill
                    className="object-cover"
                  ></Image>
                </div>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">
                        Nome completo
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Digite o nome da clínica."
                        ></Input>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                ></FormField>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">
                        Endereço completo
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Digite o endereço da clínica."
                        ></Input>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                ></FormField>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Telefone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Digite o telefone da clínica."
                          onChange={(e) => {
                            const formatvalue = formatPhone(e.target.value);
                            field.onChange(formatvalue);
                          }}
                        ></Input>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                ></FormField>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="font-semibold">
                        Status da clínica
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value ? "active" : "inactive"}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o status da clínica." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="inactive">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                ></FormField>

                <div className="space-y-2">
                  <Label className="font-semibold">
                    Agendamento de horários da clínica
                  </Label>

                  <Dialog open={DialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        Clique aqui para adicionar horário
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </DialogTrigger>

                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Horário da clínica</DialogTitle>
                        <DialogDescription>
                          <p>
                            Selecione o horário de funcionamento da clínica.
                          </p>
                        </DialogDescription>
                      </DialogHeader>
                      <section className="mt-4 space-y-4 max-h-80 overflow-y-auto">
                        <div className="grid grid-cols-5 gap-2">
                          {generateTimeSlote().map((time) => (
                            <Button
                              key={time}
                              variant="outline"
                              className={cn(
                                "h-10",
                                selectedTime.includes(time) &&
                                  "border-2 border-blue-500 text-primary"
                              )}
                              onClick={() => toggleTimeSelection(time)}
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                      </section>
                      <Button
                        className="w-full mt-4"
                        onClick={() => setDialogOpen(false)}
                      >
                        Salvar horários
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>

                <FormField
                  control={form.control}
                  name="timeZone"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="font-semibold">
                        Selecione o fuso horário da clínica
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o seu fuso horário." />
                          </SelectTrigger>
                          <SelectContent>
                            {timeZones.map((zone) => (
                              <SelectItem key={zone} value={zone}>
                                {zone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                ></FormField>

                <Button className="w-full bg-blue-500 hover:bg-blue-400">
                  Salvar alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
      <section className="mt-4">
        <Button variant="destructive" onClick={handleSignOut}>
          Sair da conta
        </Button>
      </section>
    </div>
  );
}
