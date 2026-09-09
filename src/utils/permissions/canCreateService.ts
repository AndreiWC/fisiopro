"use server";

import { Organization, Subscription } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getPlan } from "./get-plans";
import { PLANS } from "@/utils/plans/index";
import { checkSubscriptionExpired } from "@/utils/permissions/checkSubscripionExpired";
import { ResultPermissionsProps } from "./canPermissions";

export async function canCreateService(
  subscription: Subscription | null,
  organization: Organization,
): Promise<ResultPermissionsProps> {
  try {
    const serviceCont = await prisma.service.count({
      where: {
        organizationId: organization.id,
      },
    });

    const customerCont = await prisma.customer.count({
      where: {
        organizationId: organization.id,
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
    const checkOrgLimit = await checkSubscriptionExpired(organization);
    return checkOrgLimit;
  } catch (err) {
    return {
      hasPermission: false,
      planId: "EXPIRED",
      expired: false,
      plan: null,
    };
  }
}
