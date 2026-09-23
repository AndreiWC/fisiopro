"use server";
import prisma from "@/lib/prisma";
import { canCreateService } from "./canCreateService";
import { canCreateClinicalRecord } from "./canCreateClinicalRecord";
import { PlanDetailsInfo } from "./get-plans";
import { requireActiveOrganization } from "@/lib/organization";

export type PlanType = "BASIC" | "PROFESSIONAL" | "TRIAL" | "EXPIRED";
type TypeCheck = "service" | "clinicalRecord";

export interface ResultPermissionsProps {
  hasPermission: boolean;
  planId: PlanType;
  expired: boolean;
  plan: PlanDetailsInfo | null;
}

interface CanPermissionsProps {
  type: TypeCheck;
}

export async function canPermissions({
  type,
}: CanPermissionsProps): Promise<ResultPermissionsProps> {
  const organization = await requireActiveOrganization();

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: organization.id },
  });

  switch (type) {
    case "service":
      const permission = await canCreateService(subscription, organization);
      return permission;

    case "clinicalRecord":
      const clinicalRecordPermission = await canCreateClinicalRecord(
        subscription,
        organization,
      );
      return clinicalRecordPermission;

    default:
      return {
        hasPermission: false,
        planId: "EXPIRED",
        expired: true,
        plan: null,
      };
  }
}
