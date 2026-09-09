# Tenant Scoping Fase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate every remaining file that still treats `User` (the login identity) as the tenant/clinic — using `session.user.id` or a `userId` foreign key as if it scoped a clinic's data — to the `Organization`/`Membership` model introduced in Fase 1, so the dashboard, public booking pages, billing, and permissions all work again against the current schema.

**Architecture:** No new architecture. Fase 1 already introduced `Organization` (the tenant), `Membership` (User↔Organization, role OWNER|STAFF), and the helper `src/lib/organization.ts` (`getActiveOrganization()` / `requireActiveOrganization()`). This plan is a mechanical propagation of that pattern: every place that currently resolves "the clinic" from `session.user.id` must instead resolve it from the caller's `Organization` via that helper, and every Prisma query/foreign key named `userId` on `Service`, `Customer`, `Appointments`, `Subscription`, or `Reminder` must become `organizationId`. Fields that used to live on `User` (`address`, `phone`, `status`, `segment`, `professionalRegistration`, `timezone`, `times`, `stripe_customer_id`, `image` — the clinic's public photo) now live on `Organization` with the **same field names**, so most UI components need only a type change, not a logic change.

**Tech Stack:** Next.js 15 App Router, Prisma 6 / PostgreSQL, NextAuth v5, Zod, react-hook-form, Stripe Node SDK, `@tanstack/react-query`.

**Spec:** `docs/superpowers/specs/2026-09-08-identity-unification-design.md` — this plan implements the "Fora de escopo desta Fase 1" section of that spec: the dashboard/API/public-booking rename it explicitly deferred.

## Global Constraints

- **No test runner exists in this project** (`npm test` → `Missing script: "test"`). Every task's verification step is `npx tsc --noEmit` (confirm no *new* errors outside the task's own files — pre-existing Fase-2-scope errors in files not yet migrated are expected until their task lands) plus a manual smoke check against the running dev server (`npm run dev`, already running on `localhost:3000` unless noted otherwise) or a direct Prisma query via `npx prisma studio` / a one-off `node` script.
- **Tenant resolution pattern — follow exactly, do not invent a variant:**
  - **Server Actions** (functions in `_actions/` called directly from client components): resolve the tenant with `getActiveOrganization()` from `@/lib/organization` (nullable) and return `{ error: "Nenhuma organização vinculada à sua conta" }` if it's `null` — mirrors the existing `if (!session?.user?.id) return { error: "Usuário não autenticado" }` style already in every one of these files. Use `organization.id` for the Prisma call.
  - **Server Components under `src/app/(panel)/dashboard/**`** (pages): may call `requireActiveOrganization()` (throws) directly, with **no** extra null-check, because `src/app/(panel)/dashboard/layout.tsx` already calls `getActiveOrganization()` and redirects to `/perfil` before any nested page renders — a throw here is unreachable in practice, not a real error path to design for.
  - **Data-access functions** (`_data-access/`, `data-access/`): keep the existing "pure query function" shape, just rename the parameter from `userId` to `organizationId` (or from `{ userId }` destructured to `{ organizationId }`). They do not call `auth()`/`getActiveOrganization()` themselves — the caller (page or action) resolves the tenant and passes the id down, exactly like today.
  - **API routes** (`src/app/api/**`): use `getActiveOrganization()` (nullable) and return a 400/401 JSON error if `null` — mirrors the existing defensive style in both routes touched by this plan.
