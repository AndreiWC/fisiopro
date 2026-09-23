# Prontuário de pacientes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any member of a clinic (OWNER or STAFF) record a clinical note per patient session — free text + session date + up to 3 images — building a chronological history ("prontuário") per patient, on a dedicated page reachable from the existing patient sheet.

**Architecture:** New Prisma model `ClinicalRecord` (soft-deletable, org-scoped, optionally linkable to an `Appointments` row but unused by the UI in this version) backing a new route `src/app/(panel)/dashboard/patients/[id]/prontuario/`, following the same `_data-access`/`_actions`/`_components` colocation convention used by `patients/` and `services/`. Record creation is gated by the existing plan-limit system (`canPermissions`), extended with a new `"clinicalRecord"` resource type. Images reuse the existing Cloudinary upload endpoint (`/api/image/upload`) unchanged.

**Tech Stack:** Next.js 15 (App Router, React 19, Server Components + Server Actions), Prisma 6 / PostgreSQL, NextAuth v5, Tailwind v4 + shadcn/ui ("new-york"), zod v4 + `react-hook-form` + `@hookform/resolvers/zod`, `sonner` for toasts, `date-fns` v4, Cloudinary (existing `/api/image/upload` route).

**Spec:** `docs/superpowers/specs/2026-09-22-prontuario-pacientes-design.md`

## Global Constraints

- All user-facing strings are pt-BR, matching the rest of the app.
- This project has **no test runner configured** (see `fisiopro/CLAUDE.md`) — every task's "verify" step is manual: `npx tsc --noEmit`, `npm run dev` + browser, and (when relevant) `npx prisma studio` to inspect/seed data. Do not introduce a test framework as part of this plan.
- Do **not** run `git commit` (or `git add`/push) at the end of tasks — the user commits manually. Leave finished work in the working tree.
- No `middleware.ts` — every guard runs per-request inside pages/actions/data-access, following the existing pattern (see `src/app/(panel)/dashboard/patients/page.tsx`).
- Next.js 15 dynamic route params are async: `params: Promise<{ id: string }>`, then `const { id } = await params;`.
- Path alias `@/*` → `src/*`.
- Tenant boundary is `Organization` (via `getActiveOrganization()`/`requireActiveOrganization()` from `src/lib/organization.ts`) — every `ClinicalRecord` query/mutation filters by `organizationId`.
- No role distinction: OWNER and STAFF have identical rights over every patient's records in their organization.
- `ClinicalRecord` deletion is soft delete (`deletedAt` column) — every read filters `deletedAt: null`; nothing hard-deletes a record.
- Images: reuse `/api/image/upload` (Cloudinary) unmodified; max **3 images** per record; only `image/png`/`image/jpeg` accepted (same as the existing endpoint).
- Plan limits: `PLANS.BASIC.maxClinicalRecords = 100`, `PLANS.PROFESSIONAL.maxClinicalRecords = null` (unlimited), counted as non-deleted `ClinicalRecord` rows per organization (not per patient). The new `canCreateClinicalRecord` checker must **not** replicate `canCreateService`'s existing quirk of checking two unrelated counts together — it checks only the clinical-record count against `maxClinicalRecords`.
- No linkage to `Appointments` is surfaced in the UI in this version — `appointmentId` exists on the model for future use only.

---

### Task 1: Prisma schema — `ClinicalRecord` model + migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: Prisma model `ClinicalRecord` with fields `id, note, sessionDate, images, deletedAt, customerId, organizationId, authorId, appointmentId, createdAt, updatedAt`, plus back-relations `clinicalRecords ClinicalRecord[]` on `Customer`, `Organization`, `User`, `Appointments`. Later tasks query it via `prisma.clinicalRecord`.

- [ ] **Step 1: Add the `ClinicalRecord` model**

In `prisma/schema.prisma`, insert this new model right after the `enum CustomerStatus { ... }` block (i.e. between `CustomerStatus` and `model Reminder`):

