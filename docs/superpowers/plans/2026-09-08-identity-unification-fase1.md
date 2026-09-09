# Unificação de identidade e login — Fase 1 (motor de auth + área do paciente) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os dois pipelines de autenticação incompatíveis (NextAuth para
clínica, cookie HMAC caseiro para paciente) por um único motor NextAuth com um único
modelo de identidade (`User`), separando "quem loga" de "que papel exerce"
(`Membership` numa `Organization`, ou `PatientProfile`).

**Architecture:** `User` (NextAuth) deixa de ser o tenant e passa a ser só a conta que
loga. `Organization` (nova) é o tenant/clínica, ligado a `User` via `Membership`
(OWNER/STAFF). `PatientProfile` (nova) substitui o modelo `Patient` órfão, agora com FK
real para `User`. Login por Google/GitHub continua via NextAuth; login por código de
e-mail passa a ser um Credentials provider do próprio NextAuth (reaproveitando
`src/lib/resend.ts`), não mais um cookie assinado a parte.

**Tech Stack:** Next.js 15 (App Router) / React 19, NextAuth v5 (beta) + `@auth/prisma-adapter`, Prisma 6 / PostgreSQL, Zod, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-08-identity-unification-design.md`

## Global Constraints

- Identidade de paciente é global (uma conta serve para qualquer clínica), não por clínica.
- Um único motor de autenticação (NextAuth) para clínica e paciente — nunca dois pipelines.
- Não existe mais agendamento "convidado": todo agendamento exige conta logada (Google ou código por e-mail).
- Papéis dentro de uma clínica, por agora: `OWNER` e `STAFF` (schema já suporta múltiplas `Membership` por `User`, UI de troca de organização fica para depois).
- Sem dados de produção a preservar — a migração do Prisma pode recriar as tabelas afetadas em vez de fazer backfill.
- Não há suíte de testes configurada no projeto — a verificação de cada task é manual (dev server, `npx prisma studio`, requests/browser), não `pytest`/`jest`.
- Todo texto de UI é em português (pt-BR).

## Estado de partida (importante)

O working tree já tem mudanças **não commitadas** e não relacionadas a esta mudança de
identidade: um refactor visual de `sidebar.tsx`, `profile.tsx` (perfil da clínica no
dashboard), `services-list.tsx` e `services/page.tsx`. Essas tasks **não tocam** nesses
quatro arquivos — eles pertencem à Fase 2 (ver abaixo) e devem continuar como estão.

O working tree também já tem uma pequena reorganização em andamento de
`login-chooser.tsx` (movido para `src/app/(public)/_components/`) e um ajuste no
callback do Google (`api/patient-auth/google/callback/route.ts`, linhas 66-88, que já
checa se o e-mail é de uma clínica). As tasks abaixo partem desse estado atual — a Task
7 remove esse arquivo por completo, junto com o resto do `patient-auth` caseiro.

## Fora de escopo desta Fase 1 (vira Fase 2, plano separado)

O Task 1 troca `userId` → `organizationId` no schema do Prisma. Isso quebra a
compilação de ~40 arquivos em `(panel)/dashboard/**` e `src/utils/permissions/**` que
hoje leem `session.user.id` como id do tenant (dono da clínica) — ex.:
`get-all-services.ts`, `create-service.ts`, `canCreateService.ts`,
`manage-subscription.ts`, o webhook do Stripe, `get-info-schedule.ts` (rota pública
`/clinica/[id]`), etc. Essa é uma segunda leva de trabalho, mecânica mas grande (todo
arquivo listado no spec, seção "Impacto no código existente"), que fica para um plano
próprio ("Fase 2 — organizationId em todo o painel e API pública") gerado quando formos
executá-la. **Depois desta Fase 1, `npm run build` vai falhar até a Fase 2 ser
aplicada** — é esperado; não faça deploy nesse meio-tempo.

---

### Task 1: Schema do Prisma — User / Organization / Membership / PatientProfile

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migração gerada por `npx prisma migrate dev --name identity_unification`

**Interfaces:**
- Produces: modelos `User` (id, name, email, emailVerified, image, phone),
  `Organization` (id, name, image, address, phone, status, segment,
  professionalRegistration, timezone, times, stripe_customer_id), `Membership` (id,
  role: `OWNER`|`STAFF`, userId, organizationId, `@@unique([userId, organizationId])`),
  `PatientProfile` (id, userId único, cpf único, insuranceName, insuranceNumber,
  emergencyContactName, emergencyContactPhone). `Customer` ganha `organizationId`
  (era `userId`) e `userId` novo opcional; `cpf` deixa de ser `@unique` global e passa a
  `@@unique([organizationId, cpf])`. `Service`/`Subscription`/`Reminder` trocam
  `userId` → `organizationId`. `Appointments` troca `userId` → `organizationId`, perde
  `name`/`email`/`phone`, e `customerId` deixa de ser opcional. Modelo `Patient` é
  removido.

- [ ] **Step 1: Reescrever `prisma/schema.prisma`**

Substitua o conteúdo atual pelos modelos abaixo (mantém `Account`/`Session`/
`VerificationToken`/`Authenticator`/enums `AppointmentStatus`/`CustomerStatus`/`Plan`/
`Segment` exatamente como estão hoje — só os modelos de negócio mudam):

```prisma
model Appointments {
  id              String            @id @default(uuid())
  AppointmentDate DateTime
  time            String
  status          AppointmentStatus @default(CONFIRMED)

  serviceId String
  service   Service @relation(fields: [serviceId], references: [id])

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model PatientProfile {
  id String @id @default(cuid())

  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  cpf                   String? @unique
  insuranceName         String?
  insuranceNumber       String?
  emergencyContactName  String?
  emergencyContactPhone String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Customer {
  id              String         @id @default(uuid())
  name            String?
  email           String
  cpf             String?
  image           String?
  address         String?        @default("")
  phone           String?        @default("")
  status          Boolean        @default(true)
  treatmentStatus CustomerStatus @default(AGUARDANDO)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  userId String?
  user   User?   @relation(fields: [userId], references: [id])

  appointments Appointments[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, email])
  @@unique([organizationId, cpf])
}

enum AppointmentStatus {
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  NO_SHOW
  CANCELLED
}

enum CustomerStatus {
  AGUARDANDO
  EM_TRATAMENTO
  ALTA
}

model Reminder {
  id          String @id @default(uuid())
  description String

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
}

model Service {
  id        String   @id @default(uuid())
  name      String
  price     Int
  duration  Int
  status    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  appointments Appointments[]
}

enum Plan {
  BASIC
  PROFESSIONAL
}

enum Segment {
  BARBEARIA
  SALAO_BELEZA
  CLINICA_ESTETICA
  FISIOTERAPIA
  ODONTOLOGIA
  MEDICO
}

model Subscription {
  id      String @id @default(uuid())
  status  String
  plan    Plan
  priceId String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id])
}

enum MembershipRole {
  OWNER
  STAFF
}

model Membership {
  id   String         @id @default(cuid())
  role MembershipRole @default(OWNER)

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, organizationId])
}

model Organization {
  id                       String    @id @default(cuid())
  name                     String?
  image                    String?
  address                  String?   @default("")
  phone                    String?   @default("")
  status                   Boolean   @default(true)
  segment                  Segment?
  professionalRegistration String?
  timezone                 String?
  times                    String[]  @default([])
  stripe_customer_id       String?

  memberships  Membership[]
  subscription Subscription?
  services     Service[]
  reminders    Reminder[]
  customers    Customer[]
  appointments Appointments[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  phone         String?

  memberships    Membership[]
  patientProfile PatientProfile?
  customers      Customer[]
  accounts       Account[]
  sessions       Session[]
  Authenticator  Authenticator[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@id([identifier, token])
}

model Authenticator {
  credentialID         String  @unique
  userId               String
  providerAccountId    String
  credentialPublicKey  String
  counter              Int
  credentialDeviceType String
  credentialBackedUp   Boolean
  transports           String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, credentialID])
}
```

- [ ] **Step 2: Gerar e aplicar a migração**

Run: `cd fisiopro && npx prisma migrate dev --name identity_unification`

Expected: Prisma detecta a remoção do modelo `Patient`, a criação de `Organization`/
`Membership`/`PatientProfile`, e as renomeações de coluna. Como não há dados a
preservar (confirmado com o usuário), aceite os prompts de "reset" se o Prisma pedir
para recriar tabelas em vez de tentar inferir renomeação de coluna. A migração deve
terminar com `Your database is now in sync with your schema.`

- [ ] **Step 3: Confirmar o client gerado**

Run: `npx prisma generate`

Expected: sai sem erro; `node_modules/.prisma/client` passa a ter os tipos
`Organization`, `Membership`, `MembershipRole`, `PatientProfile` e `Customer.userId`/
`Customer.organizationId`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(schema): separa User (identidade) de Organization (tenant) via Membership; substitui Patient por PatientProfile"
```

---

### Task 2: Código de acesso por e-mail (`src/lib/patient-otp.ts`)

**Files:**
- Create: `src/lib/patient-otp.ts`

**Interfaces:**
- Consumes: `prisma` (`@/lib/prisma`), `getResendClient`/`EMAIL_FROM` (`@/lib/resend`).
- Produces: `requestLoginCode(email: string): Promise<void>` (lança erro se
  `RESEND_API_KEY` não estiver configurado), `verifyLoginCode(email: string, code: string): Promise<boolean>`.

- [ ] **Step 1: Criar `src/lib/patient-otp.ts`**

```ts
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getResendClient, EMAIL_FROM } from "@/lib/resend";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutos

function hashCode(email: string, code: string) {
  return crypto.createHash("sha256").update(`${email.toLowerCase()}.${code}`).digest("hex");
}

/** Gera um código de 6 dígitos, guarda o hash em VerificationToken e envia por e-mail via Resend. */
export async function requestLoginCode(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const code = crypto.randomInt(100000, 1000000).toString();

  await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token: hashCode(normalizedEmail, code),
      expires: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  const resend = getResendClient();
  if (!resend) {
    throw new Error("RESEND_API_KEY não configurado — não é possível enviar o código");
  }

  await resend.emails.send({
    from: EMAIL_FROM,
    to: normalizedEmail,
    subject: "Seu código de acesso à Encaixa",
    text: `Seu código de acesso é ${code}. Ele expira em 10 minutos.`,
  });
}

