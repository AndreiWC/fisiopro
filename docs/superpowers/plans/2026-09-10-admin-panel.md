# Área administrativa (super-admin) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a super-admin-only area (`/admin`) in the FisioPro app where the SaaS owner can see every clinic (`Organization`) and its subscription, drill into one clinic's details, suspend/reactivate it, and see analytics (MRR, subscription counts, growth, churn).

**Architecture:** New Next.js route group `src/app/(admin)/admin/`, protected per-request by an email-whitelist check (`ADMIN_EMAILS` env var) — no new auth mechanism, no schema migration. Data comes from existing Prisma models (`Organization`, `Subscription`, `Membership`) via new `_data-access` read functions and one `_actions` write (toggle organization status), following the `_data-access`/`_actions`/`_components` colocation convention already used under `(panel)/dashboard`.

**Tech Stack:** Next.js 15 (App Router, React 19, Server Components + Server Actions), Prisma 6 / PostgreSQL, NextAuth v5, Tailwind v4 + shadcn/ui ("new-york"), zod v4, `sonner` for toasts, `date-fns` v4 for dates, `recharts` (new dependency, added in Task 5) for charts.

**Spec:** `docs/superpowers/specs/2026-09-10-admin-panel-design.md`

## Global Constraints

- All user-facing strings are pt-BR, matching the rest of the app.
- No Prisma migration in this plan — everything reuses existing fields (`Organization.status`, `Organization.stripe_customer_id`, `Subscription.plan/status/priceId`, `src/utils/plans` pricing).
- Access control is a single mechanism: `ADMIN_EMAILS` env var (comma-separated emails) checked against `session.user.email`. No roles table, no second login flow.
- This project has **no test runner configured** (see `fisiopro/CLAUDE.md`) — every task's "verify" step is manual: `npm run dev` + browser + (when relevant) `npx prisma studio` to inspect data. Do not introduce a test framework as part of this plan.
- Do **not** run `git commit` (or `git add`/push) at the end of tasks — the user commits manually. Leave finished work in the working tree.
- Follow the existing per-request auth pattern: no `middleware.ts`; guards run inside `layout.tsx`/pages/actions.
- Next.js 15 dynamic route params are async: `params: Promise<{ id: string }>`, then `const { id } = await params;` (see `src/app/(public)/clinica/[id]/page.tsx`).
- Path alias `@/*` → `src/*`.

---

### Task 1: Admin access guard + route shell

**Files:**
- Create: `src/lib/require-admin.ts`
- Create: `src/app/(admin)/admin/layout.tsx`
- Create: `src/app/(admin)/admin/_components/admin-sidebar.tsx`
- Create: `src/app/(admin)/admin/page.tsx`
- Modify: `fisiopro/.env` (local only, not committed — add `ADMIN_EMAILS`)
- Modify: `fisiopro/CLAUDE.md` (document the new route group + env var)

**Interfaces:**
- Produces: `isAdminEmail(email: string | null | undefined): boolean` and `requireAdminSession(): Promise<Session>` from `src/lib/require-admin.ts` — every later task's pages/actions import one of these two.

- [ ] **Step 1: Create the admin-email whitelist helper**

Create `src/lib/require-admin.ts`:

```ts
import { redirect } from "next/navigation";
import getSession from "@/lib/getSession";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/** Usado em páginas/layouts do (admin): redireciona para "/" se a sessão não for de um admin. */
export async function requireAdminSession() {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    redirect("/");
  }
  return session;
}
```

- [ ] **Step 2: Add your login e-mail to the whitelist locally**

Open `fisiopro/.env` and add a line (replace with the e-mail you actually use to log in via Google/GitHub):

```
ADMIN_EMAILS="seu-email-de-login@exemplo.com"
```

For multiple admins later, comma-separate: `ADMIN_EMAILS="a@x.com,b@y.com"`.

- [ ] **Step 3: Create the admin sidebar**

Create `src/app/(admin)/admin/_components/admin-sidebar.tsx`:

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import clsx from "clsx";
import { Building2, LayoutDashboard, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/empresas", label: "Empresas", icon: Building2 },
] as const;