- **Field relocation table** (all of these moved from `User` to `Organization` in Fase 1's schema, same field names): `address`, `phone`, `status`, `segment`, `professionalRegistration`, `timezone`, `times`, `stripe_customer_id`, `image` (the clinic's public photo — distinct from `User.image`, which is the person's own login avatar), plus the relations `subscription`, `services`, `reminders`, `customers`, `appointments`.
- **Foreign-key rename table**: `Service.userId` → `Service.organizationId`; `Reminder.userId` → `Reminder.organizationId`; `Subscription.userId` → `Subscription.organizationId`; `Appointments.userId` → `Appointments.organizationId`; `Customer.userId` (tenant meaning) → `Customer.organizationId` — **do not** confuse this with the *other*, still-valid `Customer.userId` field (optional, links a customer to their own login/patient account — leave every correct use of that alone, it is unrelated).
- **`Appointments` no longer has `name`/`email`/`phone`/`user` fields** — those live on `Appointments.customer` (a required relation). Any code reading `appointment.name` must become `appointment.customer.name` (and the `include`/`select` that loads it must add `customer: true`).
- **Compound unique key rename**: `Customer`'s compound unique on `(organizationId, email)` is named `organizationId_email` in the generated Prisma Client (Prisma auto-names compound `@@unique` fields by concatenating the listed field names) — replaces the old `userId_email`.
- All user-facing copy stays in Portuguese (pt-BR), matching every string already in these files.
- Do not touch files outside each task's list. Several dashboard files were already rewritten by an unrelated, in-progress UI refactor (`sidebar.tsx`, `profile.tsx`, `services-list.tsx`, `services/page.tsx`) — this plan's tasks only ever touch the *data* layer beneath that UI (actions/data-access/API routes) and the couple of prop names the UI passes through; never restyle a component while fixing its data source.

---

### Task 1: Permissions & Subscription-Expiry Core

**Files:**
- Modify: `src/utils/permissions/checkSubscripion.ts` (all 45 lines)
- Modify: `src/utils/permissions/checkSubscripionExpired.ts` (all 29 lines)
- Modify: `src/utils/permissions/canPermissions.ts` (all 57 lines)
- Modify: `src/utils/permissions/canCreateService.ts` (all 54 lines)

**Interfaces:**
- Consumes: `requireActiveOrganization()`, `getActiveOrganization()` from `@/lib/organization` (both already exist, unchanged).
- Produces: `checkSubscription(): Promise<{ subscriptionStatus, message, planId }>` (dropped its `userId` parameter — it now resolves the organization itself, since its only caller, Task 3's `dashboard/page.tsx`, only ever needs the current session's clinic). `canPermissions({ type }): Promise<ResultPermissionsProps>` (signature unchanged). Task 6 (`services-content.tsx`) calls `canPermissions({ type: "service" })` exactly as it does today — no change needed at that call site.

- [ ] **Step 1: Rewrite `checkSubscripion.ts` to resolve the Organization instead of the User**

```ts
"use server";
import prisma from "@/lib/prisma";
import { addDays, differenceInDays, isAfter } from "date-fns";
import { TRIAL_PERIOD_DAYS } from "@/utils/permissions/trial-limits";
import { requireActiveOrganization } from "@/lib/organization";

export async function checkSubscription() {
  const organization = await requireActiveOrganization();

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: organization.id },
  });

  if (subscription && subscription.status === "active") {
    return {
      subscriptionStatus: "active",
      message: "Assinatura ativa. Acesso completo aos recursos.",
      planId: subscription.plan,
    };
  }

  const trialEndDate = addDays(organization.createdAt, TRIAL_PERIOD_DAYS);

  if (isAfter(new Date(), trialEndDate)) {
    return {
      subscriptionStatus: "EXPIRED",
      message:
        "O período de teste expirou. Por favor, atualize para um plano pago.",
      planId: "TRIAL",
    };
  }
  const dayRemaining = differenceInDays(trialEndDate, new Date());
  return {
    subscriptionStatus: "TRIAL",
    message: `Você está no período de teste. Aproveite todos os recursos disponíveis. Faltam ${dayRemaining} dias para o término do período de teste.`,
    planId: "TRIAL",
  };
}
```

Note: `prisma.subscription.findFirst({ where: { userId } })` becomes `prisma.subscription.findUnique({ where: { organizationId } })` — `Subscription.organizationId` is `@unique` in the schema, so `findUnique` is correct and slightly faster than `findFirst`.

- [ ] **Step 2: Rewrite `checkSubscripionExpired.ts` to take the Organization, not the Session**

```ts
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
```

This fixes a live bug, not just a rename: `session.user.createdAt` was never populated by the JWT session (Fase 1's `session`/`jwt` callbacks in `src/lib/auth.ts` only carry `id`/`email`/`name`/`picture`), so every trial-expiry check was silently computing `addDays(undefined, ...)`. `organization.createdAt` is a real, always-present `Date`.

- [ ] **Step 3: Rewrite `canPermissions.ts` to resolve via Organization**

```ts
"use server";
import prisma from "@/lib/prisma";
import { canCreateService } from "./canCreateService";
import { requireActiveOrganization } from "@/lib/organization";

export type PlanType = "BASIC" | "PROFESSIONAL" | "TRIAL" | "EXPIRED";
type TypeCheck = "service";

export interface ResultPermissionsProps {
  hasPermission: boolean;
  planId: PlanType;
  expired: boolean;
  plan: import("./get-plans").PlanDetailsInfo | null;
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

    default:
      return {
        hasPermission: false,
        planId: "EXPIRED",
        expired: true,
        plan: null,
      };
  }
}
```

Keep the original file's `PlanDetailsInfo` import style (`import { PlanDetailsInfo } from "./get-plans";` at the top) rather than the inline `import(...)` shown above if your editor's import organizer prefers that — either compiles identically; match whichever the file already had before this edit for a smaller diff.

- [ ] **Step 4: Rewrite `canCreateService.ts` to take an Organization instead of a Session**

```ts
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
```

This also fixes the pre-existing `customerCont` bug: it was counting `Customer.userId` (the *patient's own login* field, almost always `null` for clinic-added customers) instead of scoping by tenant — so the customer limit was effectively never enforced. Scoping by `organizationId` is the correct fix, not an unrelated change riding along.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: the 4 errors previously reported for these exact files (tsc findings #127-132 from the audit) are gone. Errors in files not yet touched by this plan (dashboard pages, billing actions, public booking, etc.) are expected to remain — do not attempt to fix them here.

- [ ] **Step 6: Commit**

```bash
git add src/utils/permissions/checkSubscripion.ts src/utils/permissions/checkSubscripionExpired.ts src/utils/permissions/canPermissions.ts src/utils/permissions/canCreateService.ts
git commit -m "fix(permissions): scope subscription/service/customer checks by organization"
```

---

### Task 2: Billing / Stripe

**Files:**
- Modify: `src/utils/get-subscription.ts` (all 20 lines)
- Modify: `src/utils/manage-subscription.ts` (all 85 lines)
- Modify: `src/app/(panel)/dashboard/plans/_actions/create-portal-customer.ts` (all 55 lines)
- Modify: `src/app/(panel)/dashboard/plans/_actions/create-subscription.ts` (all 91 lines)
- Modify: `src/app/(panel)/dashboard/plans/page.tsx:13`

**Interfaces:**
- Consumes: `requireActiveOrganization()` from `@/lib/organization` (dashboard-side actions/pages); no helper needed inside `manage-subscription.ts` (it's driven by a Stripe webhook, not a session — it looks the organization up by `stripe_customer_id` instead).
- Produces: `getSubscription({ organizationId }): Promise<Subscription | null>` — parameter renamed from `{ userId }`.

- [ ] **Step 1: Rewrite `get-subscription.ts`**

```ts
"use server";
import prisma from "@/lib/prisma";

export async function getSubscription({ organizationId }: { organizationId: string }) {
  if (!organizationId) {
    return null;
  }
  try {
    const subscriptions = await prisma.subscription.findFirst({
      where: {
        organizationId: organizationId,
      },
    });

    return subscriptions;
  } catch (error) {
    console.error("Erro ao buscar assinaturas:", error);
    return null;
  }
}
```

- [ ] **Step 2: Update `plans/page.tsx:13`'s call site**

```ts
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
```

- [ ] **Step 3: Rewrite `manage-subscription.ts` to key off `Organization`, not `User`**

```ts
import prisma from "@/lib/prisma";
import { stripe } from "@/utils/stripe";
import Stripe from "stripe";
import { Plan } from "@prisma/client";
/**
 * Salvar atualizar ou deletar informações de assinatura da organização no banco de dados.
 */
export async function manageSubscription(
  subscriptionId: string,
  customerId: string,
  createAction = false,
  deleteAction = false,
  type?: Plan,
) {
  const findOrganization = await prisma.organization.findFirst({
    where: {
      stripe_customer_id: customerId,
    },
  });

  if (!findOrganization) {
    return Response.json({ error: "Organização não encontrada." }, { status: 404 });
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const subscriptionData = {
    id: subscription.id,
    status: subscription.status,
    Plan: type ?? "BASIC",
    priceId: subscription.items.data[0].price.id,
    organizationId: findOrganization.id,
  };

  // Se a ação for deletar uma assinatura, remova os dados do banco de dados
  if (subscriptionId && deleteAction) {
    await prisma.subscription.delete({
      where: {
        id: subscriptionId,
      },
    });

    return;
  }

  // Se a ação for criar uma nova assinatura, insira os dados no banco de dados
  if (createAction) {
    try {
      await prisma.subscription.create({
        data: {
          id: subscriptionData.id,
          status: subscriptionData.status,
          plan: subscriptionData.Plan,
          priceId: subscriptionData.priceId,
          organizationId: subscriptionData.organizationId,
        },
      });
    } catch (error) {
      console.error("Erro ao criar assinatura no banco de dados:", error);
      throw new Error("Erro ao criar assinatura no banco de dados.");
    }
  } else {
    try {
      const findSubscription = await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
        },
      });

      if (!findSubscription) return;

      await prisma.subscription.update({
        where: {
          id: subscriptionId,
        },
        data: {
          status: subscriptionData.status,
          priceId: subscriptionData.priceId,
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar assinatura no banco de dados:", error);
    }
  }
}
```

- [ ] **Step 4: Rewrite `create-portal-customer.ts` to read `Organization.stripe_customer_id`**

```ts
"use server";
import { auth } from "@/lib/auth";
import { stripe } from "@/utils/stripe";
import { requireActiveOrganization } from "@/lib/organization";

export async function createPortalCustomer() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      sessionId: "",
      error: "Usuário não autenticado",
    };
  }

  const organization = await requireActiveOrganization();
  const customerId = organization.stripe_customer_id;

  if (!customerId) {
    return {
      sessionId: "",
      error: "Organização não possui um ID de cliente Stripe",
    };
  }

  try {
    const stripeSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.STRIPE_SUCCESS_URL as string,
    });

    return {
      sessionId: stripeSession.url,
    };
  } catch (error) {
    console.error("Erro ao criar sessão do portal de clientes:", error);
    return {
      sessionId: "",
      error: "Erro ao criar sessão do portal de clientes",
    };
  }
}
```

- [ ] **Step 5: Rewrite `create-subscription.ts` to read/write `Organization.stripe_customer_id`**

```ts
"use server";
import { auth } from "@/lib/auth";
import { stripe } from "@/utils/stripe";
import Prisma from "@/lib/prisma";
import { Plan } from "@prisma/client";
import { requireActiveOrganization } from "@/lib/organization";

interface CreateSubscriptionProps {
  type: Plan;
}

export async function createSubscription({ type }: CreateSubscriptionProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      sessionId: "",
      error: "Usuário não autenticado. Faça login para continuar.",
    };
  }

  const organization = await requireActiveOrganization();

  let customerId = organization.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: organization.name ?? undefined,
    });

    customerId = customer.id;

    await Prisma.organization.update({
      where: {
        id: organization.id,
      },
      data: {
        stripe_customer_id: customerId,
      },
    });
  }

  try {
    const stripeCheckoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      billing_address_collection: "required",
      line_items: [
        {
          price:
            type === "BASIC"
              ? process.env.STRIPE_BASIC_PLAN_ID
              : process.env.STRIPE_PREMIUM_PLAN_ID,
          quantity: 1,
        },
      ],
      metadata: {
        type: type,
      },
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${process.env.STRIPE_SUCCESS_URL}`,
      cancel_url: `${process.env.STRIPE_CANCEL_URL}`,
    });

    return {
      sessionId: stripeCheckoutSession.id,
      url: stripeCheckoutSession.url,
    };
  } catch (error) {
    return {
      sessionId: "",
      error: "Falha ao criar a sessão de checkout. Tente novamente." + error,
    };
  }
}
```

`session.user.email` is populated by Fase 1's `jwt`/`session` callbacks, so it's safe to read here for the Stripe customer's billing email even though the *record* being billed is the Organization.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: errors previously reported in these 4 files (audit tsc #11-13, #124-126) are gone.

Manual check: in `npx prisma studio`, confirm the `Organization` table has a `stripe_customer_id` column and the `Subscription` table has an `organizationId` column (both already exist from the Fase 1 migration — this step only changes which column the app code reads/writes, not the schema itself).

- [ ] **Step 7: Commit**

```bash
git add src/utils/get-subscription.ts src/utils/manage-subscription.ts "src/app/(panel)/dashboard/plans/_actions/create-portal-customer.ts" "src/app/(panel)/dashboard/plans/_actions/create-subscription.ts" "src/app/(panel)/dashboard/plans/page.tsx"
git commit -m "fix(billing): key Stripe customer/subscription lookups off Organization"
```

---

### Task 3: Dashboard Home — Appointments & Reminders

**Files:**
- Modify: `src/app/(panel)/dashboard/page.tsx` (all 65 lines)
- Modify: `src/app/(panel)/dashboard/_data-access/get-times-clinic.ts` (all 39 lines)
- Modify: `src/app/(panel)/dashboard/_components/appointments/appointments.tsx` (all 14 lines)
- Modify: `src/app/(panel)/dashboard/_components/button-copy-link.tsx:7-11`
- Modify: `src/app/(panel)/dashboard/_components/appointments/appointments-list.tsx:29-42,169,212`
- Modify: `src/app/(panel)/dashboard/_components/appointments/dialog-appointment.tsx:50-61`
- Modify: `src/app/(panel)/dashboard/_actions/cancel-appointments.ts` (all 49 lines)
- Modify: `src/app/(panel)/dashboard/_actions/update-appointment-status.ts` (all 44 lines)
- Modify: `src/app/(panel)/dashboard/_actions/create-reminder.ts` (all 47 lines)
- Modify: `src/app/(panel)/dashboard/_data-access/get-reminders.ts` (all 20 lines)
- Modify: `src/app/(panel)/dashboard/_components/reminder/reminders.tsx` (all 13 lines)
- Modify: `src/app/(panel)/dashboard/_actions/delete-reminder.ts` (all 35 lines)

**Interfaces:**
- Consumes: `checkSubscription()` (Task 1, no-arg now), `requireActiveOrganization()`/`getActiveOrganization()` from `@/lib/organization`.
- Produces: `getTimesClinic({ organizationId }): Promise<{ times: string[]; organizationId: string }>`; `getReminders({ organizationId }): Promise<Reminder[]>`. `Appointments`/`Reminders`/`ButtonCopyLink` components now take an `organizationId` prop instead of `userId`.

- [ ] **Step 1: Rewrite `dashboard/page.tsx`**

```tsx
import { Button } from "@/components/ui/button";
import getSession from "@/lib/getSession";
import { Calendar, PartyPopper } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonCopyLink } from "./_components/button-copy-link";
import { Reminders } from "./_components/reminder/reminders";
import { Appointments } from "./_components/appointments/appointments";
import { checkSubscription } from "@/utils/permissions/checkSubscripion";
import { LabelSubscription } from "@/components/ui/label-subscription";
import { requireActiveOrganization } from "@/lib/organization";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const organization = await requireActiveOrganization();
  const subscription = await checkSubscription();

  return (
    <main>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Hoje
          </h1>
          <p className="text-sm text-muted-foreground">
            Sua agenda e seus lembretes, em um só lugar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/clinica/${organization.id}`} target="_blank">
            <Button className="flex-1 md:flex-[0]">
              <Calendar className="w-5 h-5" />
              <span>Novo agendamento</span>
            </Button>
          </Link>

          <ButtonCopyLink organizationId={organization.id} />
        </div>
      </div>

      {subscription?.subscriptionStatus === "EXPIRED" && (
        <LabelSubscription expired={true} />
      )}

      {subscription?.subscriptionStatus === "TRIAL" && (
        <div className="my-4 flex flex-col items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm md:flex-row md:items-center md:text-base">
          <PartyPopper className="h-5 w-5 shrink-0 text-primary" />
          <p className="font-medium text-foreground">
            {subscription?.message || "Seu período de teste está ativo!"}
          </p>
        </div>
      )}

      {subscription?.subscriptionStatus !== "EXPIRED" && (
        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Appointments organizationId={organization.id} />
          <Reminders organizationId={organization.id} />
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Rewrite `get-times-clinic.ts`**

```ts
"use server";
import prisma from "@/lib/prisma";

export async function getTimesClinic({ organizationId }: { organizationId: string }) {
  try {
    if (!organizationId) {
      return {
        times: [],
        organizationId: organizationId,
      };
    }

    const organization = await prisma.organization.findFirst({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
        times: true,
      },
    });

    if (!organization) {
      return {
        times: [],
        organizationId: "",
      };
    }

    return { times: organization.times, organizationId: organization.id };
  } catch (err) {
    return {
      times: [],
      organizationId: "",
      error: "Erro ao buscar horários: " + (err as any).message,
    };
  }
}
```

- [ ] **Step 3: Rewrite `appointments.tsx`**

```tsx
import { getTimesClinic } from "../../_data-access/get-times-clinic";
import { AppointmentsList } from "./appointments-list";
import { Suspense } from "react";

