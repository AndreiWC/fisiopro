"use server";
import { auth } from "@/lib/auth";
import { PlanDetailsInfo } from "./get-plans";
import prisma from "@/lib/prisma";
import { canCreateService } from "./canCreateService";

export type PlanType = "BASIC" | "PROFESSIONAL" | "TRIAL" | "EXPIRED";
type TypeCheck = "service";

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
  const session = await auth();
  const userId = session?.user?.id;

  // 1. Se NÃO tiver usuário, retorna falso e encerra aqui.
  if (!userId) {
    return {
      hasPermission: false,
      planId: "EXPIRED",
      expired: true,
      plan: null,
    };
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
    },
  });

  switch (type) {
    case "service":
      const permission = await canCreateService(subscription, session);
      return permission;

    default:
      return {
        hasPermission: false,
        planId: "EXPIRED",
        expired: true,
        plan: null,
      };
  }
}
