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
    <Suspense fallback={<p>Carregando serviços...</p>}>
      <ServicesContent userId={session.user.id} />
    </Suspense>
  );
}
