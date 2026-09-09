import getSession from "@/lib/getSession";
import { redirect } from "next/navigation";
import { getOrganizationData } from "./_data-access/get-info-organization";
import { getProfileOverview } from "./_data-access/get-profile-overview";
import { ProfileContent } from "./_components/profile";
import { requireActiveOrganization } from "@/lib/organization";

export default async function Profile() {
  //valida se a sessão esta logada
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const activeOrganization = await requireActiveOrganization();
  const organization = await getOrganizationData({ organizationId: activeOrganization.id });

  if (!organization) {
    redirect("/");
  }

  const overview = await getProfileOverview(organization.id);

  return (
    <div>
      <ProfileContent organization={organization} overview={overview} />
    </div>
  );
}
