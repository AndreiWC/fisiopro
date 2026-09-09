import { redirect } from "next/navigation";
import { getPermissionOrganizationToReports } from "./data-access/get-permission-reports";
import getSession from "@/lib/getSession";
import { requireActiveOrganization } from "@/lib/organization";

export default async function Reports() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const organization = await requireActiveOrganization();
  const allowed = await getPermissionOrganizationToReports({
    organizationId: organization.id,
  });

  if (!allowed) {
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
