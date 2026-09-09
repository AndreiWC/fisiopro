"use server";

import { Organization } from "@prisma/client";
import { addDays, isAfter } from "date-fns";
import { ResultPermissionsProps } from "./canPermissions";
import { TRIAL_PERIOD_DAYS } from "./trial-limits";

export async function checkSubscriptionExpired(
  organization: Organization,
): Promise<ResultPermissionsProps> {
  const trailEndDate = addDays(organization.createdAt, TRIAL_PERIOD_DAYS);

  if (isAfter(new Date(), trailEndDate)) {
    return {
      hasPermission: false,
      planId: "EXPIRED",
      expired: true,
      plan: null,
    };
  }

  return {
    hasPermission: true,
    planId: "TRIAL",
    expired: false,
    plan: null,
  };
}