/** Confere o código contra o hash salvo; se válido, consome o token (não pode ser reusado). */
export async function verifyLoginCode(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: normalizedEmail },
  });

  if (!record || record.expires < new Date()) {
    return false;
  }

  const valid = record.token === hashCode(normalizedEmail, code);
  if (valid) {
    await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
  }
  return valid;
}
```

- [ ] **Step 2: Verificar manualmente**

Run (dentro de `fisiopro/`, com `DATABASE_URL` e `RESEND_API_KEY` configurados no
`.env`): abra `npx prisma studio`, e num terminal Node ad-hoc (`node -e` não roda TS
diretamente — em vez disso, adicione temporariamente um `console.log` de teste dentro
de uma server action já existente, ou pule esta verificação isolada e confirme o fluxo
completo no Step de verificação da Task 6, que exercita `requestLoginCode`/
`verifyLoginCode` de ponta a ponta pelo formulário de login). Não crie script de teste
solto — este projeto não tem test runner configurado.

- [ ] **Step 3: Commit**

```bash
git add src/lib/patient-otp.ts
git commit -m "feat(auth): adiciona geração e verificação de código de login por e-mail"
```

---

### Task 3: NextAuth com Credentials provider (`src/lib/auth.ts`)

**Files:**
- Modify: `src/lib/auth.ts`

**Interfaces:**
- Consumes: `verifyLoginCode` (Task 2).
- Produces: `auth()`, `signIn()`, `signOut()`, `handlers` (inalterados na assinatura,
  já usados em 45+ arquivos) — mas agora `session.user.id` vem de sessão **JWT**, não
  mais de sessão de banco.

- [ ] **Step 1: Reescrever `src/lib/auth.ts`**

```ts
import NextAuth from "next-auth";
import prisma from "./prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Adapter } from "next-auth/adapters";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { verifyLoginCode } from "./patient-otp";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  trustHost: true,
  // Credentials exige sessão JWT (não é compatível com o adapter de sessão em banco).
  session: { strategy: "jwt" },
  providers: [
    GitHub,
    Google({
      // Google verifica o e-mail (openid "email_verified") — seguro linkar contas
      // OAuth e de código por e-mail que compartilham o mesmo endereço.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: "email-code",
      name: "Código por e-mail",
      credentials: {
        email: { label: "E-mail", type: "email" },
        code: { label: "Código", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const code = credentials?.code;
        if (typeof email !== "string" || typeof code !== "string") return null;

        const valid = await verifyLoginCode(email, code);
        if (!valid) return null;

        const normalizedEmail = email.trim().toLowerCase();
        const user = await prisma.user.upsert({
          where: { email: normalizedEmail },
          create: { email: normalizedEmail, emailVerified: new Date() },
          update: { emailVerified: new Date() },
        });

        return user;
      },
    }),
  ],
  callbacks: {
    // Sessão em banco populava name/email/image automaticamente via adapter; em JWT
    // isso precisa ser copiado à mão para token e depois para a sessão.
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.email) session.user.email = token.email;
      if (token.name) session.user.name = token.name as string;
      if (token.picture) session.user.image = token.picture as string;
      return session;
    },
  },
});
```

- [ ] **Step 2: Verificar que `session.user.id` continua populado**

Run: `npm run dev` (dentro de `fisiopro/`), abra `/login` no navegador, clique em
"Continuar com Google" e complete o login.

Expected: sem erro no terminal do dev server; a sessão resultante ainda deve carregar
`session.user.id`, `session.user.email` e `session.user.name` — confirme abrindo
qualquer página que já chame `auth()` hoje (ex.: `/dashboard`, que vai dar erro
404/redirect por falta de `Membership` ainda, mas **não** deve dar erro de
`session.user.id` undefined). Se aparecer erro relacionado a `session.user.id`/`email`,
revise os callbacks `jwt`/`session` acima antes de continuar — é o ponto que 45+
arquivos do projeto dependem.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(auth): unifica login de clínica e paciente num único NextAuth (Google/GitHub + código por e-mail)"
```

