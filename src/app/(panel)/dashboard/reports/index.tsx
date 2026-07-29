import { redirect } from "next/navigation";
import { getPermissionUserToReports } from "./data-access/get-permission-reports";
import getSession from "@/lib/getSession";

export default async function Reports() {

  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const user = await getPermissionUserToReports({
    userId: session.user.id,
  });

  if (!user) {
   return (
    <main>
      <h1>Sem permissão de acesso ao Relatórios</h1>
    </main>
  );
  }

  return (
    <main>
      <h1>Relatórios</h1>
    </main>
  );
}
