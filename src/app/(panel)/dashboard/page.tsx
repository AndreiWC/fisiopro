import { Button } from "@/components/ui/button";
import getSession from "@/lib/getSession";
import { Calendar, PartyPopper } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonCopyLink } from "./_components/button-copy-link";
import { Reminders } from "./_components/reminder/reminders";
import { Appointments } from "./_components/appointments/appointments";
import { checkSubscription } from "@/utils/permissions/checkSubscripion";
import { LabelSubscription } from "@/components/ui/label-subscription";
export default async function Dashboard() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const subscription = await checkSubscription(session?.user?.id!);

  return (
    <main>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Hoje
          </h1>
          <p className="text-sm text-muted-foreground">
            Sua agenda e seus lembretes, em um só lugar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/clinica/${session.user.id}`} target="_blank">
            <Button className="flex-1 md:flex-[0]">
              <Calendar className="w-5 h-5" />
              <span>Novo agendamento</span>
            </Button>
          </Link>

          <ButtonCopyLink userId={session.user.id!} />
        </div>
      </div>

      {subscription?.subscriptionStatus === "EXPIRED" && (
        <LabelSubscription expired={true} />
      )}

      {subscription?.subscriptionStatus === "TRIAL" && (
        <div className="my-4 flex flex-col items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm md:flex-row md:items-center md:text-base">
          <PartyPopper className="h-5 w-5 shrink-0 text-primary" />
          <p className="font-medium text-foreground">
            {subscription?.message || "Seu período de teste está ativo!"}
          </p>
        </div>
      )}

      {subscription?.subscriptionStatus !== "EXPIRED" && (
        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Appointments userId={session.user.id!} />
          <Reminders userId={session.user.id!} />
        </section>
      )}
    </main>
  );
}