---

### Task 4: Helpers de organização e perfil (`src/lib/organization.ts`)

**Files:**
- Create: `src/lib/organization.ts`

**Interfaces:**
- Consumes: `auth()` (Task 3), `prisma`.
- Produces: `getActiveOrganization(): Promise<Organization | null>`,
  `requireActiveOrganization(): Promise<Organization>`,
  `getActivePatientProfile(): Promise<PatientProfile | null>`.

- [ ] **Step 1: Criar `src/lib/organization.ts`**

```ts
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Organization, PatientProfile } from "@prisma/client";

/** Organização ativa da sessão atual (dono ou staff), ou null se não houver sessão/vínculo. */
export async function getActiveOrganization(): Promise<Organization | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  return membership?.organization ?? null;
}

/** Como getActiveOrganization(), mas lança se não houver organização vinculada. */
export async function requireActiveOrganization(): Promise<Organization> {
  const organization = await getActiveOrganization();
  if (!organization) {
    throw new Error("Nenhuma organização vinculada à sessão atual");
  }
  return organization;
}

/** Perfil de paciente vinculado à sessão atual, ou null. */
export async function getActivePatientProfile(): Promise<PatientProfile | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.patientProfile.findUnique({ where: { userId: session.user.id } });
}
```

- [ ] **Step 2: Verificar manualmente**