export async function Appointments({ organizationId }: { organizationId: string }) {
  const { times: timer, organizationId: id } = await getTimesClinic({ organizationId });

  return (
    <Suspense fallback={<p>Carregando agendamentos...</p>}>
      <AppointmentsList times={timer} organizationId={id} />
    </Suspense>
  );
}
```

- [ ] **Step 4: Rewrite `button-copy-link.tsx:7-11`**

```tsx
export function ButtonCopyLink({ organizationId }: { organizationId: string }) {
  async function handleCopyLink() {
    await navigator.clipboard.writeText(
      `${process.env.NEXT_PUBLIC_BASE_URL}/clinica/${organizationId}`,
    );

    toast("Link copiado para a área de transferência!");
  }
```

(Only the prop name and the two lines inside `handleCopyLink` change — the rest of the file, the `Button`/`LinkIcon` JSX, is untouched.)

- [ ] **Step 5: Update `appointments-list.tsx`**

Change the type alias (around line 29) to load the customer relation and rename the prop:

```tsx
export type AppointmentWithService = Prisma.AppointmentsGetPayload<{
  include: {
    service: true;
    customer: true;
  };
}>;

interface AppointmentsListProps {
  times: string[];
  organizationId: string;
}
```

Change the component signature (line 42) and the two `userId` usages at lines 169 and 212 (the `occupant.name` display, and the `/clinica/${userId}` link):

```tsx
export function AppointmentsList({ times, organizationId }: AppointmentsListProps) {
```

```tsx
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="truncate font-semibold">{occupant.customer.name}</div>
                        <div className="truncate text-sm text-muted-foreground">
                          {occupant.service.name}
                        </div>
                      </div>
```

```tsx
                  <Link
                    key={slot}
                    href={`/clinica/${organizationId}`}
                    target="_blank"
                    className="group flex items-center gap-3 border-t py-3 last:border-b"
                  >
```

Everything else in this file (the `useQuery` call to `/api/clinic/appointments`, the stats, the status `Select`) is unchanged — that API route is fixed in Task 9 and already returns data shaped correctly for this component once its `include` also loads `customer` (Task 9 covers that).

- [ ] **Step 6: Update `dialog-appointment.tsx:50-61`**

```tsx
            <p>
              <span className="font-semibold">Nome:</span>
              {appointment.customer.name}
            </p>

            <p>
              <span className="font-semibold">Telefone:</span>
              {appointment.customer.phone}
            </p>
            <p>
              <span className="font-semibold">E-mail:</span>
              {appointment.customer.email}
            </p>
```

- [ ] **Step 7: Rewrite `cancel-appointments.ts`**

```ts
"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";

const formSchema = z.object({
  appointmentId: z.string().min(1, "O ID do agendamento é obrigatório"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function cancelAppointment(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return {
      error: schema.error.issues[0].message,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: "Usuário não autenticado",
    };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await prisma.appointments.update({
      where: {
        id: formData.appointmentId,
        organizationId: organization.id,
      },
      data: {
        status: "CANCELLED",
      },
    });
    revalidatePath("/dashboard");
    return {
      data: "Agendamento cancelado com sucesso!",
    };
  } catch (error) {
    return {
      error: "Erro ao cancelar agendamento",
    };
  }
}
```

- [ ] **Step 8: Rewrite `update-appointment-status.ts`** (identical pattern)

```ts
"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";
import { getActiveOrganization } from "@/lib/organization";

const formSchema = z.object({
  appointmentId: z.string().min(1, "O ID do agendamento é obrigatório"),
  status: z.nativeEnum(AppointmentStatus),
});

type FormSchema = z.infer<typeof formSchema>;

export async function updateAppointmentStatus(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await prisma.appointments.update({
      where: {
        id: formData.appointmentId,
        organizationId: organization.id,
      },
      data: {
        status: formData.status,
      },
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/patients");
    return { data: "Status atualizado com sucesso!" };
  } catch (error) {
    return { error: "Erro ao atualizar status do agendamento" };
  }
}
```

- [ ] **Step 9: Rewrite `create-reminder.ts`**

```ts
"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";

const formSchema = z.object({
  description: z.string().min(1, "A descrição do lembrete é obrigatória"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function createReminder(formData: FormSchema) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "Usuário não autenticado",
    };
  }

  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return {
      error: "Dados inválidos",
    };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await prisma.reminder.create({
      data: {
        description: formData.description,
        organizationId: organization.id,
      },
    });
    revalidatePath("/dashboard");
    return {
      data: "Lembrete criado com sucesso!",
    };
  } catch (error) {
    return {
      error: "Erro ao criar lembrete",
    };
  }
}
```

- [ ] **Step 10: Rewrite `get-reminders.ts`**

```ts
"use server";

import prisma from "@/lib/prisma";

export async function getReminders({ organizationId }: { organizationId: string }) {
  if (!organizationId) {
    return [];
  }

  try {
    const reminders = await prisma.reminder.findMany({
      where: { organizationId },
    });
    return reminders;
  } catch (err) {
    console.error("Erro ao buscar lembretes:", err);
    return [];
  }
}
```

- [ ] **Step 11: Rewrite `reminders.tsx`**

```tsx
import { getReminders } from "../../_data-access/get-reminders";
import { ReminderList } from "./reminder-list";

export async function Reminders({ organizationId }: { organizationId: string }) {
  const reminders = await getReminders({ organizationId });

  return (
    <div>
      <ReminderList reminder={reminders} />
    </div>
  );
}
```

- [ ] **Step 12: Add tenant scoping to `delete-reminder.ts`**

This action currently has no tenant check at all — any authenticated user could delete any reminder by id. Fix it while renaming:

```ts
"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";

const formSchema = z.object({
  reminderId: z.string().min(1, "O ID do lembrete é obrigatório"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function deleteReminder(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return {
      error: schema.error.issues[0].message,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await prisma.reminder.delete({
      where: {
        id: formData.reminderId,
        organizationId: organization.id,
      },
    });

    revalidatePath("/dashboard");
    return { data: "Lembrete deletado com sucesso" };
  } catch (err) {
    return {
      error: "Erro ao deletar lembrete: " + (err as any).message,
    };
  }
}
```

- [ ] **Step 13: Verify**

Run: `npx tsc --noEmit`
Expected: audit tsc #1-10 gone (all in this task's files). `appointment.service`/`appointment.customer` errors in `get-appointments/route.ts` remain until Task 9.

Manual check: with the dev server running, log in as the clinic account and open `/dashboard` — it should render without the `PrismaClientValidationError` from before, showing "Hoje" with no crash. The appointments list may still be empty/broken-looking until Task 9 fixes the underlying API route — that's expected at this point.

- [ ] **Step 14: Commit**

```bash
git add "src/app/(panel)/dashboard/page.tsx" "src/app/(panel)/dashboard/_data-access/get-times-clinic.ts" "src/app/(panel)/dashboard/_components/appointments/appointments.tsx" "src/app/(panel)/dashboard/_components/button-copy-link.tsx" "src/app/(panel)/dashboard/_components/appointments/appointments-list.tsx" "src/app/(panel)/dashboard/_components/appointments/dialog-appointment.tsx" "src/app/(panel)/dashboard/_actions/cancel-appointments.ts" "src/app/(panel)/dashboard/_actions/update-appointment-status.ts" "src/app/(panel)/dashboard/_actions/create-reminder.ts" "src/app/(panel)/dashboard/_data-access/get-reminders.ts" "src/app/(panel)/dashboard/_components/reminder/reminders.tsx" "src/app/(panel)/dashboard/_actions/delete-reminder.ts"
git commit -m "fix(dashboard): scope appointments and reminders by organization"
```

---

### Task 4: Dashboard Patients (Customers)

**Files:**
- Modify: `src/app/(panel)/dashboard/patients/_data-access/get-patients.ts` (all 60 lines)
- Modify: `src/app/(panel)/dashboard/patients/_actions/update-patient-status.ts` (all 42 lines)
- Modify: `src/app/(panel)/dashboard/patients/page.tsx:12`

**Interfaces:**
- Consumes: `requireActiveOrganization()`, `getActiveOrganization()` from `@/lib/organization`.
- Produces: `getPatients({ organizationId }): Promise<Patient[]>` (the `Patient` type alias exported from this file is unchanged in shape — only the query's `where` clause changes).

- [ ] **Step 1: Rewrite `get-patients.ts:4,9`**

```ts
"use server";
import prisma from "@/lib/prisma";

export async function getPatients({ organizationId }: { organizationId: string }) {
  try {
    if (!organizationId) return [];

    const customers = await prisma.customer.findMany({
      where: { organizationId },
      include: {
        appointments: {
          include: { service: true },
          orderBy: { AppointmentDate: "desc" },
        },
      },
    });
```

(The rest of the function — the `patients.map(...)`/`sort(...)` below line 18, and the exported `Patient` type at the bottom — is untouched.)

- [ ] **Step 2: Fix `update-patient-status.ts`'s tenant scoping**

This was scoping by `Customer.userId` (the patient-login field, virtually always `null` for clinic-added customers) instead of the tenant — meaning the `where` clause almost never matched, so status updates were silently no-ops for real clinic customers.

```ts
"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CustomerStatus } from "@prisma/client";
import { getActiveOrganization } from "@/lib/organization";

const formSchema = z.object({
  customerId: z.string().min(1, "O ID do paciente é obrigatório"),
  treatmentStatus: z.nativeEnum(CustomerStatus),
});

type FormSchema = z.infer<typeof formSchema>;

export async function updatePatientStatus(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await prisma.customer.update({
      where: {
        id: formData.customerId,
        organizationId: organization.id,
      },
      data: {
        treatmentStatus: formData.treatmentStatus,
      },
    });
    revalidatePath("/dashboard/patients");
    return { data: "Status do paciente atualizado com sucesso!" };
  } catch (error) {
    return { error: "Erro ao atualizar status do paciente" };
  }
}
```

- [ ] **Step 3: Update `patients/page.tsx:12`**

```tsx
import { redirect } from "next/navigation";
import getSession from "@/lib/getSession";
import { getPatients } from "./_data-access/get-patients";
import { PatientsList } from "./_components/patients-list";
import { requireActiveOrganization } from "@/lib/organization";

export default async function PatientsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const organization = await requireActiveOrganization();
  const patients = await getPatients({ organizationId: organization.id });

  return (
    <main>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Pacientes
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe quem já passou pela sua clínica e em que fase do tratamento está.
        </p>
      </div>

      <div className="mt-4">
        <PatientsList patients={patients} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — no errors should remain in these 3 files.

Manual check: visit `/dashboard/patients` and confirm it loads without error and (once at least one `Customer` row exists for the logged-in clinic's `Organization`) lists it.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(panel)/dashboard/patients/_data-access/get-patients.ts" "src/app/(panel)/dashboard/patients/_actions/update-patient-status.ts" "src/app/(panel)/dashboard/patients/page.tsx"
git commit -m "fix(patients): scope customer list and status updates by organization"
```

---

### Task 5: Dashboard Reports

**Files:**
- Modify: `src/app/(panel)/dashboard/reports/data-access/get-permission-reports.ts` (all 23 lines)
- Modify: `src/app/(panel)/dashboard/reports/index.tsx` (all 29 lines)

**Interfaces:**
- Consumes: `requireActiveOrganization()` from `@/lib/organization`.
- Produces: `getPermissionOrganizationToReports({ organizationId }): Promise<Organization & { subscription: Subscription | null } | null>` (renamed from `getPermissionUserToReports`).

- [ ] **Step 1: Rewrite `get-permission-reports.ts`**

```ts
"use server";

import prisma from "@/lib/prisma";

export async function getPermissionOrganizationToReports({
  organizationId,
}: {
  organizationId: string;
}) {
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
    },
    include: {
      subscription: true,
    },
  });

  if (!organization?.subscription || organization.subscription.plan !== "PROFESSIONAL") {
    return null;
  }
  return organization;
}
```

Note this also fixes the pre-existing `"use service"` typo at the top of the original file (not a valid Next.js directive — it should have been `"use server"`, and now is).

- [ ] **Step 2: Rewrite `reports/index.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getPermissionOrganizationToReports } from "./data-access/get-permission-reports";
import getSession from "@/lib/getSession";
import { requireActiveOrganization } from "@/lib/organization";

export default async function Reports() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const organization = await requireActiveOrganization();
  const allowed = await getPermissionOrganizationToReports({
    organizationId: organization.id,
  });

  if (!allowed) {
   return (
    <main>
      <h1>Sem permissão de acesso ao Relatórios</h1>
    </main>
  );
  }

  return (
    <main>
      <h1>Relatórios</h1>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — no errors should remain in these 2 files (audit tsc #41-43 gone).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(panel)/dashboard/reports/data-access/get-permission-reports.ts" "src/app/(panel)/dashboard/reports/index.tsx"
git commit -m "fix(reports): scope PROFESSIONAL-plan gate by organization"
```

---

### Task 6: Dashboard Services

**Files:**
- Modify: `src/app/(panel)/dashboard/services/_data-access/get-all-services.ts` (all 28 lines)
- Modify: `src/app/(panel)/dashboard/services/_actions/create-service.ts` (all 43 lines)
- Modify: `src/app/(panel)/dashboard/services/_actions/delete-service.ts` (all 38 lines)
- Modify: `src/app/(panel)/dashboard/services/_actions/update-service.ts` (all 46 lines)
- Modify: `src/app/(panel)/dashboard/services/page.tsx:25`

**Interfaces:**
- Consumes: `requireActiveOrganization()`, `getActiveOrganization()` from `@/lib/organization`. `canPermissions({ type: "service" })` (Task 1) — its call site in `services-content.tsx` is unchanged, do not touch that file.
- Produces: `getAllServices({ organizationId }): Promise<{ data: Service[] } | { error: string }>`.

- [ ] **Step 1: Rewrite `get-all-services.ts:7,18-21`**

```ts
"use server";
import prisma from "@/lib/prisma";

// roda no lado servidor

export async function getAllServices({ organizationId }: { organizationId: string }) {
  //lógica para buscar todos os serviços no banco de dados

  if (!organizationId) {
    return {
      error: "Nenhuma organização vinculada à sua conta",
    };
  }

  try {
    const services = await prisma.service.findMany({
      where: {
        organizationId: organizationId,
        status: true,
      },
    });

    return { data: services };
  } catch (err) {
    return { error: "Erro ao buscar os serviços" };
  }
}
```

- [ ] **Step 2: Rewrite `create-service.ts:28-34`**

```ts
"use server"; // roda no lado servidor
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";

const formShema = z.object({
  name: z.string().min(1, { message: "O nome do serviço é obrigatório" }),
  price: z.number().min(1, { message: "O preço do serviço é obrigatório" }),
  duration: z.number(),
});

type formShema = z.infer<typeof formShema>;

export async function createServiceAction(formData: formShema) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const schema = formShema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    const newService = await prisma.service.create({
      data: {
        name: formData.name,
        price: formData.price,
        duration: formData.duration,
        organizationId: organization.id,
      },
    });

    revalidatePath("/dashboard/services");

    return { service: newService };
  } catch (err) {
    return { error: "Erro ao criar o serviço" };
  }
}
```

(Drop the unused `import { ca } from "zod/v4/locales";` line the original file had — it was already dead code, unrelated to this fix, but there's no reason to carry it forward.)

- [ ] **Step 3: Rewrite `delete-service.ts:24-28`**

```ts
"use server"; // roda no lado servidor
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";

const formShema = z.object({
  serviceId: z.string().min(1, { message: "ID do serviço é obrigatório" }),
});

type formShema = z.infer<typeof formShema>;

export async function deleteServiceAction(formData: formShema) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }
  const schema = formShema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await prisma.service.update({
      where: {
        id: formData.serviceId,
        organizationId: organization.id,
      },
      data: {
        status: false,
      },
    });
    revalidatePath("/dashboard/services");
    return { data: "Serviço deletado com sucesso" };
  } catch (err) {
    return { error: "Erro ao deletar o serviço" };
  }
}
```

- [ ] **Step 4: Rewrite `update-service.ts:29-33`** (identical pattern)

```ts
"use server"; // roda no lado servidor
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";

const formShema = z.object({
  name: z.string().min(1, { message: "O nome do serviço é obrigatório" }),
  price: z.number().min(1, { message: "O preço do serviço é obrigatório" }),
  duration: z.number(),
});

type formShema = z.infer<typeof formShema>;

export async function updateServiceAction(
  formData: formShema & { serviceId: string },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }
  const schema = formShema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    const updatedService = await prisma.service.update({
      where: {
        id: formData.serviceId,
        organizationId: organization.id,
      },
      data: {
        name: formData.name,
        price: formData.price,
        duration: formData.duration,
      },
    });
    revalidatePath("/dashboard/services");

    return { data: "Serviço atualizado com sucesso" };
  } catch (err) {
    return { error: "Erro ao atualizar o serviço" };
  }
}
```

- [ ] **Step 5: Update `services/page.tsx:25`'s prop, and `services-content.tsx`'s forwarded call**

`services/page.tsx` currently renders `<ServicesContent userId={session.user.id} />`. `ServicesContent` (in `_components/services-content.tsx`) forwards that straight into `getAllServices({ userId })`. Change both together:

`src/app/(panel)/dashboard/services/page.tsx:25`:
```tsx
        <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando serviços...</p>}>
          <ServicesContent organizationId={organization.id} />
        </Suspense>
