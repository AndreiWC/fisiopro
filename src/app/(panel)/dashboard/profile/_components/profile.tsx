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
import { Prisma } from "@prisma/client";
import { updateProfileAction } from "../_actions/update-profile";
import { toast } from "sonner";
import { formatPhone } from "@/utils/formatPhone";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AvatarProfile } from "./profile-avatar";
import { SEGMENT_OPTIONS } from "@/utils/segments";
import { ProfileOverview } from "./profile-overview";
import type { ProfileOverview as ProfileOverviewData } from "../_data-access/get-profile-overview";

type UserWithSubscription = Prisma.UserGetPayload<{
  include: {
    subscription: true;
  };
}>;

interface ProfileContentProps {
  user: UserWithSubscription;
  overview: ProfileOverviewData;
}
// função de gerar os horários de 30 em 30 minutos das 8h às 23:30h
export function ProfileContent({ user, overview }: ProfileContentProps) {
 

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
        : [...prevSelectedTime, time].sort(),
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
      zone.startsWith("America/Manaus"),
  );

  const form = useProfileForm({
    name: user.name,
    address: user.address,
    phone: user.phone,
    status: user.status,
    segment: user.segment,
    professionalRegistration: user.professionalRegistration,
    timeZone: user.timezone,
  });

  async function onSubmit(value: ProfileFormData) {
    const response = await updateProfileAction({
      name: value.name,
      address: value.address,
      phone: value.phone,
      status: value.status === "active" ? true : false,
      segment: value.segment,
      professionalRegistration: value.professionalRegistration,
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
      <ProfileOverview {...overview} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Meu perfil</CardTitle>
            </CardHeader>

            <CardContent className="space-6">
              <div className="flex justify-center">
                <div className="bg-muted relative h-40 w-40 rounded-full overflow-hidden">
                  <AvatarProfile avatarUrl={user.image} userId={user.id} />
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
                          placeholder="Digite o nome do seu negócio."
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
                          placeholder="Digite o endereço do seu negócio."
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
                          placeholder="Digite o telefone do seu negócio."
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
                  name="segment"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="font-semibold">
                        Segmento do negócio
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o segmento do seu negócio." />
                          </SelectTrigger>
                          <SelectContent>
                            {SEGMENT_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                ></FormField>

                <FormField
                  control={form.control}
                  name="professionalRegistration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">
                        Registro profissional
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: CREFITO 3/12345-F"
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
                        Status do negócio
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value ? "active" : "inactive"}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o status do negócio." />
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
                    Horários de atendimento
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
                        <DialogTitle>Horário de atendimento</DialogTitle>
                        <DialogDescription>
                          <Label className="font-semibold">
                            Selecione o horário de funcionamento do seu
                            negócio.
                          </Label>
                        </DialogDescription>
                      </DialogHeader>
                      <section className="mt-4 space-y-4 max-h-80 overflow-y-auto">
                        <div className="grid grid-cols-5 gap-2">
                          {generateTimeSlote().map((time) => (
                            <Button
                              key={time}
                              variant="outline"
                              className={cn(
                                "h-10 font-mono tabular-nums",
                                selectedTime.includes(time) &&
                                  "border-2 border-primary text-primary",
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
                        Selecione o fuso horário do seu negócio
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

                <Button className="w-full">Salvar alterações</Button>
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