Esses helpers não têm consumidor ainda dentro desta task — passar `tsc` num arquivo
isolado com alias de path (`@/lib/...`) fora do projeto completo daria falsos erros de
resolução de módulo, então não vale a pena rodar isolado. A verificação real acontece
na Task 5, que é quem chama `getActiveOrganization`/`getActivePatientProfile` de
verdade — confira lá.

- [ ] **Step 3: Commit**

```bash
git add src/lib/organization.ts
git commit -m "feat(auth): adiciona helpers para resolver organização e perfil de paciente ativos"
```

---

### Task 5: Resolução de papel pós-login (`/login` + tela de escolha)

**Files:**
- Modify: `src/app/(public)/login/page.tsx`
- Create: `src/app/(public)/_actions/choose-role.ts`
- Create: `src/app/(public)/_components/role-chooser.tsx`

**Interfaces:**
- Consumes: `getActiveOrganization`, `getActivePatientProfile` (Task 4), `auth` (Task 3).
- Produces: server actions `chooseClinicRole(): Promise<never>` (sempre redireciona),
  `choosePatientRole(next?: string): Promise<never>` (sempre redireciona); componente
  `<RoleChooser next?: string />`.

- [ ] **Step 1: Criar `src/app/(public)/_actions/choose-role.ts`**

```ts
"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function chooseClinicRole() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const organization = await prisma.organization.create({ data: {} });
  await prisma.membership.create({
    data: { userId: session.user.id, organizationId: organization.id, role: "OWNER" },
  });

  redirect("/dashboard");
}

export async function choosePatientRole(next?: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  await prisma.patientProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });

  // Vincula retroativamente Customer rows que alguma clínica já cadastrou com esse
  // e-mail antes deste paciente ter criado conta (ex.: cadastro manual no dashboard).
  await prisma.customer.updateMany({
    where: {
      userId: null,
      email: { equals: session.user.email, mode: "insensitive" },
    },
    data: { userId: session.user.id },
  });

  redirect(next && next.startsWith("/") ? next : "/perfil");
}
```

- [ ] **Step 2: Criar `src/app/(public)/_components/role-chooser.tsx`**

```tsx
"use client";

import { Stethoscope, User } from "lucide-react";
import { chooseClinicRole, choosePatientRole } from "../_actions/choose-role";

export function RoleChooser({ next }: { next?: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground">Quase lá</h1>
      <p className="mt-1 text-sm text-muted-foreground">Como você vai usar a Encaixa?</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void chooseClinicRole()}
          className="group flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-secondary/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="font-semibold text-foreground">Quero cadastrar minha clínica</span>
          <span className="text-sm text-muted-foreground">
            Gerencie sua agenda, serviços e pacientes.
          </span>
        </button>
        <button
          type="button"
          onClick={() => void choosePatientRole(next)}
          className="group flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-secondary/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </span>
          <span className="font-semibold text-foreground">Quero agendar como paciente</span>
          <span className="text-sm text-muted-foreground">
            Veja seus agendamentos e edite seu perfil.
          </span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Reescrever `src/app/(public)/login/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveOrganization, getActivePatientProfile } from "@/lib/organization";
import { LoginChooser } from "../_components/login-chooser";
import { RoleChooser } from "../_components/role-chooser";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
        <LoginChooser next={next} />
      </main>
    );
  }

  const [organization, patientProfile] = await Promise.all([
    getActiveOrganization(),
    getActivePatientProfile(),
  ]);

  if (organization) {
    redirect("/dashboard");
  }
  if (patientProfile) {
    redirect(next && next.startsWith("/") ? next : "/perfil");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <RoleChooser next={next} />
    </main>
  );
}
```

Isso substitui a versão atual (que checava `getSession()` de clínica e
`getCurrentPatient()` separadamente — Task 7 vai limpar esse import antigo).

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`, abra `/login`, faça login com uma conta Google nova (que nunca
logou antes nesse ambiente).

