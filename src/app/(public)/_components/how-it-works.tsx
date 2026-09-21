import { CalendarCheck2, ClipboardList, UserCheck } from "lucide-react";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Escolha o serviço",
    description: "Veja os serviços e preços de cada profissional antes de decidir.",
  },
  {
    icon: CalendarCheck2,
    title: "Escolha o dia e horário",
    description: "Os horários mostrados já são os que estão livres na agenda do profissional.",
  },
  {
    icon: UserCheck,
    title: "Confirme seus dados",
    description: "Só o necessário para o profissional te reconhecer — sem senha, sem cadastro.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="bg-sand">
      <div className="container mx-auto px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-display text-xl font-semibold tracking-tight text-sand-foreground sm:text-2xl">
          Como funciona
        </h2>

        <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className="flex gap-4 sm:flex-col sm:gap-3">
              <div className="flex flex-col items-center sm:flex-row sm:justify-between">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-sand-foreground">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                {index < STEPS.length - 1 && (
                  <span className="mt-2 hidden h-px flex-1 bg-sand-foreground/15 sm:mt-0 sm:ml-4 sm:block" />
                )}
              </div>
              <div>
                <p className="font-medium text-sand-foreground">{title}</p>
                <p className="mt-1 text-sm text-sand-foreground/70">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
