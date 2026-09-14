import Link from "next/link";
import { CalendarCheck2, Link2, Search } from "lucide-react";
import { Header } from "../_components/header";
import { Footer } from "../_components/footer";
import { subscriptionPlans } from "@/utils/plans";
import { TRIAL_PERIOD_DAYS } from "@/utils/permissions/trial-limits";

const BENEFITS = [
  {
    icon: CalendarCheck2,
    title: "Sem telefonema pra agendar",
    description: "Seus clientes veem os horários livres e marcam sozinhos, a qualquer hora.",
  },
  {
    icon: Link2,
    title: "Um link pra compartilhar",
    description: "Seus serviços, preços e horários em uma página pronta pra colar no Instagram.",
  },
  {
    icon: Search,
    title: "Apareça na busca",
    description: "Quem procura fisioterapia, barbearia ou clínica de estética encontra sua agenda.",
  },
] as const;

export default function ProfissionaisPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-24">
        <section className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-muted-foreground">
            Para barbearias, salões e clínicas
          </p>
          <h1 className="font-display mt-2 max-w-xl text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            Sua agenda cheia, sem responder mensagem.
          </h1>
          <p className="mt-4 max-w-lg text-base text-muted-foreground">
            Seus clientes veem os horários livres e marcam sozinhos. A confirmação acontece
            direto pelo WhatsApp, sem ida e volta de mensagem.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Criar agenda grátis
            </Link>
            <span className="text-sm text-muted-foreground">
              Grátis por {TRIAL_PERIOD_DAYS} dias · sem cartão de crédito
            </span>
          </div>
        </section>

        <section className="container mx-auto grid grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:px-8">
          {BENEFITS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </section>

        <section className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            Preço simples
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sem comissão por agendamento. Cancele quando quiser.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-xl">
            {subscriptionPlans.map((plan, index) => (
              <div
                key={plan.id}
                className={
                  index === 1
                    ? "rounded-2xl border-2 border-primary bg-primary/5 p-5"
                    : "rounded-2xl border border-border bg-card p-5"
                }
              >
                <p className="font-semibold text-foreground">{plan.name}</p>
                <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-foreground">
                  R$ {plan.price.toFixed(2).replace(".", ",")}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </p>
                <Link
                  href="/login"
                  className={
                    index === 1
                      ? "mt-4 flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      : "mt-4 flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  }
                >
                  Começar
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