Expected: cai na tela "Quase lá" com as duas opções. Clique em "Quero cadastrar minha
clínica" → deve criar `Organization`+`Membership` e redirecionar para `/dashboard`.
Abra `npx prisma studio` e confirme as linhas criadas em `Organization` e `Membership`.
Depois, faça logout, logue de novo com a mesma conta → deve ir direto para
`/dashboard` (sem mostrar a tela de escolha de novo).

Repita com uma segunda conta (outro e-mail), mas antes de logar, crie manualmente em
`npx prisma studio` uma linha em `Customer` com esse e-mail e `userId` vazio (simulando
uma clínica que já cadastrou essa pessoa antes dela ter conta — a tela de criação de
cliente do dashboard só volta a funcionar na Fase 2). Faça login com esse e-mail,
escolha "Quero agendar como paciente" e confirme em `prisma studio` que a linha de
`Customer` criada manualmente ganhou o `userId` da conta nova.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(public\)/login/page.tsx src/app/\(public\)/_actions/choose-role.ts src/app/\(public\)/_components/role-chooser.tsx
git commit -m "feat(auth): resolve papel (clínica/paciente) uma vez por conta, na primeira vez que loga"
```

---

### Task 6: Login unificado (Google/GitHub + código por e-mail)

**Files:**
- Modify: `src/app/(public)/_actions/login.tsx`
- Modify: `src/app/(public)/_components/login-chooser.tsx`
- Create: `src/app/(public)/_components/email-code-form.tsx`

**Interfaces:**
- Consumes: `signIn` (Task 3), `requestLoginCode`/`verifyLoginCode` via `signIn("email-code", ...)`.
- Produces: `handleRegister(provider: "google" | "github", next?: string)`,
  `sendLoginCode(email: string): Promise<{ data?: string; error?: string }>`,
  `confirmLoginCode(email: string, code: string, next?: string): Promise<{ error?: string } | void>`.

- [ ] **Step 1: Reescrever `src/app/(public)/_actions/login.tsx`**

```tsx
"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { requestLoginCode } from "@/lib/patient-otp";

type LoginType = "google" | "github";