```

This requires resolving `organization` earlier in the same file — replace the whole file:

```tsx
import getSession from "@/lib/getSession";
import { redirect } from "next/navigation";
import { ServicesContent } from "./_components/services-content";
import { Suspense } from "react";
import { requireActiveOrganization } from "@/lib/organization";

export default async function Services() {
  //valida se a sessão esta logada
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const organization = await requireActiveOrganization();

  return (
    <main>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Serviços
        </h1>
        <p className="text-sm text-muted-foreground">
          O que sua clínica oferece — preço e duração de cada sessão.
        </p>
      </div>

      <div className="mt-4">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando serviços...</p>}>
          <ServicesContent organizationId={organization.id} />
        </Suspense>
      </div>
    </main>
  );
}
```

`src/app/(panel)/dashboard/services/_components/services-content.tsx` (all 26 lines — only the prop name changes, `canPermissions({ type: "service" })` call is untouched):

```tsx
import { LabelSubscription } from "@/components/ui/label-subscription";
import { getAllServices } from "../_data-access/get-all-services";
import { ServicesList } from "./services-list";
import { canPermissions } from "@/utils/permissions/canPermissions";

interface ServicesContentProps {
  organizationId: string;
}

export async function ServicesContent({ organizationId }: ServicesContentProps) {
  const services = await getAllServices({ organizationId });
  const permissions = await canPermissions({ type: "service" });

  return (
    <>
      {!permissions.hasPermission && (
        <LabelSubscription expired={permissions.expired} />
      )}
      <ServicesList services={services.data || []} permissions={permissions} />
    </>
  );
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` — audit tsc #44-47 gone.

Manual check: visit `/dashboard/services`, create a service, confirm it appears in the list and that `/dashboard` (Task 3) and the public booking page (once Task 8 lands) can see it.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(panel)/dashboard/services/_data-access/get-all-services.ts" "src/app/(panel)/dashboard/services/_actions/create-service.ts" "src/app/(panel)/dashboard/services/_actions/delete-service.ts" "src/app/(panel)/dashboard/services/_actions/update-service.ts" "src/app/(panel)/dashboard/services/page.tsx" "src/app/(panel)/dashboard/services/_components/services-content.tsx"
git commit -m "fix(services): scope service CRUD by organization"
```

---

### Task 7: Dashboard Profile

**Files:**
- Modify: `src/app/(panel)/dashboard/profile/_data-access/get-info-user.ts` (all 34 lines) → rename to `get-info-organization.ts`
- Modify: `src/app/(panel)/dashboard/profile/_data-access/get-profile-overview.ts` (all 67 lines)
- Modify: `src/app/(panel)/dashboard/profile/_actions/update-profile.ts` (all 57 lines)
- Modify: `src/app/(panel)/dashboard/profile/_actions/update-avatar.ts` (all 46 lines)
- Modify: `src/app/(panel)/dashboard/profile/_components/profile.tsx` (all 497 lines — only the type import, the fields read off `user`, and the avatar prop name change; the JSX structure and every `fieldset`/`FormField` stay exactly as-is)
- Modify: `src/app/(panel)/dashboard/profile/_components/profile-avatar.tsx` (all 130 lines)
- Modify: `src/app/(panel)/dashboard/profile/page.tsx` (all 28 lines)

**Interfaces:**
- Consumes: `requireActiveOrganization()` from `@/lib/organization`.
- Produces: `getOrganizationData({ organizationId }): Promise<(Organization & { subscription: Subscription | null }) | null>` (renamed from `getUserData`). `getProfileOverview(organizationId: string): Promise<ProfileOverview>` (parameter renamed, same return shape).

This is the one task where a field genuinely changes *meaning*, not just location: the avatar edited on this page is the **clinic's public photo** (shown on `/clinica/[id]`, per `booking-wizard.tsx`/`clinic-profile.tsx`'s `clinic.image` in Task 8) — it must write to `Organization.image`, not `User.image` (the person's own login avatar, unrelated and untouched by this task).

- [ ] **Step 1: Rename and rewrite `get-info-user.ts` → `get-info-organization.ts`**

```bash
git mv "src/app/(panel)/dashboard/profile/_data-access/get-info-user.ts" "src/app/(panel)/dashboard/profile/_data-access/get-info-organization.ts"
```

```ts
"use server";

import prisma from "@/lib/prisma";

interface GetOrganizationDataProps {
  organizationId: string;
}

export async function getOrganizationData({ organizationId }: GetOrganizationDataProps) {
  try {
    if (!organizationId) {
      return null;
    }

    const organization = await prisma.organization.findFirst({
      where: {
        id: organizationId,
      },
      include: {
        subscription: true,
      },
    });

    if (!organization) {
      return null;
    }

    return organization;
  } catch (err) {
    console.error(err);
    return null;
  }
}
```

- [ ] **Step 2: Rewrite `get-profile-overview.ts`**

```ts
"use server";

import prisma from "@/lib/prisma";
import type { Organization } from "@prisma/client";

export interface CompletionItem {
  label: string;
  done: boolean;
}

export interface ProfileOverview {
  activePatients: number;
  totalPatients: number;
  sessionsCompleted: number;
  noShowRate: number | null;
  completion: CompletionItem[];
  completionPercent: number;
}

export async function getProfileOverview(organizationId: string): Promise<ProfileOverview> {
  const [organization, customers, appointments, servicesCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.customer.findMany({ where: { organizationId }, select: { treatmentStatus: true } }),
    prisma.appointments.findMany({
      where: { organizationId },
      select: { status: true },
    }),
    prisma.service.count({ where: { organizationId, status: true } }),
  ]);

  const activePatients = customers.filter((c) => c.treatmentStatus === "EM_TRATAMENTO").length;
  const sessionsCompleted = appointments.filter((a) => a.status === "COMPLETED").length;
  const noShowCount = appointments.filter((a) => a.status === "NO_SHOW").length;
  const noShowDenominator = sessionsCompleted + noShowCount;
  const noShowRate =
    noShowDenominator > 0 ? Math.round((noShowCount / noShowDenominator) * 100) : null;

  const completion = buildCompletionChecklist(organization, servicesCount);
  const completionPercent = Math.round(
    (completion.filter((item) => item.done).length / completion.length) * 100,
  );

  return {
    activePatients,
    totalPatients: customers.length,
    sessionsCompleted,
    noShowRate,
    completion,
    completionPercent,
  };
}

function buildCompletionChecklist(
  organization: Organization | null,
  servicesCount: number,
): CompletionItem[] {
  return [
    { label: "Foto de perfil", done: Boolean(organization?.image) },
    { label: "Endereço da clínica", done: Boolean(organization?.address) },
    { label: "Telefone de contato", done: Boolean(organization?.phone) },
    { label: "Segmento do negócio", done: Boolean(organization?.segment) },
    { label: "Registro profissional", done: Boolean(organization?.professionalRegistration) },
    { label: "Pelo menos um serviço ativo", done: servicesCount > 0 },
    { label: "Horários de atendimento", done: (organization?.times.length ?? 0) > 0 },
  ];
}
```

- [ ] **Step 3: Rewrite `update-profile.ts`**

```ts
"use server"; // roda no lado servidor
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Segment } from "@prisma/client";
import { getActiveOrganization } from "@/lib/organization";

const formShema = z.object({
  name: z.string().min(1, { message: "O nome é obrigatório" }),
  address: z.string().optional(),
  phone: z.string().optional(),
  status: z.boolean(),
  segment: z.nativeEnum(Segment).optional(),
  professionalRegistration: z.string().optional(),
  timeZone: z.string(),
  times: z.array(z.string()),
});

type formShema = z.infer<typeof formShema>;

export async function updateProfileAction(formData: formShema) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const schema = formShema.safeParse(formData);
  if (!schema.success) {
    return { error: "Dados inválidos" };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        status: formData.status,
        segment: formData.segment,
        professionalRegistration: formData.professionalRegistration,
        timezone: formData.timeZone,
        times: formData.times,
      },
    });

    revalidatePath("/dashboard/profile");

    return {
      data: "Perfil atualizado com sucesso",
    };
  } catch (err) {
    return { error: "Erro ao atualizar o perfil" };
  }
}
```

(This also fixes two silent bugs in the original: the two `error: "..."` lines on failed auth/validation were bare labeled statements, not `return` statements, so the function fell through to the `try` block and reported success even when unauthenticated or invalid — now they return properly.)

- [ ] **Step 4: Rewrite `update-avatar.ts` to write `Organization.image`**

```ts
"use server";

import Prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getActiveOrganization } from "@/lib/organization";

export async function updateProfileAvatar({
  avatarUrl,
}: {
  avatarUrl: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "Usuário não autenticado",
    };
  }
  if (!avatarUrl) {
    return {
      error: "Falha ao alterar imagem",
    };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await Prisma.organization.update({
      where: {
        id: organization.id,
      },
      data: {
        image: avatarUrl,
      },
    });

    revalidatePath("/dashboard/profile");

    return {
      data: "Imagem alterada com sucesso",
    };
  } catch (err) {
    return {
      error: "Falha ao alterar imagem",
    };
  }
}
```

- [ ] **Step 5: Update `profile-avatar.tsx` to take `organizationId` and stop touching the NextAuth session**

```tsx
"use client";
import Image from "next/image";
import { ChangeEvent, useState } from "react";
import semFoto from "../../../../../../public/profissional em branco.png";
import { Loader, Upload } from "lucide-react";
import { toast } from "sonner";
import { updateProfileAvatar } from "../_actions/update-avatar";

interface AvatarProfileProps {
  avatarUrl: string | null;
  organizationId: string;
  sizeClassName?: string;
}

export function AvatarProfile({
  avatarUrl,
  organizationId,
  sizeClassName = "w-40 h-40",
}: AvatarProfileProps) {
  const [previewImage, setPreviewImage] = useState(avatarUrl);
  const [loading, setLoading] = useState(false);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      const image = e.target.files[0];

      if (image.type !== "image/jpeg" && image.type !== "image/png") {
        toast.error("Formato de imagem inválido");
        return;
      }

      const newFilename = `${organizationId}`;
      const newFile = new File([image], newFilename, { type: image.type });

      const urlImage = await uploadImage(newFile);

      if (!urlImage || urlImage === "") {
        toast.error("Erro ao salvar imagem.");
        return;
      }

      setPreviewImage(urlImage);
      await updateProfileAvatar({ avatarUrl: urlImage });
      setLoading(false);
    }
  }

  async function uploadImage(image: File): Promise<string | null> {
    try {
      toast("Estamos enviando sua imagem...");

      const formData = new FormData();

      formData.append("file", image);
      formData.append("userId", organizationId);

      const response = await fetch(`/api/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        toast.error("Erro no servidor ao salvar imagem.");
        return null;
      }

      const data = await response.json();

      toast("Imagem alterada com sucesso!");
      return data.secure_url as string;
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-full bg-muted ${sizeClassName}`}>
      <div className="absolute inset-0 z-2 flex items-center justify-center">
        <span className="pointer-events-none absolute cursor-pointer bg-card/90 text-foreground p-2 rounded-full shadow-xl">
          {loading ? (
            <Loader size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
        </span>

        <input
          type="file"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          accept="image/*"
          onChange={handleChange}
        />
      </div>

      {previewImage ? (
        <Image
          src={previewImage}
          alt="Foto de perfil da clinica"
          fill
          className="object-cover"
          quality={100}
          priority
          sizes="(max-width: 480px) 100vw, (max-width: 1024px) 75vw, 60vw"
        />
      ) : (
        <Image
          src={semFoto}
          alt="Foto de perfil da clinica"
          fill
          className="object-cover"
          quality={100}
          priority
          sizes="(max-width: 480px) 100vw, (max-width: 1024px) 75vw, 60vw"
        />
      )}
    </div>
  );
}
```

