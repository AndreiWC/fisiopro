import getSession from "@/lib/getSession";
import { redirect } from "next/navigation";
import { ServicesContent } from "./_components/services-content";
import { Suspense } from "react";
export default async function Services() {
  //valida se a sessão esta logada
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  return (
    <main>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Serviços
        </h1>
        <p className="text-sm text-muted-foreground">
          O que sua clínica oferece — preço e duração de cada sessão.
        </p>
      </div>

      <div className="mt-4">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando serviços...</p>}>
          <ServicesContent userId={session.user.id} />
        </Suspense>
      </div>
    </main>
  );
}