function loginRedirect(next?: string) {
  return next && next.startsWith("/") ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

export async function handleRegister(provider: LoginType, next?: string) {
  await signIn(provider, { redirectTo: loginRedirect(next) });
}

export async function sendLoginCode(email: string) {
  try {
    await requestLoginCode(email);
    return { data: "Código enviado! Confira seu e-mail." };
  } catch {
    return { error: "Não foi possível enviar o código agora. Tente novamente." };
  }
}

export async function confirmLoginCode(email: string, code: string, next?: string) {
  try {
    await signIn("email-code", { email, code, redirect: false });
  } catch {
    return { error: "Código inválido ou expirado." };
  }
  // redirect() fora do try/catch: seu throw interno não pode ser tratado como erro.
  redirect(loginRedirect(next));
}
```

- [ ] **Step 2: Criar `src/app/(public)/_components/email-code-form.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { sendLoginCode, confirmLoginCode } from "../_actions/login";

export function EmailCodeForm({ next }: { next?: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await sendLoginCode(email);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("code");
  }

  async function handleConfirmCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await confirmLoginCode(email, code, next);
    if (result?.error) {
      setLoading(false);
      setError(result.error);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={handleSendCode} className="mt-2.5 flex flex-col gap-2.5">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          {loading ? "Enviando..." : "Enviar código por e-mail"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleConfirmCode} className="mt-2.5 flex flex-col gap-2.5">
      <p className="text-sm text-muted-foreground">Digite o código enviado para {email}</p>
      <input
        type="text"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="000000"
        className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-center text-lg tracking-widest outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Confirmando..." : "Confirmar código"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Reescrever `src/app/(public)/_components/login-chooser.tsx`**

```tsx
"use client";

import { Github, LogIn } from "lucide-react";
import { handleRegister } from "../_actions/login";
import { EmailCodeForm } from "./email-code-form";

interface LoginChooserProps {
  heading?: string;
  description?: string;
  next?: string;
}

export function LoginChooser({
  heading = "Entrar na Encaixa",
  description = "Como você quer entrar?",
  next,
}: LoginChooserProps) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground">{heading}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => void handleRegister("google", next)}
          className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <LogIn className="h-4 w-4" />
          Continuar com Google
        </button>
        <button
          type="button"
          onClick={() => void handleRegister("github", next)}
          className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <Github className="h-4 w-4" />
          Continuar com GitHub
        </button>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <p className="text-sm font-medium text-foreground">Ou entre com um código por e-mail</p>
        <EmailCodeForm next={next} />
      </div>
    </div>
  );
}
```

Isso remove por completo a divisão "Sou uma clínica" / "Sou paciente" — ambas usam os
mesmos botões, o papel é decidido depois do login (Task 5).

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`, abra `/login`, use "Enviar código por e-mail" com um e-mail de
teste que você controle. Confirme que o e-mail chega (via Resend) com um código de 6
dígitos, digite-o, confirme que loga e cai na tela de escolha de papel (Task 5) na
primeira vez. Escolha "Quero agendar como paciente" e confirme que termina em
`/perfil` (mesmo destino que o login por Google da Task 5 já valida) — essa é a outra
metade do cenário "paciente novo, por Google e por código" descrito no spec.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(public\)/_actions/login.tsx src/app/\(public\)/_components/login-chooser.tsx src/app/\(public\)/_components/email-code-form.tsx
git commit -m "feat(auth): unifica o login em um único chooser (Google/GitHub + código por e-mail)"
```

---

### Task 7: Remover o patient-auth caseiro

**Files:**
- Delete: `src/lib/patient-session.ts`
- Delete: `src/lib/patient-google-oauth.ts`
- Delete: `src/app/api/patient-auth/google/route.ts`
- Delete: `src/app/api/patient-auth/google/callback/route.ts`
- Delete: `src/app/(public)/_components/patient-login-form.tsx`
- Modify: `src/app/(public)/_actions/patient-auth.ts`
- Modify: `src/app/(public)/_components/patient-login-gate.tsx`

**Interfaces:**
- Consumes: `auth`/`signOut` (Task 3), `getActivePatientProfile` (Task 4).
- Produces: `getCurrentPatient(): Promise<CurrentPatient | null>` e
  `signOutPatient(): Promise<never>` — **mesma assinatura de nome/uso** que já existe
  hoje, para não obrigar mudança nos consumidores (`perfil/page.tsx`,
  `agendamentos/page.tsx`, `profile-content.tsx`). `CurrentPatient` é um tipo novo
  exportado (substitui o `Patient` do `@prisma/client` que a Task 8 vai deixar de
  importar).

- [ ] **Step 1: Apagar os arquivos do patient-auth caseiro**

Run:
```bash
rm src/lib/patient-session.ts src/lib/patient-google-oauth.ts
rm -r src/app/api/patient-auth
rm "src/app/(public)/_components/patient-login-form.tsx"
```

- [ ] **Step 2: Reescrever `src/app/(public)/_actions/patient-auth.ts`**

```ts
"use server";

import { auth, signOut } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type CurrentPatient = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  cpf: string | null;
  insuranceName: string | null;
  insuranceNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

export async function getCurrentPatient(): Promise<CurrentPatient | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [user, patientProfile] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.patientProfile.findUnique({ where: { userId: session.user.id } }),
  ]);

  if (!user || !patientProfile) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    cpf: patientProfile.cpf,
    insuranceName: patientProfile.insuranceName,
    insuranceNumber: patientProfile.insuranceNumber,
    emergencyContactName: patientProfile.emergencyContactName,
    emergencyContactPhone: patientProfile.emergencyContactPhone,
  };
}

export async function signOutPatient() {
  await signOut({ redirectTo: "/" });
}
```

- [ ] **Step 3: Atualizar `src/app/(public)/_components/patient-login-gate.tsx`**

```tsx
import { LoginChooser } from "./login-chooser";

interface PatientLoginGateProps {
  title: string;
  next?: string;
}

export function PatientLoginGate({ title, next }: PatientLoginGateProps) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <LoginChooser description={title} next={next} />
    </div>
  );
}
```

(só troca o nome da prop repassada — `patientNext` não existe mais no `LoginChooser`
desde a Task 6, agora é `next`.)

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`, apague os dados de sessão do navegador, abra `/perfil` — deve
mostrar o `LoginChooser` unificado. Faça login por código de e-mail com uma conta nova,
escolha "Quero agendar como paciente" — deve terminar em `/perfil` sem erro de tipo ou
de import quebrado (o arquivo ainda quebra em runtime nesta task porque `get-patient-stats.ts`
e `profile-content.tsx` só são corrigidos na Task 8 — confirme apenas que não há erro
de import/arquivo faltando).

- [ ] **Step 5: Commit**

```bash
git add -A src/lib src/app/api src/app/\(public\)/_actions/patient-auth.ts src/app/\(public\)/_components/patient-login-gate.tsx src/app/\(public\)/_components/patient-login-form.tsx
git commit -m "refactor(auth): remove o pipeline de autenticação caseiro do paciente, substituído pelo NextAuth unificado"
```

---

### Task 8: `/perfil` usando a identidade unificada

**Files:**
- Modify: `src/app/(public)/perfil/_data-access/get-patient-stats.ts`
- Modify: `src/app/(public)/perfil/_actions/update-patient-profile.ts`
- Modify: `src/app/(public)/perfil/_components/profile-content.tsx`
- Modify: `src/app/(public)/perfil/page.tsx`

**Interfaces:**
- Consumes: `CurrentPatient` (Task 7), `auth` (Task 3).
- Produces: `getPatientStats(userId: string)` (era `email: string`).

- [ ] **Step 1: Reescrever `get-patient-stats.ts`**

```ts
"use server";

import prisma from "@/lib/prisma";

export async function getPatientStats(userId: string) {
  const appointments = await prisma.appointments.findMany({
    where: { customer: { userId } },
    select: { status: true, organizationId: true, AppointmentDate: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessionsCompleted = appointments.filter((a) => a.status === "COMPLETED").length;
  const noShowCount = appointments.filter((a) => a.status === "NO_SHOW").length;
  const activeAppointments = appointments.filter(
    (a) =>
      (a.status === "CONFIRMED" || a.status === "IN_PROGRESS") &&
      a.AppointmentDate >= today,
  ).length;
  const activeClinics = new Set(appointments.map((a) => a.organizationId)).size;

  const attendanceDenominator = sessionsCompleted + noShowCount;
  const attendanceRate =
    attendanceDenominator > 0
      ? Math.round((sessionsCompleted / attendanceDenominator) * 100)
      : null;

  return { sessionsCompleted, activeAppointments, activeClinics, attendanceRate };
}
```

- [ ] **Step 2: Reescrever `update-patient-profile.ts`**

```ts
"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const formSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  insuranceName: z.string().optional(),
  insuranceNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

export async function updatePatientProfile(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: formData.name, phone: formData.phone || null },
    });

    await prisma.patientProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        cpf: formData.cpf || null,
        insuranceName: formData.insuranceName || null,
        insuranceNumber: formData.insuranceNumber || null,
        emergencyContactName: formData.emergencyContactName || null,
        emergencyContactPhone: formData.emergencyContactPhone || null,
      },
      update: {
        cpf: formData.cpf || null,
        insuranceName: formData.insuranceName || null,
        insuranceNumber: formData.insuranceNumber || null,
        emergencyContactName: formData.emergencyContactName || null,
        emergencyContactPhone: formData.emergencyContactPhone || null,
      },
    });

    revalidatePath("/perfil");
    return { data: "Perfil atualizado com sucesso!" };
  } catch (err: any) {
    if (err?.code === "P2002") {
      return { error: "Esse CPF já está cadastrado em outra conta." };
    }
    return { error: "Erro ao atualizar o perfil" };
  }
}
```

- [ ] **Step 3: Atualizar `profile-content.tsx`**

Troque o import `import type { Patient } from "@prisma/client";` por
`import type { CurrentPatient } from "../../_actions/patient-auth";`, e troque toda
ocorrência do tipo `Patient` na assinatura do componente por `CurrentPatient`:

```tsx
interface ProfileContentProps {
  patient: CurrentPatient;
  stats: PatientStats;
}
```

O resto do componente (`patient.name`, `patient.email`, `patient.cpf`, etc.) já usa os
mesmos nomes de campo que `CurrentPatient` expõe (Task 7) — nenhuma outra linha
muda.

- [ ] **Step 4: Atualizar `perfil/page.tsx`**

Troque a chamada `getPatientStats(patient.email)` por `getPatientStats(patient.id)`:

```tsx
const stats = patient
  ? await getPatientStats(patient.id)
  : { sessionsCompleted: 0, activeAppointments: 0, activeClinics: 0, attendanceRate: null };
