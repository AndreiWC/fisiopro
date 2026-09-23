"use server";

import { Plan } from "@prisma/client";
import { PlansProps } from "@/utils/plans/index";

export interface PlanDetailsInfo {
  maxServices: number;
  maxCustomer: number;
  maxClinicalRecords: number | null;
}
const PLANS_LIMITS: PlansProps = {
  BASIC: {
    maxServices: 5,
    maxCustomer: 30,
    maxClinicalRecords: 100,
  },
  PROFESSIONAL: {
    maxServices: 10,
    maxCustomer: 60,
    maxClinicalRecords: null,
  },
};

export async function getPlan(planId: Plan) {
  return PLANS_LIMITS[planId];
}