export function AdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="fixed hidden h-full w-64 flex-col border-r border-border bg-background p-4 md:flex">
        <div className="mb-6 mt-4">
          <Link href="/admin">
            <Logo />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <span className="mt-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Administração
          </span>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col md:ml-64">
        <main className="flex-1 px-4 py-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the admin layout (single guard for every /admin page)**

Create `src/app/(admin)/admin/layout.tsx`:

```tsx
import { requireAdminSession } from "@/lib/require-admin";
import { AdminSidebar } from "./_components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return <AdminSidebar>{children}</AdminSidebar>;
}
```

This mirrors `src/app/(panel)/dashboard/layout.tsx`, which does its own single redirect check in the layout rather than in every page.

- [ ] **Step 5: Create a minimal admin home page**

Create `src/app/(admin)/admin/page.tsx`:

```tsx
export default function AdminHomePage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Painel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão geral das empresas e assinaturas do FisioPro.
        </p>
      </div>
    </main>
  );
}
```

(Task 4 and Task 5 will extend this same file with KPI cards and charts.)

- [ ] **Step 6: Document the new route group and env var**

In `fisiopro/CLAUDE.md`, update the "Route groups" bullet list (currently listing `(panel)/dashboard`, `(public)`, `api`) to add:

```
- `(admin)/admin` — super-admin-only area (companies, subscriptions, analytics). Access is a static e-mail whitelist (`ADMIN_EMAILS` env var), checked by `requireAdminSession()`/`isAdminEmail()` in `src/lib/require-admin.ts` — not a role stored in the database.
```

And in the "Environment" section's variable list, add `ADMIN_EMAILS` (comma-separated list of e-mails allowed into `/admin`) to the "Optional" vars.

- [ ] **Step 7: Verify manually**

1. Run `npm run dev` from `fisiopro/`.
2. Log in with the e-mail you put in `ADMIN_EMAILS`. Navigate to `http://localhost:3000/admin`.
   Expected: sidebar with "Dashboard"/"Empresas" links, heading "Painel administrativo".
3. Log out, log in with a different e-mail (or temporarily remove yours from `ADMIN_EMAILS` and restart `npm run dev`), navigate to `/admin` again.
   Expected: redirected to `/`.
4. Restore your e-mail in `ADMIN_EMAILS` before continuing.

---

### Task 2: Companies list (`/admin/empresas`)

**Files:**
- Create: `src/app/(admin)/admin/_lib/subscription-status.ts`
- Create: `src/app/(admin)/admin/empresas/_data-access/get-organizations.ts`
- Create: `src/app/(admin)/admin/empresas/_components/empresas-list.tsx`
- Create: `src/app/(admin)/admin/empresas/page.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 directly (the layout guard already protects this route).
- Produces: `subscriptionStatusMeta(status: string | null): { label: string; className: string }` from `_lib/subscription-status.ts` — reused by Task 5's charts. `OrganizationListItem` type and `getOrganizations()` from `get-organizations.ts`.

- [ ] **Step 1: Create the shared subscription-status label helper**

Create `src/app/(admin)/admin/_lib/subscription-status.ts`:

```ts
const SUBSCRIPTION_STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: "Ativa", className: "bg-primary/10 text-primary" },
  trialing: { label: "Em teste", className: "bg-accent text-accent-foreground" },
  past_due: { label: "Pagamento atrasado", className: "bg-destructive/10 text-destructive" },
  canceled: { label: "Cancelada", className: "bg-secondary text-secondary-foreground" },
  unpaid: { label: "Não paga", className: "bg-destructive/10 text-destructive" },
  incomplete: { label: "Incompleta", className: "bg-secondary text-secondary-foreground" },
  incomplete_expired: { label: "Expirada", className: "bg-secondary text-secondary-foreground" },
  paused: { label: "Pausada", className: "bg-secondary text-secondary-foreground" },
};