```

- [ ] **Step 5: Verificar manualmente**

Run: `npm run dev`, logue como paciente (código de e-mail ou Google), abra `/perfil`.

Expected: mostra nome/e-mail, permite editar telefone/CPF/convênio/contato de
emergência, salva sem erro (`toast.success`). Os cards de estatística mostram zero em
tudo se ainda não há `Appointments` para esse paciente — esperado neste ambiente de
teste.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/perfil"
git commit -m "refactor(perfil): usa identidade unificada (User + PatientProfile) em vez do modelo Patient"
```

---

### Task 9: `/agendamentos` usando a identidade unificada

**Files:**
- Modify: `src/app/(public)/agendamentos/_actions/find-my-appointments.ts`
- Modify: `src/app/(public)/agendamentos/_actions/cancel-my-appointment.ts`
- Modify: `src/app/(public)/agendamentos/_actions/reschedule-my-appointment.ts`
- Modify: `src/app/(public)/agendamentos/_components/my-appointments-content.tsx`

**Interfaces:**
- Consumes: `auth` (Task 3).
- Produces: `findMyAppointments()` (sem parâmetro — usa a sessão), mesma assinatura de
  `cancelMyAppointment`/`rescheduleMyAppointment`.

- [ ] **Step 1: Reescrever `find-my-appointments.ts`**

```ts
"use server";

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";

export type MyAppointment = Prisma.AppointmentsGetPayload<{
  include: {
    service: true;
    organization: {
      select: {
        id: true;
        name: true;
        image: true;
        phone: true;
        times: true;
        timezone: true;
      };
    };
  };
}>;

export async function findMyAppointments() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  try {
    const appointments = await prisma.appointments.findMany({
      where: { customer: { userId: session.user.id } },
      include: {
        service: true,
        organization: {
          select: { id: true, name: true, image: true, phone: true, times: true, timezone: true },
        },
      },
      orderBy: { AppointmentDate: "asc" },
    });

    return { data: appointments };
  } catch {
    return { error: "Erro ao buscar seus agendamentos" };
  }
}
```