We keep the `formData.append("userId", organizationId)` field name sent to `/api/image/upload` as-is — that route (audited, confirmed clean) just tags the Cloudinary upload with whatever string it receives under that key; renaming it is out of scope here and would touch a file no other task in this plan needs to open.

Removing the `useSession()`/`update({ image: urlImage })` call is intentional, not an oversight: that call pushed the uploaded URL into the *personal login session's* `user.image`, which was only ever correct back when `User` was the tenant. Now that this avatar is the organization's public photo, pushing it into the session would incorrectly overwrite how the logged-in person's own avatar renders elsewhere (e.g. a future personal-avatar consumer). `revalidatePath("/dashboard/profile")` inside `updateProfileAvatar` (Step 4) is what makes the new photo show up after upload.

- [ ] **Step 6: Update `profile.tsx`'s type and field reads**

Change the type alias and prop name (lines 45-53):

```tsx
import { Prisma } from "@prisma/client";

type OrganizationWithSubscription = Prisma.OrganizationGetPayload<{
  include: {
    subscription: true;
  };
}>;

interface ProfileContentProps {
  organization: OrganizationWithSubscription;
  overview: ProfileOverviewData;
}
```

Change the component signature and every `user.` read to `organization.` (this is a pure find-and-replace inside the function body — the JSX structure, fieldsets, and form fields around them do not change at all):

