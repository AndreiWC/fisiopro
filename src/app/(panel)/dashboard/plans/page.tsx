import getSession from "@/lib/getSession";
import { redirect } from "next/navigation";

export default async function Plans() {
  //valida se a sessão esta logada
  const session = await getSession();
  if (!session) {
    redirect("/");
  }
  return <div>pagina planos</div>;
}