- [ ] **Step 2: Reescrever `cancel-my-appointment.ts`**

```ts
"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/lib/auth";

const formSchema = z.object({
  appointmentId: z.string().min(1, "O ID do agendamento é obrigatório"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function cancelMyAppointment(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  try {
    const appointment = await prisma.appointments.findUnique({
      where: { id: formData.appointmentId },
      select: { customer: { select: { userId: true } } },
    });

    if (!appointment || appointment.customer.userId !== session.user.id) {
      return { error: "Agendamento não encontrado para esta conta" };
    }

    await prisma.appointments.update({
      where: { id: formData.appointmentId },
      data: { status: "CANCELLED" },
    });

    return { data: "Agendamento cancelado com sucesso!" };
  } catch {
    return { error: "Erro ao cancelar agendamento" };
  }
}
```

- [ ] **Step 3: Reescrever `reschedule-my-appointment.ts`**

```ts
"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/lib/auth";

const formSchema = z.object({
  appointmentId: z.string().min(1, "O ID do agendamento é obrigatório"),
  date: z.date(),
  time: z.string().min(1, "O horário é obrigatório"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function rescheduleMyAppointment(formData: FormSchema) {
  const schema = formSchema.safeParse(formData);
  if (!schema.success) {
    return { error: schema.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  try {
    const appointment = await prisma.appointments.findUnique({
      where: { id: formData.appointmentId },
      select: { customer: { select: { userId: true } }, status: true },
    });

    if (!appointment || appointment.customer.userId !== session.user.id) {
      return { error: "Agendamento não encontrado para esta conta" };
    }

    if (appointment.status !== "CONFIRMED") {
      return { error: "Só é possível remarcar agendamentos confirmados" };
    }

    const year = formData.date.getFullYear();
    const month = formData.date.getMonth();
    const day = formData.date.getDate();
    const appointmentDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

    await prisma.appointments.update({
      where: { id: formData.appointmentId },
      data: { AppointmentDate: appointmentDate, time: formData.time },
    });

    return { data: "Agendamento remarcado com sucesso!" };
  } catch {
    return { error: "Erro ao remarcar agendamento" };
  }
}
```

- [ ] **Step 4: Atualizar `my-appointments-content.tsx`**

Esse componente lê hoje `appointment.user.phone`, `appointment.user.name`,
`appointment.user.id` (6 ocorrências, nas linhas ~170, 172, 195, 232, 273 e 279).
Substitua **todas** as ocorrências de `appointment.user` por `appointment.organization`
neste arquivo — é só o nome do campo que muda (`organization` no lugar de `user`), o
formato do objeto (`id`, `name`, `phone`) é o mesmo.

- [ ] **Step 5: Verificar manualmente**

Run: `npm run dev`, logue como o mesmo paciente usado na Task 8, abra `/agendamentos`.

Expected: lista vazia sem erro (ainda não há `Appointments` reais neste ambiente de
teste — isso só passa a ser exercitável de ponta a ponta depois da Fase 2, quando o
fluxo de criação de agendamento em `/clinica/[id]` também estiver usando
`Customer.userId`). O importante aqui é: sem erro de tipo, sem crash de runtime, sem
referência a `appointment.user` sobrando.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/agendamentos"
git commit -m "refactor(agendamentos): usa sessão unificada e Customer.userId em vez de comparação de e-mail"
```

---

## Depois desta Fase 1

O app fica com a área de autenticação, `/login`, `/perfil` e `/agendamentos`
funcionando de ponta a ponta no novo modelo. `npm run build` continua falhando até a
Fase 2 (renomear `userId` → `organizationId` nos ~40 arquivos do `(panel)/dashboard` e
da API que ainda escrevem contra os nomes antigos, listados na seção "Impacto no código
existente" do spec). Quando for hora de atacar isso, gere um plano novo
(`writing-plans`) especificamente para essa Fase 2 — ela é puramente mecânica
(renomear campo, sem mudança de lógica) mas grande o suficiente para merecer seu
próprio plano.

Uma peça de lógica (não só renomeação) que a Fase 2 precisa incluir: a Task 5 desta
Fase 1 vincula `Customer.userId` retroativamente só no momento em que a conta escolhe
o papel de paciente. O caminho inverso — uma conta que **já** é paciente sendo
cadastrada como `Customer` numa clínica nova (fluxo de agendamento público em
`/clinica/[id]`, ação `create-appointments.tsx`) — precisa, ao criar o `Customer`,
procurar um `User` com o mesmo e-mail e já preencher `userId` na criação. Sem isso, um
paciente que agenda numa clínica nova só ganha o vínculo se acontecer de escolher o
papel de paciente de novo (o que só ocorre uma vez por conta) — ou seja, ficaria sem
vínculo. Inclua essa busca por e-mail explicitamente no plano da Fase 2.