```tsx
export function ProfileContent({ organization, overview }: ProfileContentProps) {
  //controla abertura do dialog
  const [DialogOpen, setDialogOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string[]>(organization.times ?? []);
  const router = useRouter();
```

- `user.times` → `organization.times` (line 90, and again inside the `useEffect`'s dependency-adjacent read if present)
- the `useProfileForm({...})` call (lines 113-121): `user.address` → `organization.address`, `user.phone` → `organization.phone`, `user.status` → `organization.status`, `user.segment` → `organization.segment`, `user.professionalRegistration` → `organization.professionalRegistration`, `user.timezone` → `organization.timezone`
- lines 149-157: `user.subscription` → `organization.subscription` (both occurrences, in `planInfo` and `statusMeta`)
- line 173: `<AvatarProfile avatarUrl={organization.image} organizationId={organization.id} sizeClassName="h-20 w-20 shrink-0" />`
- line 176: `{organization.name || "Complete seu perfil"}`
- lines 179-192: `segmentLabel(organization.segment)`, `organization.status ? "bg-primary/10 text-primary" : ...`, `{organization.status ? "Aberta" : "Fechada"}`

Also remove the now-unused `useSession` import at the top of the file (`import { signOut, useSession } from "next-auth/react";` → `import { signOut } from "next-auth/react";`) since `handleSignOut` only needs `signOut`, not `update` from `useSession` — the `update()` call inside `handleSignOut` (`await update();` right after `await signOut();`) becomes just the removal of that one line; `signOut()` followed by `router.replace("/")` is sufficient.

- [ ] **Step 7: Update `profile/page.tsx`**

```tsx
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
```

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit` — audit tsc #14-31 gone.

Manual check: visit `/dashboard/profile`, confirm the clinic's name/segment/status/subscription render, edit and save the address/phone/segment/hours, reload, confirm they persisted. Upload a new photo and confirm it appears (this is the photo Task 8 will show on the public booking page).

- [ ] **Step 9: Commit**

```bash
git add "src/app/(panel)/dashboard/profile/_data-access/get-info-organization.ts" "src/app/(panel)/dashboard/profile/_data-access/get-profile-overview.ts" "src/app/(panel)/dashboard/profile/_actions/update-profile.ts" "src/app/(panel)/dashboard/profile/_actions/update-avatar.ts" "src/app/(panel)/dashboard/profile/_components/profile.tsx" "src/app/(panel)/dashboard/profile/_components/profile-avatar.tsx" "src/app/(panel)/dashboard/profile/page.tsx"
git status --porcelain
git commit -m "fix(profile): edit the Organization's clinic profile, not the login User"
```

(Run `git status --porcelain` before committing to confirm the old `get-info-user.ts` path shows as renamed/deleted, not left behind alongside the new file.)

---

### Task 8: Public Booking Flow (`/clinica/[id]`)

**Files:**
- Modify: `src/app/(public)/clinica/[id]/page.tsx` (all 27 lines)
- Modify: `src/app/(public)/clinica/[id]/_data-access/get-info-schedule.ts` (all 31 lines) → rename to `get-info-organization-schedule.ts`
- Modify: `src/app/(public)/clinica/[id]/_components/schedule-content.tsx:8-13,16`
- Modify: `src/app/(public)/clinica/[id]/_components/clinic-profile.tsx:16-21,23-24`
- Modify: `src/app/(public)/clinica/[id]/_components/booking-wizard.tsx:21-26,28-29,127-135`
- Modify: `src/app/(public)/clinica/[id]/_action/create-appointments.tsx` (all 76 lines)

**Interfaces:**
- Consumes: nothing from earlier tasks — this is the public, unauthenticated side.
- Produces: `getInfoOrganizationSchedule({ organizationId }): Promise<Organization & { subscription; services } | null>`. `createNewAppointment({ ..., organizationId })` (parameter renamed from `clinicId`) — Task 9 does **not** call this function, so no cross-task interface to track there.

The route segment is still named `[id]` (renaming the folder to `[organizationId]` is a cosmetic change this plan skips — Next.js route param names are internal, nothing outside `page.tsx` reads `params.id` by name). Only what that `id` is *used as* changes: today it's queried against `User`, from here on it's queried against `Organization`. Because `Organization` carries the exact same field names `Service`/`clinic-profile.tsx`/`booking-wizard.tsx` already read (`times`, `status`, `segment`, `address`, `phone`, `timezone`, `image`, `name`), those two component files need **only their type import changed** — no JSX or logic inside them changes.

- [ ] **Step 1: Rename and rewrite `get-info-schedule.ts`**

```bash
git mv "src/app/(public)/clinica/[id]/_data-access/get-info-schedule.ts" "src/app/(public)/clinica/[id]/_data-access/get-info-organization-schedule.ts"
```

```ts
"use server";
import prisma from "@/lib/prisma";

export async function getInfoOrganizationSchedule({ organizationId }: { organizationId: string }) {
  try {
    if (!organizationId) {
      return null;
    }
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId },
      include: {
        subscription: true,
        services: {
          where: {
            status: true,
          },
        },
      },
    });

    if (!organization) {
      return null;
    }

    return organization;
  } catch (error) {
    console.log(error);
    return null;
  }
}
```

- [ ] **Step 2: Rewrite `clinica/[id]/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getInfoOrganizationSchedule } from "./_data-access/get-info-organization-schedule";
import { ScheduleContent } from "./_components/schedule-content";
import { getCurrentPatient } from "../../_actions/patient-auth";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const organizationId = (await params).id;
  const [organization, patient] = await Promise.all([
    getInfoOrganizationSchedule({ organizationId }),
    getCurrentPatient(),
  ]);

  if (!organization) {
    redirect("/");
  }

  const knownPatient = patient
    ? { name: patient.name, email: patient.email, phone: patient.phone }
    : undefined;

  return <ScheduleContent clinic={organization} knownPatient={knownPatient} />;
}
```

- [ ] **Step 3: Update `schedule-content.tsx`'s type (lines 8-13)**

```tsx
"use client";