```prisma
model ClinicalRecord {
  id          String    @id @default(cuid())
  note        String    @db.Text
  sessionDate DateTime
  images      String[]  @default([])

  deletedAt DateTime?

  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  authorId String
  author   User   @relation(fields: [authorId], references: [id])

  appointmentId String?
  appointment   Appointments? @relation(fields: [appointmentId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Add the back-relation on `Customer`**

In the `Customer` model, change:

```prisma
  appointments Appointments[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, email])
  @@unique([organizationId, cpf])
}
```

to:

```prisma
  appointments     Appointments[]
  clinicalRecords  ClinicalRecord[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, email])
  @@unique([organizationId, cpf])
}
```

- [ ] **Step 3: Add the back-relation on `Organization`**

In the `Organization` model, change:

```prisma
  memberships  Membership[]
  subscription Subscription?
  services     Service[]
  reminders    Reminder[]
  customers    Customer[]
  appointments Appointments[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

to:

```prisma
  memberships     Membership[]
  subscription    Subscription?
  services        Service[]
  reminders       Reminder[]
  customers       Customer[]
  appointments    Appointments[]
  clinicalRecords ClinicalRecord[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 4: Add the back-relation on `User`**

In the `User` model, change:

```prisma
  memberships    Membership[]
  patientProfile PatientProfile?
  customers      Customer[]
  accounts       Account[]
  sessions       Session[]
  Authenticator  Authenticator[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

to:

```prisma
  memberships     Membership[]
  patientProfile  PatientProfile?
  customers       Customer[]
  accounts        Account[]
  sessions        Session[]
  Authenticator   Authenticator[]
  clinicalRecords ClinicalRecord[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 5: Add the back-relation on `Appointments`**

In the `Appointments` model, change:

```prisma
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

to:

```prisma
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])

  clinicalRecords ClinicalRecord[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 6: Format and create the migration**

Run from `fisiopro/`:

```bash
npx prisma format
npx prisma migrate dev --name add_clinical_record
```

Expected: Prisma prints "Your database is now in sync with your schema" / "The following migration(s) have been created and applied", and `prisma generate` runs automatically at the end with no errors. A new folder appears under `prisma/migrations/` containing the SQL for the `ClinicalRecord` table.

- [ ] **Step 7: Verify types compile**

Run from `fisiopro/`:

```bash
npx tsc --noEmit
```

Expected: no errors (nothing references `ClinicalRecord` yet, so this just confirms the generated Prisma client and existing app still compile together).

---

### Task 2: Plan-limit enforcement for clinical records

**Files:**
- Modify: `src/utils/plans/index.tsx`
- Modify: `src/utils/permissions/get-plans.ts`
- Create: `src/utils/permissions/canCreateClinicalRecord.ts`
- Modify: `src/utils/permissions/canPermissions.ts`

**Interfaces:**
- Consumes: `ResultPermissionsProps`, `checkSubscriptionExpired` (existing, from `./canPermissions` / `./checkSubscripionExpired`).
- Produces: `canPermissions({ type: "clinicalRecord" }): Promise<ResultPermissionsProps>` — Task 3's `create-clinical-record.ts` action and Task 4's page call this exactly like `canPermissions({ type: "service" })` is already called elsewhere.

- [ ] **Step 1: Add `maxClinicalRecords` to the plan type and values**

In `src/utils/plans/index.tsx`, change:

```tsx
export type PlanDetailsProps = {
  maxServices: number;
  maxCustomer: number;
};
```

to:

```tsx
export type PlanDetailsProps = {
  maxServices: number;
  maxCustomer: number;
  maxClinicalRecords: number | null;
};
```

And change the `PLANS` constant:

```tsx
export const PLANS: PlansProps = {
  BASIC: {
    maxServices: 5,
    maxCustomer: 30,
  },
  PROFESSIONAL: {
    maxServices: 10,
    maxCustomer: 60,
  },
};
```

to:

```tsx
export const PLANS: PlansProps = {
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
```

Then, in the same file, add a feature bullet to each plan's `features` array in `subscriptionPlans` (mirroring how `maxServices`/`maxCustomer` are already listed there). In the `BASIC` plan's `features` array, add after the `maxCustomer` line:

```tsx
      `Até ${PLANS.BASIC.maxClinicalRecords} registros de prontuário`,
```

In the `PROFESSIONAL` plan's `features` array, add after its `maxCustomer` line:

```tsx
      "Prontuário de pacientes ilimitado",
```

- [ ] **Step 2: Mirror the same values in `get-plans.ts`**

In `src/utils/permissions/get-plans.ts`, change:

```ts
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
```

to:

```ts
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
```

(This file duplicates `PLANS` from `src/utils/plans/index.tsx` under a different name — a pre-existing quirk in this codebase, not something to fix here. Keep both in sync manually.)

- [ ] **Step 3: Create the clinical-record limit checker**

Create `src/utils/permissions/canCreateClinicalRecord.ts`:

```ts
"use server";

import { Organization, Subscription } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getPlan } from "./get-plans";
import { PLANS } from "@/utils/plans/index";
import { checkSubscriptionExpired } from "@/utils/permissions/checkSubscripionExpired";
import { ResultPermissionsProps } from "./canPermissions";

export async function canCreateClinicalRecord(
  subscription: Subscription | null,
  organization: Organization,
): Promise<ResultPermissionsProps> {
  try {
    const clinicalRecordCount = await prisma.clinicalRecord.count({
      where: {
        organizationId: organization.id,
        deletedAt: null,
      },
    });

    if (subscription && subscription.status === "active") {
      const plan = subscription.plan;
      const planLimits = await getPlan(plan);

      return {
        hasPermission:
          planLimits.maxClinicalRecords === null ||
          clinicalRecordCount <= planLimits.maxClinicalRecords,
        planId: plan,
        expired: false,
        plan: PLANS[subscription.plan],
      };
    }
    // plano TRIAL
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

- [ ] **Step 4: Wire it into `canPermissions`**

In `src/utils/permissions/canPermissions.ts`, change:

```ts
"use server";
import prisma from "@/lib/prisma";
import { canCreateService } from "./canCreateService";
import { PlanDetailsInfo } from "./get-plans";
import { requireActiveOrganization } from "@/lib/organization";

export type PlanType = "BASIC" | "PROFESSIONAL" | "TRIAL" | "EXPIRED";
type TypeCheck = "service";
```

to:

```ts
"use server";
import prisma from "@/lib/prisma";
import { canCreateService } from "./canCreateService";
import { canCreateClinicalRecord } from "./canCreateClinicalRecord";
import { PlanDetailsInfo } from "./get-plans";
import { requireActiveOrganization } from "@/lib/organization";

export type PlanType = "BASIC" | "PROFESSIONAL" | "TRIAL" | "EXPIRED";
type TypeCheck = "service" | "clinicalRecord";
```

And change the `switch` block:

```ts
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
```

to:

```ts
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
```

- [ ] **Step 5: Verify types compile**

Run from `fisiopro/`:

```bash
npx tsc --noEmit
```

Expected: no errors.

---

### Task 3: Data access + server actions for `ClinicalRecord`

**Files:**
- Create: `src/app/(panel)/dashboard/patients/[id]/prontuario/_data-access/get-patient-summary.ts`
- Create: `src/app/(panel)/dashboard/patients/[id]/prontuario/_data-access/get-clinical-records.ts`
- Create: `src/app/(panel)/dashboard/patients/[id]/prontuario/_actions/create-clinical-record.ts`
- Create: `src/app/(panel)/dashboard/patients/[id]/prontuario/_actions/update-clinical-record.ts`
- Create: `src/app/(panel)/dashboard/patients/[id]/prontuario/_actions/delete-clinical-record.ts`

**Interfaces:**
- Consumes: `getActiveOrganization` (`@/lib/organization`), `canPermissions` (`@/utils/permissions/canPermissions`, Task 2), `auth` (`@/lib/auth`).
- Produces:
  - `getPatientSummary({ customerId, organizationId }): Promise<PatientSummary | null>` and type `PatientSummary` — consumed by Task 4's `page.tsx`.
  - `getClinicalRecords({ customerId, organizationId }): Promise<ClinicalRecordListItem[]>` and type `ClinicalRecordListItem` (`{ id, note, sessionDate: Date, images: string[], authorName: string | null, createdAt: Date, updatedAt: Date }`) — consumed by Task 4's list/item/form components and `page.tsx`.
  - `createClinicalRecordAction(input: { customerId: string; note: string; sessionDate: string; images: string[] }): Promise<{ data: string } | { error: string }>`.
  - `updateClinicalRecordAction(input: { recordId: string; customerId: string; note: string; sessionDate: string; images: string[] }): Promise<{ data: string } | { error: string }>`.
  - `deleteClinicalRecordAction(input: { recordId: string; customerId: string }): Promise<{ data: string } | { error: string }>`.

- [ ] **Step 1: Create the patient-summary query**

Create `src/app/(panel)/dashboard/patients/[id]/prontuario/_data-access/get-patient-summary.ts`:

```ts
"use server";
import prisma from "@/lib/prisma";

export async function getPatientSummary({
  customerId,
  organizationId,
}: {
  customerId: string;
  organizationId: string;
}) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      treatmentStatus: true,
    },
  });

  return customer;
}

export type PatientSummary = NonNullable<
  Awaited<ReturnType<typeof getPatientSummary>>
>;
```

- [ ] **Step 2: Create the clinical-records list query**

Create `src/app/(panel)/dashboard/patients/[id]/prontuario/_data-access/get-clinical-records.ts`:

```ts
"use server";
import prisma from "@/lib/prisma";

export async function getClinicalRecords({
  customerId,
  organizationId,
}: {
  customerId: string;
  organizationId: string;
}) {
  const records = await prisma.clinicalRecord.findMany({
    where: {
      customerId,
      organizationId,
      deletedAt: null,
    },
    include: {
      author: { select: { name: true } },
    },
    orderBy: { sessionDate: "desc" },
  });

  return records.map((record) => ({
    id: record.id,
    note: record.note,
    sessionDate: record.sessionDate,
    images: record.images,
    authorName: record.author.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }));
}

export type ClinicalRecordListItem = Awaited<
  ReturnType<typeof getClinicalRecords>
>[number];
```

- [ ] **Step 3: Create the "create record" action**

Create `src/app/(panel)/dashboard/patients/[id]/prontuario/_actions/create-clinical-record.ts`:

```ts
"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";
import { canPermissions } from "@/utils/permissions/canPermissions";

const formSchema = z.object({
  customerId: z.string().min(1, { message: "Paciente é obrigatório" }),
  note: z.string().min(1, { message: "Descreva o que ocorreu na sessão" }),
  sessionDate: z.string().min(1, { message: "Selecione a data da sessão" }),
  images: z
    .array(z.string())
    .max(3, { message: "No máximo 3 imagens por anotação" }),
});

type FormSchema = z.infer<typeof formSchema>;

export async function createClinicalRecordAction(formData: FormSchema) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  const customer = await prisma.customer.findFirst({
    where: { id: schema.data.customerId, organizationId: organization.id },
    select: { id: true },
  });
  if (!customer) {
    return { error: "Paciente não encontrado" };
  }

  const permission = await canPermissions({ type: "clinicalRecord" });
  if (!permission.hasPermission) {
    return { error: "Limite de registros do seu plano atingido" };
  }

  try {
    await prisma.clinicalRecord.create({
      data: {
        note: schema.data.note,
        sessionDate: new Date(schema.data.sessionDate),
        images: schema.data.images,
        customerId: schema.data.customerId,
        organizationId: organization.id,
        authorId: session.user.id,
      },
    });
    revalidatePath(
      `/dashboard/patients/${schema.data.customerId}/prontuario`,
    );
    return { data: "Registro adicionado ao prontuário" };
  } catch (err) {
    return { error: "Erro ao salvar o registro" };
  }
}
```

- [ ] **Step 4: Create the "update record" action**

Create `src/app/(panel)/dashboard/patients/[id]/prontuario/_actions/update-clinical-record.ts`:

```ts
"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";

const formSchema = z.object({
  recordId: z.string().min(1, { message: "ID do registro é obrigatório" }),
  customerId: z.string().min(1, { message: "Paciente é obrigatório" }),
  note: z.string().min(1, { message: "Descreva o que ocorreu na sessão" }),
  sessionDate: z.string().min(1, { message: "Selecione a data da sessão" }),
  images: z
    .array(z.string())
    .max(3, { message: "No máximo 3 imagens por anotação" }),
});

type FormSchema = z.infer<typeof formSchema>;

export async function updateClinicalRecordAction(formData: FormSchema) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await prisma.clinicalRecord.update({
      where: {
        id: schema.data.recordId,
        organizationId: organization.id,
      },
      data: {
        note: schema.data.note,
        sessionDate: new Date(schema.data.sessionDate),
        images: schema.data.images,
      },
    });
    revalidatePath(
      `/dashboard/patients/${schema.data.customerId}/prontuario`,
    );
    return { data: "Registro atualizado com sucesso" };
  } catch (err) {
    return { error: "Erro ao atualizar o registro" };
  }
}
```

- [ ] **Step 5: Create the "delete record" action (soft delete)**

Create `src/app/(panel)/dashboard/patients/[id]/prontuario/_actions/delete-clinical-record.ts`:

```ts
"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganization } from "@/lib/organization";

const formSchema = z.object({
  recordId: z.string().min(1, { message: "ID do registro é obrigatório" }),
  customerId: z.string().min(1, { message: "Paciente é obrigatório" }),
});

type FormSchema = z.infer<typeof formSchema>;

export async function deleteClinicalRecordAction(formData: FormSchema) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Usuário não autenticado" };
  }

  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: "Dados inválidos" };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nenhuma organização vinculada à sua conta" };
  }

  try {
    await prisma.clinicalRecord.update({
      where: {
        id: schema.data.recordId,
        organizationId: organization.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    revalidatePath(
      `/dashboard/patients/${schema.data.customerId}/prontuario`,
    );
    return { data: "Registro excluído com sucesso" };
  } catch (err) {
    return { error: "Erro ao excluir o registro" };
  }
}
```

- [ ] **Step 6: Verify types compile**

Run from `fisiopro/`:

```bash
npx tsc --noEmit
```

Expected: no errors. (No UI consumes these yet — Task 4 wires them up with a real browser check.)

---

### Task 4: Prontuário page — form, list, and route

**Files:**
- Create: `src/app/(panel)/dashboard/patients/[id]/prontuario/_lib/use-clinical-record-form.ts`
- Create: `src/app/(panel)/dashboard/patients/[id]/prontuario/_components/clinical-record-form.tsx`
- Create: `src/app/(panel)/dashboard/patients/[id]/prontuario/_components/clinical-record-item.tsx`
- Create: `src/app/(panel)/dashboard/patients/[id]/prontuario/_components/clinical-record-list.tsx`
- Create: `src/app/(panel)/dashboard/patients/[id]/prontuario/page.tsx`

**Interfaces:**
- Consumes: `getPatientSummary`/`PatientSummary`, `getClinicalRecords`/`ClinicalRecordListItem`, `createClinicalRecordAction`, `updateClinicalRecordAction`, `deleteClinicalRecordAction` (Task 3); `canPermissions`/`ResultPermissionsProps` (Task 2); `DatePickerButton` (`@/app/(panel)/dashboard/_components/agenda/date-picker-button`, existing); `LabelSubscription` (`@/components/ui/label-subscription`, existing); `getSession` (`@/lib/getSession`), `requireActiveOrganization` (`@/lib/organization`).
- Produces: route `GET /dashboard/patients/[id]/prontuario` — Task 5 links to it.

- [ ] **Step 1: Create the record form hook**

Create `src/app/(panel)/dashboard/patients/[id]/prontuario/_lib/use-clinical-record-form.ts`:

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";

const formSchema = z.object({
  note: z.string().min(1, { message: "Descreva o que ocorreu na sessão" }),
  sessionDate: z.string().min(1, { message: "Selecione a data da sessão" }),
  images: z
    .array(z.string())
    .max(3, { message: "No máximo 3 imagens por anotação" }),
});

export interface UseClinicalRecordFormProps {
  initialValues?: {
    note: string;
    sessionDate: string;
    images: string[];
  };
}

export type ClinicalRecordFormData = z.infer<typeof formSchema>;

export function useClinicalRecordForm({
  initialValues,
}: UseClinicalRecordFormProps) {
  return useForm<ClinicalRecordFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues || {
      note: "",
      sessionDate: new Date().toISOString(),
      images: [],
    },
  });
}
```

- [ ] **Step 2: Create the record form (dialog content)**

Create `src/app/(panel)/dashboard/patients/[id]/prontuario/_components/clinical-record-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePickerButton } from "@/app/(panel)/dashboard/_components/agenda/date-picker-button";
import {
  useClinicalRecordForm,
  ClinicalRecordFormData,
} from "../_lib/use-clinical-record-form";
import { createClinicalRecordAction } from "../_actions/create-clinical-record";
import { updateClinicalRecordAction } from "../_actions/update-clinical-record";
import type { ClinicalRecordListItem } from "../_data-access/get-clinical-records";

interface ClinicalRecordFormProps {
  closeModal: () => void;
  customerId: string;
  organizationId: string;
  record?: ClinicalRecordListItem | null;
  onDelete?: () => void | Promise<void>;
}

const MAX_IMAGES = 3;

export function ClinicalRecordForm({
  closeModal,
  customerId,
  organizationId,
  record,
  onDelete,
}: ClinicalRecordFormProps) {
  const form = useClinicalRecordForm({
    initialValues: record
      ? {
          note: record.note,
          sessionDate: new Date(record.sessionDate).toISOString(),
          images: record.images,
        }
      : undefined,
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const images = form.watch("images");

  async function handleUploadImage(file: File) {
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      toast.error("Formato de imagem inválido");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      toast.error(`No máximo ${MAX_IMAGES} imagens por anotação`);
      return;
    }

    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("userId", organizationId);

      const response = await fetch("/api/image/upload", {
        method: "POST",
        body: uploadData,
      });

      if (!response.ok) {
        toast.error("Falha ao enviar uma das imagens, tente novamente");
        return;
      }

      const data = await response.json();
      form.setValue("images", [...images, data.secure_url as string]);
    } catch (err) {
      toast.error("Falha ao enviar uma das imagens, tente novamente");
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage(url: string) {
    form.setValue(
      "images",
      images.filter((image) => image !== url),
    );
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  async function onSubmit(value: ClinicalRecordFormData) {
    setLoading(true);

    if (record) {
      const response = await updateClinicalRecordAction({
        recordId: record.id,
        customerId,
        note: value.note,
        sessionDate: value.sessionDate,
        images: value.images,
      });
      setLoading(false);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success(response.data);
      handleCloseModal();
      router.refresh();
      return;
    }

    const response = await createClinicalRecordAction({
      customerId,
      note: value.note,
      sessionDate: value.sessionDate,
      images: value.images,
    });
    setLoading(false);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success(response.data);
    handleCloseModal();
    router.refresh();
  }

  function handleCloseModal() {
    form.reset();
    closeModal();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          {record ? "Editar anotação" : "Nova anotação"}
        </DialogTitle>
        <DialogDescription>
          {record
            ? "Atualize o registro dessa sessão."
            : "Registre o que aconteceu nessa sessão do paciente."}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="sessionDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data da sessão</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <DatePickerButton
                      date={new Date(field.value)}
                      onChange={(date) => field.onChange(date.toISOString())}
                    />
                    <span className="text-sm text-muted-foreground">
                      {new Date(field.value).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>O que aconteceu na sessão</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descreva a evolução, procedimentos e observações da sessão"
                    rows={6}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel>Imagens (opcional)</FormLabel>
            <div className="mt-2 flex flex-wrap gap-3">
              {images.map((url) => (
                <div
                  key={url}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(url)}
                    aria-label="Remover imagem"
                    className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES && (
                <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-secondary/40">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || deleting || uploading}
          >
            {loading
              ? "Salvando..."
              : record
                ? "Salvar alterações"
                : "Adicionar ao prontuário"}
          </Button>

          {record && onDelete && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={loading || deleting}
              onClick={handleDelete}
            >
              {deleting ? "Excluindo..." : "Excluir anotação"}
            </Button>
          )}
        </form>
      </Form>
    </>
  );
}
```

- [ ] **Step 3: Create the record item**

Create `src/app/(panel)/dashboard/patients/[id]/prontuario/_components/clinical-record-item.tsx`:

```tsx
"use client";

import Image from "next/image";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil } from "lucide-react";
import type { ClinicalRecordListItem } from "../_data-access/get-clinical-records";

interface ClinicalRecordItemProps {
  record: ClinicalRecordListItem;
  onEdit: (record: ClinicalRecordListItem) => void;
}

export function ClinicalRecordItem({ record, onEdit }: ClinicalRecordItemProps) {
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {format(record.sessionDate, "dd 'de' MMMM 'de' yyyy", {
              locale: ptBR,
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            Registrado por {record.authorName || "Membro da equipe"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEdit(record)}
          aria-label="Editar anotação"
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
        {record.note}
      </p>

      {record.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {record.images.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border"
            >
              <Image src={url} alt="" fill sizes="80px" className="object-cover" />
            </a>
          ))}
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 4: Create the record list (dialog trigger + list rendering)**

Create `src/app/(panel)/dashboard/patients/[id]/prontuario/_components/clinical-record-list.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClinicalRecordForm } from "./clinical-record-form";
import { ClinicalRecordItem } from "./clinical-record-item";
import { deleteClinicalRecordAction } from "../_actions/delete-clinical-record";
import type { ClinicalRecordListItem } from "../_data-access/get-clinical-records";
import type { ResultPermissionsProps } from "@/utils/permissions/canPermissions";

interface ClinicalRecordListProps {
  records: ClinicalRecordListItem[];
  customerId: string;
  organizationId: string;
  permissions: ResultPermissionsProps;
}

export function ClinicalRecordList({
  records,
  customerId,
  organizationId,
  permissions,
}: ClinicalRecordListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<ClinicalRecordListItem | null>(null);
  const router = useRouter();

  function handleEdit(record: ClinicalRecordListItem) {
    setEditingRecord(record);
    setIsDialogOpen(true);
  }

  async function handleDelete(record: ClinicalRecordListItem) {
    const response = await deleteClinicalRecordAction({
      recordId: record.id,
      customerId,
    });
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success(response.data);
    setIsDialogOpen(false);
    setEditingRecord(null);
    router.refresh();
  }

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setEditingRecord(null);
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {records.length === 0
            ? "Nenhuma anotação registrada"
            : `${records.length} ${records.length === 1 ? "anotação" : "anotações"}`}
        </p>

        {permissions.hasPermission && (
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova anotação
            </Button>
          </DialogTrigger>
        )}
      </div>

      <DialogContent
        onInteractOutside={(e) => {
          e.preventDefault();
          setIsDialogOpen(false);
          setEditingRecord(null);
        }}
      >
        <ClinicalRecordForm
          closeModal={() => {
            setIsDialogOpen(false);
            setEditingRecord(null);
          }}
          customerId={customerId}
          organizationId={organizationId}
          record={editingRecord}
          onDelete={
            editingRecord ? () => handleDelete(editingRecord) : undefined
          }
        />
      </DialogContent>

      {records.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-foreground">Nenhuma anotação ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Registre a primeira sessão desse paciente.
            </p>
          </div>
          {permissions.hasPermission && (
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Adicionar anotação
              </Button>
            </DialogTrigger>
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {records.map((record) => (
            <ClinicalRecordItem
              key={record.id}
              record={record}
              onEdit={handleEdit}
            />
          ))}
        </ul>
      )}
    </Dialog>
  );
}
```

- [ ] **Step 5: Create the page**

Create `src/app/(panel)/dashboard/patients/[id]/prontuario/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import getSession from "@/lib/getSession";
import { requireActiveOrganization } from "@/lib/organization";
import { canPermissions } from "@/utils/permissions/canPermissions";
import { LabelSubscription } from "@/components/ui/label-subscription";
import { getPatientSummary } from "./_data-access/get-patient-summary";
import { getClinicalRecords } from "./_data-access/get-clinical-records";
import { ClinicalRecordList } from "./_components/clinical-record-list";

export default async function PatientClinicalRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const organization = await requireActiveOrganization();
  const patient = await getPatientSummary({
    customerId: id,
    organizationId: organization.id,
  });
  if (!patient) {
    notFound();
  }

  const [records, permissions] = await Promise.all([
    getClinicalRecords({ customerId: id, organizationId: organization.id }),
    canPermissions({ type: "clinicalRecord" }),
  ]);

  return (
    <main className="space-y-4">
      <Link
        href="/dashboard/patients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para pacientes
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Prontuário de {patient.name || "paciente"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Histórico de sessões e anotações clínicas.
        </p>
      </div>

      {!permissions.hasPermission && (
        <LabelSubscription expired={permissions.expired} />
      )}

      <ClinicalRecordList
        records={records}
        customerId={patient.id}
        organizationId={organization.id}
        permissions={permissions}
      />
    </main>
  );
}
```

- [ ] **Step 6: Verify manually**

1. Run `npx tsc --noEmit` from `fisiopro/` — expected: no errors.
2. Run `npm run dev`. Open `npx prisma studio` in another terminal and copy the `id` of an existing `Customer` row that belongs to your logged-in organization.
3. Navigate to `http://localhost:3000/dashboard/patients/<that-id>/prontuario`.
   Expected: page renders with the patient's name in the heading, "Nenhuma anotação ainda", and a "Nova anotação"/"Adicionar anotação" button.
4. Click to add a new anotação: fill the note, pick a session date, submit with no images.
   Expected: success toast, dialog closes, the new record appears in the list with the chosen date and note.
5. Add another anotação, this time attaching 1–3 images (any small PNG/JPEG).
   Expected: thumbnails appear in the form as each uploads; after saving, the record shows the images as clickable thumbnails.
6. Try attaching a 4th image on a record already at 3.
   Expected: the upload slot disappears once 3 images are reached (no way to add a 4th from the UI).
7. Click a record to edit it (via the pencil icon), change the note, save.
   Expected: success toast, updated text shown in the list.
8. Open a record for edit and click "Excluir anotação".
   Expected: success toast, the record disappears from the list. In `npx prisma studio`, confirm the row still exists in `ClinicalRecord` with `deletedAt` set (not actually removed).
9. In the browser, edit the URL to use a `Customer` id from a different organization (or a random UUID).
   Expected: Next.js 404 page (`notFound()`).

---

### Task 5: Link to the prontuário from the patient sheet

**Files:**
- Modify: `src/app/(panel)/dashboard/patients/_components/patient-profile-sheet.tsx`

**Interfaces:**
- Consumes: route from Task 4 (`/dashboard/patients/[id]/prontuario`).

- [ ] **Step 1: Add the "Ver prontuário completo" link to the sheet footer**

In `src/app/(panel)/dashboard/patients/_components/patient-profile-sheet.tsx`, change:

```tsx
            <SheetFooter className="border-t border-border p-5">
              <Button asChild size="lg" className="w-full">
                <Link href={`/clinica/${organizationId}`} target="_blank">
                  Agendar novo atendimento
                </Link>
              </Button>
            </SheetFooter>
```

to:

```tsx
            <SheetFooter className="border-t border-border p-5">
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link href={`/dashboard/patients/${patient.id}/prontuario`}>
                  Ver prontuário completo
                </Link>
              </Button>
              <Button asChild size="lg" className="w-full">
                <Link href={`/clinica/${organizationId}`} target="_blank">
                  Agendar novo atendimento
                </Link>
              </Button>
            </SheetFooter>
```

- [ ] **Step 2: Verify manually**

1. Run `npm run dev`, open `/dashboard/patients`, click a patient row to open the sheet.
   Expected: footer now shows two stacked buttons — "Ver prontuário completo" (outline) above "Agendar novo atendimento" (solid).
2. Click "Ver prontuário completo".
   Expected: navigates to `/dashboard/patients/<id>/prontuario` for that same patient, page loads correctly.
3. Go back, open the sheet again, click "Agendar novo atendimento".
   Expected: still opens `/clinica/<organizationId>` in a new tab, unchanged from before.

---

## Self-Review Notes

- **Spec coverage:** data model + soft delete (Task 1), access control with no role distinction (all tasks — no role checks added anywhere) + plan-limit enforcement including the note about not replicating `canCreateService`'s coupling bug (Task 2), avulso records with optional unused `appointmentId` (Task 1 schema, never referenced by any UI/action), image upload via the existing Cloudinary endpoint with a 3-image cap (Task 4 Step 2), routes/UI structure with a dedicated page plus a sheet link (Tasks 4–5), error handling matching the existing `{ data } | { error }` convention (Task 3 actions) — every spec section maps to a task.
- **Placeholder scan:** no TBD/TODO; every step has complete, runnable code or an exact before/after diff for existing files.
- **Type consistency checked:** `ClinicalRecordListItem` (Task 3) has fields `id, note, sessionDate: Date, images: string[], authorName: string | null, createdAt, updatedAt` and is imported with that exact shape in Task 4's form/item/list components (`record.note`, `record.sessionDate`, `record.images`, `record.authorName`, `record.id`). `PatientSummary` (Task 3) fields (`id, name, email, phone, image, treatmentStatus`) match how `page.tsx` (Task 4) uses `patient.name`/`patient.id`. `ResultPermissionsProps` (existing, extended in Task 2) is imported unchanged in Task 4's list component and page. Action input shapes (`createClinicalRecordAction`/`updateClinicalRecordAction`/`deleteClinicalRecordAction`, Task 3) match exactly what `clinical-record-form.tsx`/`clinical-record-list.tsx` (Task 4) pass in (`customerId`, `note`, `sessionDate` as ISO string, `images`, `recordId`).