export function subscriptionStatusMeta(status: string | null | undefined) {
  if (!status) {
    return { label: "Sem assinatura", className: "bg-muted text-muted-foreground" };
  }
  return (
    SUBSCRIPTION_STATUS_META[status] ?? {
      label: status,
      className: "bg-muted text-muted-foreground",
    }
  );
}
```

- [ ] **Step 2: Create the organizations list query**

Create `src/app/(admin)/admin/empresas/_data-access/get-organizations.ts`:

```ts
"use server";

import prisma from "@/lib/prisma";

export async function getOrganizations() {
  const organizations = await prisma.organization.findMany({
    include: { subscription: true },
    orderBy: { createdAt: "desc" },
  });

  return organizations.map((org) => ({
    id: org.id,
    name: org.name,
    segment: org.segment,
    status: org.status,
    createdAt: org.createdAt,
    plan: org.subscription?.plan ?? null,
    subscriptionStatus: org.subscription?.status ?? null,
  }));
}

export type OrganizationListItem = Awaited<ReturnType<typeof getOrganizations>>[number];
```

- [ ] **Step 3: Create the list component (search + filters)**

Create `src/app/(admin)/admin/empresas/_components/empresas-list.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, Search } from "lucide-react";
import type { Plan } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { segmentLabel } from "@/utils/segments";
import { subscriptionStatusMeta } from "../../_lib/subscription-status";
import type { OrganizationListItem } from "../_data-access/get-organizations";

interface EmpresasListProps {
  organizations: OrganizationListItem[];
}

type PlanFilter = "TODOS" | Plan | "SEM_ASSINATURA";
type CompanyStatusFilter = "TODAS" | "ATIVAS" | "SUSPENSAS";

const PLAN_LABEL: Record<Plan, string> = {
  BASIC: "Básico",
  PROFESSIONAL: "Profissional",
};

const SUBSCRIPTION_STATUS_FILTER_OPTIONS = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;

