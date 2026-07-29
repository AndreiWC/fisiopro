import getSession from "@/lib/getSession";
import { redirect } from "next/navigation";
import { GridPlans } from "./_components/grid-plans";
import { getSubscription } from "@/utils/get-subscription";
import { SubscriptionDetail } from "./_components/subscription-detail";
export default async function Plans() {
  //valida se a sessão esta logada
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const subscription = await getSubscription({ userId: session?.user?.id! });

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
