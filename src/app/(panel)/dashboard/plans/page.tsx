import getSession from "@/lib/getSession";
import { redirect } from "next/navigation";
import { GridPlans } from "./_components/grid-plans";
import { getSubscription } from "@/utils/get-subscription";
import { SubscriptionDetail } from "./_components/subscription-detail";
import { requireActiveOrganization } from "@/lib/organization";

export default async function Plans() {
  //valida se a sessão esta logada
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const organization = await requireActiveOrganization();
  const subscription = await getSubscription({ organizationId: organization.id });

  return (
    <div>
      {subscription?.status === "active" ? (
        <SubscriptionDetail subscription={subscription!} />
      ) : (
        <GridPlans />
      )}
    </div>
  );
}
