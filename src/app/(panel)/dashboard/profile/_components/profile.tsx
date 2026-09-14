"use client";
import type { ComponentType } from "react";
import { ProfileFormData, useProfileForm } from "./profile-form";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  CreditCard,
  LogOut,
  MapPin,
  User,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { updateProfileAction } from "../_actions/update-profile";
import { toast } from "sonner";
import { formatPhone } from "@/utils/formatPhone";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AvatarProfile } from "./profile-avatar";
import { SEGMENT_OPTIONS, segmentLabel } from "@/utils/segments";
import { subscriptionPlans } from "@/utils/plans/index";
import { ProfileOverview } from "./profile-overview";
import type { ProfileOverview as ProfileOverviewData } from "../_data-access/get-profile-overview";

type OrganizationWithSubscription = Prisma.OrganizationGetPayload<{
  include: {
    subscription: true;
  };
}>;

interface ProfileContentProps {
  organization: OrganizationWithSubscription;
  overview: ProfileOverviewData;
}

const SUBSCRIPTION_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: "Ativa", className: "bg-primary/10 text-primary" },
  trialing: { label: "Período de teste", className: "bg-accent text-accent-foreground" },
  past_due: { label: "Pagamento pendente", className: "bg-destructive/10 text-destructive" },
  canceled: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
  unpaid: { label: "Não paga", className: "bg-destructive/10 text-destructive" },
  incomplete: { label: "Incompleta", className: "bg-muted text-muted-foreground" },
  incomplete_expired: { label: "Expirada", className: "bg-muted text-muted-foreground" },
};

// função de gerar os horários de 30 em 30 minutos das 8h às 23:30h
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

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

type ActiveSheet = "dados" | "horarios" | null;

export function ProfileContent({ organization, overview }: ProfileContentProps) {
  //controla abertura do dialog de horários (dentro do painel "Horários de atendimento")
  const [DialogOpen, setDialogOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string[]>(organization.times ?? []);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
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
    name: organization.name,
    address: organization.address,
    phone: organization.phone,
    status: organization.status,
    segment: organization.segment,
    professionalRegistration: organization.professionalRegistration,
    timeZone: organization.timezone,
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
    setActiveSheet(null);
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  const planInfo = organization.subscription
    ? subscriptionPlans.find((p) => p.id === organization.subscription!.plan)
    : null;
  const statusMeta = organization.subscription
    ? (SUBSCRIPTION_STATUS_LABELS[organization.subscription.status] ?? {
        label: organization.subscription.status,
        className: "bg-muted text-muted-foreground",
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Cabeçalho — cartão de identidade da clínica */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 -right-8 h-32 w-32 opacity-[0.06]"
        >
          <rect x="2" y="6" width="20" height="20" rx="7" className="fill-primary" />
          <rect x="17" y="11" width="13" height="13" rx="4" className="fill-accent-warm" />
        </svg>

        <div className="relative flex items-center gap-4">
          <AvatarProfile avatarUrl={organization.image} organizationId={organization.id} sizeClassName="h-20 w-20 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display truncate text-xl font-semibold text-foreground">
              {organization.name || "Complete seu perfil"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {segmentLabel(organization.segment) && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {segmentLabel(organization.segment)}
                </span>
              )}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  organization.status
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {organization.status ? "Aberta" : "Fechada"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <ProfileOverview {...overview} />

      <Form {...form}>
        {/* Menu de configurações */}
        <nav className="overflow-hidden rounded-2xl border border-border bg-card">
          <MenuRow
            icon={User}
            label="Dados do profissional"
            onClick={() => setActiveSheet("dados")}
          />
          <MenuRow
            icon={Clock}
            label="Horários de atendimento"
            onClick={() => setActiveSheet("horarios")}
          />
          <MenuRow
            icon={CreditCard}
            label="Assinatura"
            trailing={planInfo ? `Plano ${planInfo.name}` : undefined}
            href="/dashboard/plans"
          />
        </nav>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>

        {/* Painel: Dados do profissional */}
        <Sheet open={activeSheet === "dados"} onOpenChange={(open) => !open && setActiveSheet(null)}>
          <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
            <SheetHeader className="border-b border-border p-5">
              <SheetTitle>Dados do profissional</SheetTitle>
              <SheetDescription>
                Essas informações aparecem na sua página pública de agendamento.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Nome completo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Digite o nome do seu negócio." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="segment"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="font-semibold">Segmento do negócio</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              />

              <FormField
                control={form.control}
                name="professionalRegistration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Registro profissional</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: CREFITO 3/12345-F" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 font-semibold">
                      <MapPin className="h-3.5 w-3.5" />
                      Endereço completo
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Digite o endereço do seu negócio." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="border-t border-border p-5">
              <Button type="button" className="w-full" onClick={form.handleSubmit(onSubmit)}>
                Salvar alterações
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Painel: Horários de atendimento */}
        <Sheet
          open={activeSheet === "horarios"}
          onOpenChange={(open) => !open && setActiveSheet(null)}
        >
          <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
            <SheetHeader className="border-b border-border p-5">
              <SheetTitle>Horários de atendimento</SheetTitle>
              <SheetDescription>
                Defina quando seu negócio está aberto para agendamentos.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="font-semibold">Status do negócio</FormLabel>
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
              />

              <div className="space-y-2">
                <Label className="font-semibold">Horários de atendimento</Label>

                <Dialog open={DialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {selectedTime.length > 0
                          ? `${selectedTime.length} horários selecionados`
                          : "Clique aqui para adicionar horário"}
                      </span>
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Horário de atendimento</DialogTitle>
                      <DialogDescription>
                        <Label className="font-semibold">
                          Selecione o horário de funcionamento do seu negócio.
                        </Label>
                      </DialogDescription>
                    </DialogHeader>
                    <section className="mt-4 max-h-80 space-y-4 overflow-y-auto">
                      <div className="grid grid-cols-5 gap-2">
                        {generateTimeSlote().map((time) => (
                          <Button
                            key={time}
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-10 font-mono tabular-nums",
                              selectedTime.includes(time) && "border-2 border-primary text-primary",
                            )}
                            onClick={() => toggleTimeSelection(time)}
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    </section>
                    <Button type="button" className="mt-4 w-full" onClick={() => setDialogOpen(false)}>
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
                    <FormLabel className="font-semibold">Fuso horário</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              />
            </div>

            <SheetFooter className="border-t border-border p-5">
              <Button type="button" className="w-full" onClick={form.handleSubmit(onSubmit)}>
                Salvar alterações
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Form>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  trailing,
  onClick,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  trailing?: string;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-left text-sm font-medium text-foreground">{label}</span>
      {trailing && <span className="text-sm text-muted-foreground">{trailing}</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  );
  const className =
    "flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-secondary/60";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