import { useState } from "react";
import type { Prisma } from "@prisma/client";
import { ClinicProfile } from "./clinic-profile";
import { BookingWizard } from "./booking-wizard";

type OrganizationWithServiceAndSubscriptions = Prisma.OrganizationGetPayload<{
  include: {
    services: true;
    subscription: true;
  };
}>;

interface ScheduleContentProps {
  clinic: OrganizationWithServiceAndSubscriptions;
  knownPatient?: { name: string | null; email: string | null; phone: string | null };
}
```

The rest of the file (the `booking` state, the conditional render of `BookingWizard`/`ClinicProfile`) is unchanged — only this type alias moved from `Prisma.UserGetPayload` to `Prisma.OrganizationGetPayload`.

- [ ] **Step 4: Update `clinic-profile.tsx`'s type (lines 16-21) and prop (line 24)**

```tsx
type OrganizationWithServiceAndSubscriptions = Prisma.OrganizationGetPayload<{
  include: {
    services: true;
    subscription: true;
  };
}>;

interface ClinicProfileProps {
  clinic: OrganizationWithServiceAndSubscriptions;
  onSelectService: (serviceId: string) => void;
  onStartBooking: () => void;
}
```

Nothing else in this file changes in this task — its `fetch(...?userId=${clinic.id}...)` call at line 57 keeps working exactly as today (still sends the organization's id, just under a query-param name that still says `userId`) until Task 9 renames both that call and the route reading it, together, in one step.

- [ ] **Step 5: Update `booking-wizard.tsx`'s type (lines 21-26), prop (line 29), and the `createNewAppointment` call (lines 127-135)**

```tsx
type OrganizationWithServiceAndSubscriptions = Prisma.OrganizationGetPayload<{
  include: {
    services: true;
    subscription: true;
  };
}>;

interface BookingWizardProps {
  clinic: OrganizationWithServiceAndSubscriptions;
  initialServiceId?: string;
  onDone: () => void;
  knownPatient?: { name: string | null; email: string | null; phone: string | null };
}
```

```tsx
    const response = await createNewAppointment({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      date: formData.date,
      serviceId: formData.serviceId,
      time: selectedTime,
      organizationId: clinic.id,
    });
```

The `fetch(...?userId=${clinic.id}...)` call at line 75 is untouched here too — Task 9 handles it together with its route.

- [ ] **Step 6: Rewrite `create-appointments.tsx`**

```ts
"use server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  email: z.string().email("O e-mail é obrigatório"),
  phone: z.string().min(1, "O telefone é obrigatório"),
  date: z.date(),
  serviceId: z.string().min(1, "O serviço é obrigatório"),
  time: z.string().min(1, "O horário é obrigatório"),
  organizationId: z.string().min(1, "A clínica é obrigatória"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function createNewAppointment(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);

  if (!schema.success) {
    return {
      error: schema.error.issues[0].message,
    };
  }

  try {
    const selectedDate = new Date(formData.date);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth(); // Os meses são indexados a partir de 0
    const day = selectedDate.getDate();

    const appointmentDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0)); // Cria a data no formato UTC

    const customer = await prisma.customer.upsert({
      where: {
        organizationId_email: { organizationId: formData.organizationId, email: formData.email },
      },
      create: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        organizationId: formData.organizationId,
      },
      update: {
        name: formData.name,
        phone: formData.phone,
      },
    });

    const newAppointment = await prisma.appointments.create({
      data: {
        time: formData.time,
        AppointmentDate: appointmentDate,
        service: {
          connect: { id: formData.serviceId },
        },
        organization: {
          connect: { id: formData.organizationId },
        },
        customer: {
          connect: { id: customer.id },
        },
      },
    });
    return { data: newAppointment };
  } catch (err) {
    return {
      error: "Erro ao criar agendamento: " + (err as any).message,
    };
  }
}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` — audit tsc #62-70, #77, #79-81, #109-114 gone (the ones tied to this task's files; the `?userId=` fetch calls and `/api/schedule/get-appointments` route errors remain until Task 9).

Manual check: with at least one `Service` created in Task 6's manual check, visit `/clinica/<the-organization-id-from-dashboard-page>` (the id shown in the dashboard's "Novo agendamento" link) and confirm the clinic's name/segment/address/services render, then walk through booking a slot end-to-end and confirm a `Customer` + `Appointments` row appear in `npx prisma studio` scoped to that organization.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(public)/clinica/[id]/page.tsx" "src/app/(public)/clinica/[id]/_data-access/get-info-organization-schedule.ts" "src/app/(public)/clinica/[id]/_components/schedule-content.tsx" "src/app/(public)/clinica/[id]/_components/clinic-profile.tsx" "src/app/(public)/clinica/[id]/_components/booking-wizard.tsx" "src/app/(public)/clinica/[id]/_action/create-appointments.tsx"
git status --porcelain
git commit -m "fix(booking): serve the public booking page from Organization, not User"
```

---

### Task 9: Public Booking API Routes

**Files:**
- Modify: `src/app/api/clinic/appointments/route.ts` (all 55 lines)
- Modify: `src/app/api/schedule/get-appointments/route.ts` (all 74 lines)
- Modify: `src/app/(public)/clinica/[id]/_components/clinic-profile.tsx:57` (one line)
- Modify: `src/app/(public)/clinica/[id]/_components/booking-wizard.tsx:75` (one line)
- Modify: `src/app/(public)/agendamentos/_components/reschedule-sheet.tsx:61` (one line)