export function EmpresasList({ organizations }: EmpresasListProps) {
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("TODOS");
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<string>("TODOS");
  const [companyStatusFilter, setCompanyStatusFilter] = useState<CompanyStatusFilter>("TODAS");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return organizations.filter((org) => {
      if (q && !(org.name ?? "").toLowerCase().includes(q)) return false;

      if (planFilter === "SEM_ASSINATURA" && org.plan !== null) return false;
      if (planFilter !== "TODOS" && planFilter !== "SEM_ASSINATURA" && org.plan !== planFilter) {
        return false;
      }

      if (subscriptionStatusFilter !== "TODOS" && org.subscriptionStatus !== subscriptionStatusFilter) {
        return false;
      }

      if (companyStatusFilter === "ATIVAS" && !org.status) return false;
      if (companyStatusFilter === "SUSPENSAS" && org.status) return false;

      return true;
    });
  }, [organizations, query, planFilter, subscriptionStatusFilter, companyStatusFilter]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Buscar empresa por nome"
          className="h-10 w-full rounded-md border border-input bg-transparent pr-3 pl-9 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={planFilter} onValueChange={(value) => setPlanFilter(value as PlanFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os planos</SelectItem>
            <SelectItem value="BASIC">Básico</SelectItem>
            <SelectItem value="PROFESSIONAL">Profissional</SelectItem>
            <SelectItem value="SEM_ASSINATURA">Sem assinatura</SelectItem>
          </SelectContent>
        </Select>

        <Select value={subscriptionStatusFilter} onValueChange={setSubscriptionStatusFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Status da assinatura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os status</SelectItem>
            {SUBSCRIPTION_STATUS_FILTER_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {subscriptionStatusMeta(status).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {(["TODAS", "ATIVAS", "SUSPENSAS"] as const).map((value) => {
            const label = value === "TODAS" ? "Todas" : value === "ATIVAS" ? "Ativas" : "Suspensas";
            const isActive = companyStatusFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCompanyStatusFilter(value)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-secondary",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-foreground">
            {organizations.length === 0 ? "Nenhuma empresa ainda" : "Nenhuma empresa encontrada"}
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {organizations.length === 0
              ? "As empresas aparecem aqui assim que alguém se cadastrar no FisioPro."
              : "Ajuste a busca ou os filtros para ver outras empresas."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {filtered.map((org) => {
            const statusMeta = subscriptionStatusMeta(org.subscriptionStatus);
            return (
              <li key={org.id}>
                <Link
                  href={`/admin/empresas/${org.id}`}
                  className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-secondary sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{org.name || "Sem nome"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {segmentLabel(org.segment) ?? "Sem segmento"} · Criada em{" "}
                      {format(org.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {org.plan ? PLAN_LABEL[org.plan] : "Sem plano"}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusMeta.className)}>
                      {statusMeta.label}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        org.status ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {org.status ? "Ativa" : "Suspensa"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create the page**

Create `src/app/(admin)/admin/empresas/page.tsx`:

```tsx
import { getOrganizations } from "./_data-access/get-organizations";
import { EmpresasList } from "./_components/empresas-list";

export default async function AdminEmpresasPage() {
  const organizations = await getOrganizations();

  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Empresas
        </h1>
        <p className="text-sm text-muted-foreground">
          Todas as empresas cadastradas no FisioPro e suas assinaturas.
        </p>
      </div>

      <EmpresasList organizations={organizations} />
    </main>
  );
}
```

- [ ] **Step 5: Verify manually**

1. Run `npm run dev`, log in as an admin, go to `/admin/empresas`.
   Expected: one row per existing `Organization` in the database, with plan/status badges.
2. Open `npx prisma studio` in another terminal, change one `Subscription.status` value (e.g. to `past_due`), refresh `/admin/empresas`.
   Expected: the badge on that row updates to "Pagamento atrasado".
3. Try the search box, the plan `Select`, the subscription-status `Select`, and the Ativas/Suspensas pills — each should narrow the list correctly, including combinations of more than one filter at once.
4. Click a row — expected: navigates to `/admin/empresas/<id>` (will 404 until Task 3 adds that page; a 404 here is expected at this point in the plan).

---

### Task 3: Company detail (`/admin/empresas/[id]`) + suspend/reactivate action

**Files:**
- Create: `src/app/(admin)/admin/empresas/[id]/_data-access/get-organization-detail.ts`
- Create: `src/app/(admin)/admin/empresas/[id]/_actions/toggle-organization-status.ts`
- Create: `src/app/(admin)/admin/empresas/[id]/_components/organization-detail-view.tsx`
- Create: `src/app/(admin)/admin/empresas/[id]/page.tsx`

**Interfaces:**
- Consumes: `isAdminEmail` from `src/lib/require-admin.ts` (Task 1); `subscriptionPlans`/`PLANS` from `src/utils/plans` (existing); `segmentLabel` from `src/utils/segments` (existing).
- Produces: `OrganizationDetail` type and `getOrganizationDetail(organizationId: string)` from `get-organization-detail.ts`; `toggleOrganizationStatus(input: { organizationId: string; status: boolean }): Promise<{ data: string } | { error: string }>` from `toggle-organization-status.ts`.

- [ ] **Step 1: Create the organization detail query**

Create `src/app/(admin)/admin/empresas/[id]/_data-access/get-organization-detail.ts`:

```ts
"use server";

import prisma from "@/lib/prisma";
import { PLANS } from "@/utils/plans";

export async function getOrganizationDetail(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscription: true,
      memberships: { where: { role: "OWNER" }, include: { user: true } },
      _count: { select: { services: true, customers: true, appointments: true } },
    },
  });

  if (!organization) return null;

  const owner = organization.memberships[0]?.user ?? null;
  const plan = organization.subscription?.plan ?? null;

  return {
    id: organization.id,
    name: organization.name,
    segment: organization.segment,
    phone: organization.phone,
    address: organization.address,
    status: organization.status,
    stripeCustomerId: organization.stripe_customer_id,
    createdAt: organization.createdAt,
    owner: owner ? { name: owner.name, email: owner.email } : null,
    subscription: organization.subscription,
    usage: {
      services: organization._count.services,
      customers: organization._count.customers,
      appointments: organization._count.appointments,
    },
    limits: plan ? PLANS[plan] : null,
  };
}

export type OrganizationDetail = NonNullable<
  Awaited<ReturnType<typeof getOrganizationDetail>>
>;
```

- [ ] **Step 2: Create the suspend/reactivate action**

Create `src/app/(admin)/admin/empresas/[id]/_actions/toggle-organization-status.ts`:

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import getSession from "@/lib/getSession";
import { isAdminEmail } from "@/lib/require-admin";

const formSchema = z.object({
  organizationId: z.string().min(1),
  status: z.boolean(),
});

type FormSchema = z.infer<typeof formSchema>;

export async function toggleOrganizationStatus(formData: FormSchema) {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return { error: "Não autorizado" };
  }

  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: "Dados inválidos" };
  }

  try {
    await prisma.organization.update({
      where: { id: schema.data.organizationId },
      data: { status: schema.data.status },
    });
    revalidatePath("/admin/empresas");
    revalidatePath(`/admin/empresas/${schema.data.organizationId}`);
    return { data: "Status da empresa atualizado com sucesso" };
  } catch (error) {
    return { error: "Erro ao atualizar status da empresa" };
  }
}
```

- [ ] **Step 3: Create the detail view component**

Create `src/app/(admin)/admin/empresas/[id]/_components/organization-detail-view.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { segmentLabel } from "@/utils/segments";
import { subscriptionPlans } from "@/utils/plans";
import { subscriptionStatusMeta } from "../../../_lib/subscription-status";
import { toggleOrganizationStatus } from "../_actions/toggle-organization-status";
import type { OrganizationDetail } from "../_data-access/get-organization-detail";

interface OrganizationDetailViewProps {
  organization: OrganizationDetail;
}

const PLAN_LABEL = { BASIC: "Básico", PROFESSIONAL: "Profissional" } as const;

export function OrganizationDetailView({ organization }: OrganizationDetailViewProps) {
  const [status, setStatus] = useState(organization.status);
  const [isPending, startTransition] = useTransition();

  const subscription = organization.subscription;
  const planPrice = subscription
    ? subscriptionPlans.find((p) => p.id === subscription.plan)?.price
    : undefined;
  const statusMeta = subscriptionStatusMeta(subscription?.status ?? null);

  function handleToggleStatus() {
    const nextStatus = !status;
    startTransition(async () => {
      const response = await toggleOrganizationStatus({
        organizationId: organization.id,
        status: nextStatus,
      });
      if (response.error) {
        toast.error(response.error);
        return;
      }
      setStatus(nextStatus);
      toast.success(response.data);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {organization.name || "Sem nome"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {segmentLabel(organization.segment) ?? "Sem segmento"} · Criada em{" "}
            {format(organization.createdAt, "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button
          type="button"
          variant={status ? "destructive" : "default"}
          disabled={isPending}
          onClick={handleToggleStatus}
        >
          {status ? "Suspender empresa" : "Reativar empresa"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Dados cadastrais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Status: </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  status ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
                )}
              >
                {status ? "Ativa" : "Suspensa"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Telefone: </span>
              {organization.phone || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Endereço: </span>
              {organization.address || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Dono: </span>
              {organization.owner?.name ?? "—"}
              {organization.owner?.email ? ` (${organization.owner.email})` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {subscription ? (
              <>
                <p>
                  <span className="text-muted-foreground">Plano: </span>
                  {PLAN_LABEL[subscription.plan]}
                </p>
                <p>
                  <span className="text-muted-foreground">Status: </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusMeta.className)}>
                    {statusMeta.label}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Preço: </span>
                  {planPrice !== undefined
                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(planPrice)
                    : "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Atualizada em: </span>
                  {format(subscription.updatedAt, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Sem assinatura.</p>
            )}
            {organization.stripeCustomerId && (
              <a
                href={`https://dashboard.stripe.com/customers/${organization.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Ver no Stripe <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Serviços: </span>
              {organization.usage.services}
              {organization.limits ? ` / ${organization.limits.maxServices}` : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Clientes: </span>
              {organization.usage.customers}
              {organization.limits ? ` / ${organization.limits.maxCustomer}` : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Agendamentos: </span>
              {organization.usage.appointments}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the page**

Create `src/app/(admin)/admin/empresas/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getOrganizationDetail } from "./_data-access/get-organization-detail";
import { OrganizationDetailView } from "./_components/organization-detail-view";

export default async function AdminEmpresaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await getOrganizationDetail(id);

  if (!organization) {
    notFound();
  }

  return <OrganizationDetailView organization={organization} />;
}
```

- [ ] **Step 5: Verify manually**

1. From `/admin/empresas`, click a row with an active subscription.
   Expected: detail page shows cadastral data, subscription card (plan/status/price/updated date), usage counts vs. plan limits, and a "Ver no Stripe" link (only if `stripe_customer_id` is set on that organization).
2. Click "Suspender empresa".
   Expected: button flips to "Reativar empresa", a success toast appears, and `Organization.status` becomes `false` in `npx prisma studio`.
3. Go back to `/admin/empresas` — expected: that company now shows the "Suspensa" badge.
4. Click "Reativar empresa" on the detail page — expected: reverses correctly.
5. Visit `/admin/empresas/some-id-that-does-not-exist`.
   Expected: Next.js 404 page (`notFound()`).

---

### Task 4: Dashboard KPIs (`/admin`)

**Files:**
- Create: `src/app/(admin)/admin/_data-access/get-dashboard-metrics.ts`
- Create: `src/app/(admin)/admin/_components/admin-kpi-cards.tsx`
- Modify: `src/app/(admin)/admin/page.tsx`

**Interfaces:**
- Consumes: `subscriptionPlans` from `@/utils/plans` (existing).
- Produces: `DashboardMetrics` type and `getDashboardMetrics()` from `get-dashboard-metrics.ts` — Task 5 reuses `metrics.statusBreakdown`/`metrics.planBreakdown` for its charts.

- [ ] **Step 1: Create the metrics query**

Create `src/app/(admin)/admin/_data-access/get-dashboard-metrics.ts`:

```ts
"use server";

import prisma from "@/lib/prisma";
import { subscriptionPlans } from "@/utils/plans";
import type { Plan } from "@prisma/client";

function priceForPlan(plan: Plan): number {
  return subscriptionPlans.find((p) => p.id === plan)?.price ?? 0;
}

export async function getDashboardMetrics() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeSubscriptions,
    statusGroups,
    planGroups,
    totalOrganizations,
    newOrganizationsThisMonth,
    canceledThisMonth,
    activeAtStartOfMonth,
  ] = await Promise.all([
    prisma.subscription.findMany({ where: { status: "active" }, select: { plan: true } }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.subscription.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.organization.count(),
    prisma.organization.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.subscription.count({ where: { status: "canceled", updatedAt: { gte: startOfMonth } } }),
    prisma.subscription.count({
      where: {
        createdAt: { lt: startOfMonth },
        OR: [{ status: "active" }, { status: "canceled", updatedAt: { gte: startOfMonth } }],
      },
    }),
  ]);

  const mrr = activeSubscriptions.reduce((sum, sub) => sum + priceForPlan(sub.plan), 0);
  const churnRate = activeAtStartOfMonth > 0 ? canceledThisMonth / activeAtStartOfMonth : 0;

  return {
    mrr,
    totalOrganizations,
    activeSubscriptionsCount: activeSubscriptions.length,
    newOrganizationsThisMonth,
    churnRate,
    statusBreakdown: statusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
    })),
    planBreakdown: planGroups.map((group) => ({
      plan: group.plan,
      count: group._count._all,
    })),
  };
}

export type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;
```

- [ ] **Step 2: Create the KPI cards component**

Create `src/app/(admin)/admin/_components/admin-kpi-cards.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "../_data-access/get-dashboard-metrics";

interface AdminKpiCardsProps {
  metrics: DashboardMetrics;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
});

export function AdminKpiCards({ metrics }: AdminKpiCardsProps) {
  const cards = [
    { title: "MRR", value: currencyFormatter.format(metrics.mrr) },
    {
      title: "Empresas ativas / total",
      value: `${metrics.activeSubscriptionsCount} / ${metrics.totalOrganizations}`,
    },
    { title: "Novas este mês", value: String(metrics.newOrganizationsThisMonth) },
    { title: "Churn do mês", value: percentFormatter.format(metrics.churnRate) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold text-foreground">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire the KPI cards into the admin home page**

Modify `src/app/(admin)/admin/page.tsx` (replace the whole file):

```tsx
import { getDashboardMetrics } from "./_data-access/get-dashboard-metrics";
import { AdminKpiCards } from "./_components/admin-kpi-cards";

export default async function AdminHomePage() {
  const metrics = await getDashboardMetrics();

  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Painel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão geral das empresas e assinaturas do FisioPro.
        </p>
      </div>

      <AdminKpiCards metrics={metrics} />
    </main>
  );
}
```

- [ ] **Step 4: Verify manually**

1. Run `npm run dev`, log in as admin, open `/admin`.
   Expected: 4 KPI cards render with real numbers (MRR, active/total, new this month, churn).
2. Cross-check MRR by hand: in `npx prisma studio`, list all `Subscription` rows with `status = "active"`, sum the price of each plan (BASIC = 69.9, PROFESSIONAL = 99.9 per `src/utils/plans`), and confirm it matches the MRR card.
3. Toggle a subscription's `status` to `"canceled"` with `updatedAt` inside the current month (Prisma Studio lets you edit `updatedAt` directly, or just update the row now so `updatedAt` auto-refreshes) and confirm the churn % card changes on refresh.

---

### Task 5: Dashboard charts (growth + distribution)

**Files:**
- Modify: `fisiopro/package.json` (add `recharts`)
- Create: `src/app/(admin)/admin/_data-access/get-growth-series.ts`
- Create: `src/app/(admin)/admin/_components/growth-chart.tsx`
- Create: `src/app/(admin)/admin/_components/status-distribution-chart.tsx`
- Modify: `src/app/(admin)/admin/page.tsx`

**Interfaces:**
- Consumes: `DashboardMetrics.statusBreakdown` / `.planBreakdown` (Task 4); `subscriptionStatusMeta` from `_lib/subscription-status.ts` (Task 2).
- Produces: `GrowthSeriesPoint` type and `getGrowthSeries()` from `get-growth-series.ts`; `<GrowthChart data={...} />` and `<StatusDistributionChart title={...} data={...} />` components.

- [ ] **Step 1: Add the charting dependency**

Run from `fisiopro/`:

```bash
npm install recharts
```

- [ ] **Step 2: Create the growth series query**

Create `src/app/(admin)/admin/_data-access/get-growth-series.ts`:

```ts
"use server";

import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import prisma from "@/lib/prisma";
import { subscriptionPlans } from "@/utils/plans";
import type { Plan } from "@prisma/client";

function priceForPlan(plan: Plan): number {
  return subscriptionPlans.find((p) => p.id === plan)?.price ?? 0;
}

export async function getGrowthSeries() {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const reference = subMonths(now, 11 - index);
    return {
      label: format(reference, "MMM/yy", { locale: ptBR }),
      start: startOfMonth(reference),
      end: endOfMonth(reference),
    };
  });

  const [organizations, activeSubscriptions] = await Promise.all([
    prisma.organization.findMany({ select: { createdAt: true } }),
    prisma.subscription.findMany({ where: { status: "active" }, select: { plan: true, createdAt: true } }),
  ]);

  return months.map(({ label, start, end }) => {
    const newCompanies = organizations.filter(
      (org) => org.createdAt >= start && org.createdAt <= end,
    ).length;

    const mrr = activeSubscriptions
      .filter((sub) => sub.createdAt <= end)
      .reduce((sum, sub) => sum + priceForPlan(sub.plan), 0);

    return { month: label, newCompanies, mrr };
  });
}

export type GrowthSeriesPoint = Awaited<ReturnType<typeof getGrowthSeries>>[number];
```

- [ ] **Step 3: Create the growth line chart**

Create `src/app/(admin)/admin/_components/growth-chart.tsx`:

```tsx
"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GrowthSeriesPoint } from "../_data-access/get-growth-series";

interface GrowthChartProps {
  data: GrowthSeriesPoint[];
}

export function GrowthChart({ data }: GrowthChartProps) {
  return (
    <div className="h-72 w-full rounded-xl border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-medium text-foreground">Novas empresas e MRR (últimos 12 meses)</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line yAxisId="left" type="monotone" dataKey="newCompanies" name="Novas empresas" stroke="#6366f1" strokeWidth={2} />
          <Line yAxisId="right" type="monotone" dataKey="mrr" name="MRR (R$)" stroke="#10b981" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Create the reusable distribution bar chart**

Create `src/app/(admin)/admin/_components/status-distribution-chart.tsx`:

```tsx
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface StatusDistributionChartProps {
  title: string;
  data: { label: string; count: number }[];
}

export function StatusDistributionChart({ title, data }: StatusDistributionChartProps) {
  return (
    <div className="h-72 w-full rounded-xl border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-medium text-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 5: Wire both charts into the admin home page**

Modify `src/app/(admin)/admin/page.tsx` (replace the whole file):

```tsx
import { getDashboardMetrics } from "./_data-access/get-dashboard-metrics";
import { getGrowthSeries } from "./_data-access/get-growth-series";
import { AdminKpiCards } from "./_components/admin-kpi-cards";
import { GrowthChart } from "./_components/growth-chart";
import { StatusDistributionChart } from "./_components/status-distribution-chart";
import { subscriptionStatusMeta } from "./_lib/subscription-status";

const PLAN_LABEL = { BASIC: "Básico", PROFESSIONAL: "Profissional" } as const;

export default async function AdminHomePage() {
  const [metrics, growthSeries] = await Promise.all([
    getDashboardMetrics(),
    getGrowthSeries(),
  ]);

  const statusChartData = metrics.statusBreakdown.map((item) => ({
    label: subscriptionStatusMeta(item.status).label,
    count: item.count,
  }));

  const planChartData = metrics.planBreakdown.map((item) => ({
    label: PLAN_LABEL[item.plan],
    count: item.count,
  }));

  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Painel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão geral das empresas e assinaturas do FisioPro.
        </p>
      </div>

      <AdminKpiCards metrics={metrics} />

      <div className="grid gap-4 lg:grid-cols-2">
        <GrowthChart data={growthSeries} />
        <StatusDistributionChart title="Assinaturas por status" data={statusChartData} />
        <StatusDistributionChart title="Assinaturas por plano" data={planChartData} />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Verify manually**

1. Run `npm run dev`, log in as admin, open `/admin`.
   Expected: below the KPI cards, three charts render — a line chart (new companies + MRR over 12 months) and two bar charts (by subscription status, by plan).
2. Confirm the rightmost point of the line chart's "Novas empresas" series matches `newOrganizationsThisMonth` from the KPI card, and its MRR point matches the MRR KPI card.
3. Confirm the bar chart totals add up: sum of all bars in "Assinaturas por status" equals the total number of `Subscription` rows; sum of "Assinaturas por plano" equals the same total.
4. Resize the browser window narrower (or check on mobile width) — expected: charts stay inside their card, no horizontal overflow of the page.

---

## Self-Review Notes

- **Spec coverage:** access control (Task 1), companies list with filters (Task 2), company detail + suspend/reactivate + Stripe link (Task 3), KPI cards for MRR/subscriptions/growth/churn (Task 4), growth + distribution charts with the documented approximation (Task 5) — every spec section maps to a task.
- **Type consistency checked:** `OrganizationListItem` (Task 2) only used in Task 2. `OrganizationDetail` (Task 3) used only in Task 3. `DashboardMetrics` (Task 4) is consumed by Task 5's page wiring (`metrics.statusBreakdown`, `metrics.planBreakdown` — field names match between producer and consumer). `subscriptionStatusMeta` (Task 2) is imported unchanged in Task 3 and Task 5 with correct relative paths for each file's depth.
- **No placeholders:** every step has runnable code; verification steps are manual (documented in Global Constraints) because this project has no test runner.
