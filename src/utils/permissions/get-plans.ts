"use server";

import { Plan } from "@/generated/prisma/browser";
import { PlansProps } from "@/utils/plans/index";

export interface PlanDetailsInfo {
  maxServices: number;
}
const PLANS_LIMITS: PlansProps = {
  BASIC: {
    maxServices: 5,
    maxCustomer: 30,
  },
  PROFESSIONAL: {
    maxServices: 10,
    maxCustomer: 60,
  },
};

export async function getPlan(planId: Plan) {
  return PLANS_LIMITS[planId];
}