**Interfaces:**
- Consumes: `getActiveOrganization()` from `@/lib/organization`.
- Produces: `GET /api/schedule/get-appointments?organizationId=<id>&date=<yyyy-mm-dd>` (renamed query parameter — was `userId`; all 3 callers below move to the new name in this same task so nothing is left calling the old name).

This is the query-param rename mentioned in Task 8: the fetch call sites already send the organization's id today, just under the label `userId`. Renaming the label and the route that reads it must land together, in one commit, or the public booking page silently breaks between commits.

- [ ] **Step 1: Rewrite `/api/clinic/appointments/route.ts` to load the caller's Organization and include the customer**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import prisma from "@/lib/prisma";
import { getActiveOrganization } from "@/lib/organization";

export const GET = auth(async function GET(request) {
  if (!request.auth) {
    return NextResponse.json(
      { error: "Acesso Não Autorizado!" },
      { status: 401 },
    );
  }
  const searchParams = request.nextUrl.searchParams;
  const dateString = searchParams.get("date") as string;

  if (!dateString) {
    return NextResponse.json({ error: "Data não encontrada" }, { status: 400 });
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return NextResponse.json(
      { error: "Nenhuma organização vinculada à conta" },
      { status: 400 },
    );
  }

  try {
    const [year, month, day] = dateString.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // Cria a data no formato UTC
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)); // Cria a data no formato UTC

    const appointments = await prisma.appointments.findMany({
      where: {
        organizationId: organization.id,
        status: { not: "CANCELLED" },
        AppointmentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: true,
        customer: true,
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json(
      { error: "Falha ai buscar agendamentos" },
      { status: 400 },
    );
  }
});
```

The added `customer: true` in the `include` is what makes Task 3's `appointments-list.tsx`/`dialog-appointment.tsx` (`occupant.customer.name`, etc.) actually receive data — without it those fields would be `undefined` at runtime despite compiling fine against the `AppointmentWithService` type.

- [ ] **Step 2: Rewrite `/api/schedule/get-appointments/route.ts` to read `organizationId` and query `Organization`**

```ts
import prisma from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const dateParm = searchParams.get("date");
  const excludeAppointmentId = searchParams.get("excludeAppointmentId");

  if (!organizationId || !dateParm || organizationId === "null" || dateParm === "null") {
    return NextResponse.json(
      { error: "Nenhum agendamento encontrado" },
      { status: 400 },
    );
  }

  try {
    const [year, month, day] = dateParm.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const organization = await prisma.organization.findFirst({
      where: { id: organizationId || undefined },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organização não encontrada" },
        { status: 400 },
      );
    }

    const appointments = await prisma.appointments.findMany({
      where: {
        organizationId: organizationId || undefined,
        status: { not: "CANCELLED" },
        AppointmentDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      include: {
        service: true,
      },
    });

    const blockSlotes = new Set<string>();
    for (const appointment of appointments) {
      const requiredSlots = Math.ceil(appointment.service.duration / 30);
      const startIndex = organization.times.indexOf(appointment.time);

      if (startIndex !== -1) {
        for (let i = 0; i < requiredSlots; i++) {
          const blockedSlot = organization.times[startIndex + i];
          if (blockedSlot) {
            blockSlotes.add(blockedSlot);
          }
        }
      }
    }
    const blockedTimes = Array.from(blockSlotes);
    return NextResponse.json(blockedTimes);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar agendamentos" },
      { status: 400 },
    );
  }
}
```

(Dropped the unused `import { ok } from "assert";` and `import { use } from "react";` lines the original file had — both dead imports, unrelated to this fix but no reason to keep them.)

- [ ] **Step 3: Update the 3 callers' query string**

`src/app/(public)/clinica/[id]/_components/clinic-profile.tsx:57`:
```tsx
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/schedule/get-appointments?organizationId=${clinic.id}&date=${todayDateParam()}`,
    )
```

`src/app/(public)/clinica/[id]/_components/booking-wizard.tsx:75`:
```tsx
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/schedule/get-appointments?organizationId=${clinic.id}&date=${dateString}`,
        );
```

`src/app/(public)/agendamentos/_components/reschedule-sheet.tsx:61`:
```tsx
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/schedule/get-appointments?organizationId=${appointment.organization.id}&date=${dateParam(date)}&excludeAppointmentId=${appointment.id}`,
    )
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — audit tsc #119-123 gone. This should be the last of the ~40 pre-existing errors; running the full command now should print no output at all.

Manual check: on `/dashboard`, confirm the "Agenda" list shows a previously-created appointment with its customer's real name (not blank). On the public `/clinica/<id>` page, confirm previously-booked slots show as unavailable. On `/agendamentos` (logged in as the patient who booked), confirm the reschedule sheet's time-slot list loads without a 400.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/clinic/appointments/route.ts" "src/app/api/schedule/get-appointments/route.ts" "src/app/(public)/clinica/[id]/_components/clinic-profile.tsx" "src/app/(public)/clinica/[id]/_components/booking-wizard.tsx" "src/app/(public)/agendamentos/_components/reschedule-sheet.tsx"
git commit -m "fix(api): rename get-appointments' userId param to organizationId end to end"
```

---

### Task 10: Landing Page / Professional Discovery

**Files:**
- Modify: `src/app/(public)/_data-access/get-professionals.tsx` (all 22 lines)
- Modify: `src/app/(public)/_components/patient-discovery.tsx:23-28,45-46,66,75-76,180,241` (type + field reads only; JSX structure unchanged)
- No change needed: `src/app/(public)/page.tsx` — it only ever forwards whatever `getProfessionals()` returns into `<PatientDiscovery professionals={...} />`; once that function returns `Organization[]` the existing untyped forwarding keeps compiling and working, and its own tsc error (audit #116-118) disappears as a side effect of this task without editing this file at all.

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `getProfessionals(): Promise<(Organization & { subscription; services })[]>` (return type changed from `User[]`; name and no-arg signature unchanged, so `page.tsx` needs no edit).

- [ ] **Step 1: Rewrite `get-professionals.tsx`**

```tsx
"use server";
import prisma from "@/lib/prisma";

export async function getProfessionals() {
  try {
    const professionals = await prisma.organization.findMany({
      where: {
        status: true,
      },
      include: {
        subscription: true,
        services: {
          where: { status: true },
          select: { name: true },
        },
      },
    });
    return professionals;
  } catch (err) {
    return [];
  }
}
```

- [ ] **Step 2: Update `patient-discovery.tsx`'s type (lines 23-28)**

```tsx
type OrganizationWithServiceAndSubscriptions = Prisma.OrganizationGetPayload<{
  include: {
    subscription: true;
    services: { select: { name: true } };
  };
}>;
```

Match whatever exact `services` include-shape the original type alias declared at lines 23-28 (it must mirror `get-professionals.tsx`'s `select: { name: true }` above) — copy the shape, only swap `Prisma.UserGetPayload` for `Prisma.OrganizationGetPayload`. Then rename every local variable/parameter that was typed against it from `professional`/`p` semantics tied to `User` — the field reads themselves (`professional.subscription?.status`, `professional.subscription?.plan` at lines 45-46; `p.segment` at line 66; `p.address`, `p.services.some(...)` at lines 75-76; `professional.address` at lines 180, 241) need **no change**, since `Organization` has all of those fields under the same names. Only the type alias name/source changes; leave every other line in this file exactly as it is, including the `href={`/clinica/${professional.id}`}` links at lines 163 and 216 — those already send the row's `id`, which is now correctly an `Organization.id`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — expect **zero output**. This was the last file group with outstanding errors from the original audit (tsc #48-61, #116-118).

Manual check: visit `/` (the public home page) logged out, confirm the professional/clinic discovery list renders clinic cards with their names, segments, addresses, and "starting price" as before.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/_data-access/get-professionals.tsx" "src/app/(public)/_components/patient-discovery.tsx"
git commit -m "fix(landing): list Organizations, not Users, on the public discovery page"
```

---

## Final Verification (after all 10 tasks)

- [ ] Run `npx tsc --noEmit` one more time across the whole repo. Expected: no output at all — the ~40 errors from the original audit are all resolved, and no task introduced a new one.
- [ ] Run `npm run build` (this also runs `prisma generate && npx prisma migrate deploy` per `package.json` — confirm it does not attempt to apply any new migration, since this plan changes zero lines of `prisma/schema.prisma`).
- [ ] Full manual walkthrough with the dev server running: log in as the clinic account → `/dashboard` (see today's appointments/reminders, no crash) → `/dashboard/services` (create one) → `/dashboard/patients` (see a customer once one exists) → `/dashboard/profile` (edit business info + photo, confirm persisted) → `/dashboard/plans` (open the billing portal / start a checkout, confirm no `stripe_customer_id` crash) → copy the "Novo agendamento" link → open it in a private window → book an appointment as a patient → back in `/dashboard`, confirm the new appointment appears with the patient's real name.
