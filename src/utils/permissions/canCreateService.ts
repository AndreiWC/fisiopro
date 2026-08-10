"use server";

import { Subscription } from "@prisma/client";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { getPlan } from "./get-plans";
import { PLANS } from "@/utils/plans/index";
import { checkSubscriptionExpired } from "@/utils/permissions/checkSubscripionExpired";
import { ResultPermissionsProps } from "./canPermissions";

export async function canCreateService(
  subscription: Subscription | null,
  session: Session,
): Promise<ResultPermissionsProps> {
  try {
    const serviceCont = await prisma.service.count({
      where: {
        userId: session?.user?.id,
      },
    });

    const customerCont = await prisma.customer.count({
      where: {
        userId: session?.user?.id,
      },
    });

    if (subscription && subscription.status === "active") {
      const plan = subscription.plan;
      const planLimits = await getPlan(plan);

      return {
        hasPermission:
          planLimits.maxServices === null ||
          (serviceCont <= planLimits.maxServices &&
            customerCont <= planLimits.maxCustomer),
        planId: plan,
        expired: false,
        plan: PLANS[subscription.plan],
      };
    }
    //plano TRIAL
    const checkUserLimit = await checkSubscriptionExpired(session);
    return checkUserLimit;
  } catch (err) {
    return {
      hasPermission: false,
      planId: "EXPIRED",
      expired: false,
      plan: null,
    };
  }
}
