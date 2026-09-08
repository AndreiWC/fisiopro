# Unificação de identidade e login (clínica + paciente)

Data: 2026-09-08
Status: aprovado para virar plano de implementação

## Problema

O sistema hoje tem **dois pipelines de autenticação paralelos e incompatíveis**:

- **Clínica** loga via NextAuth v5 (Prisma Adapter) com Google/GitHub. Sessão vive nas
  tabelas padrão `Account`/`Session`, ligadas ao modelo `User` — que hoje representa,
  ao mesmo tempo, "a clínica" (tenant, dono de `Service`/`Customer`/`Subscription`) e
  "a pessoa que loga" (1 para 1).
- **Paciente** loga via um fluxo OAuth Google **reimplementado à mão**
  (`src/app/api/patient-auth/google/*`), com sessão num cookie assinado por HMAC
  próprio (`src/lib/patient-session.ts`, `src/lib/patient-google-oauth.ts`), ligada ao
  modelo `Patient` — que não tem nenhuma foreign key para `Customer` (o cadastro do
  paciente dentro de uma clínica) nem para `Appointments`. O vínculo entre eles é feito
  comparando a *string* de e-mail em runtime (`get-patient-stats.ts`,
  `find-my-appointments.ts`), sem integridade referencial.
- A página `/login` precisa checar as duas sessões separadamente (um "chooser" de
  sistema) porque são incompatíveis.

Isso é o sintoma de um problema estrutural: não existe hoje um conceito único de
"identidade que loga" — cada novo tipo de conta tende a ganhar seu próprio pipeline do
zero, em vez de reaproveitar um padrão. Este documento define esse padrão.

## Fora de escopo

- Ideias de produto/mercado (WhatsApp, pacotes de sessão, marketplace, etc.) — tratadas
  em um brainstorm separado, não fazem parte desta mudança estrutural.
- Preservação de dados existentes: o ambiente atual é de teste, com poucos dados. A
  migração de schema pode recriar as tabelas afetadas em vez de fazer backfill
  cuidadoso.
- Multi-tenant avançado (múltiplas organizações por profissional, troca de organização
  ativa na UI) — o schema já suporta (`Membership` é N:N), mas o fluxo de "trocar de
  clínica" na UI não é implementado agora; hoje um `User` só terá uma `Membership`.

## Decisões

1. **Identidade de paciente é global**, não por clínica: uma conta serve para agendar
   em qualquer clínica da plataforma, com histórico e dados pessoais únicos.
2. **Clínica (tenant) é separada da pessoa que loga**: uma `Organization` pode ter
   múltiplas contas vinculadas (`Membership`), com papel `OWNER` ou `STAFF`.
3. **Um único motor de autenticação** (NextAuth) para todo mundo — clínica e paciente
   usam o mesmo pipeline de login, divergindo depois por papel vinculado à conta, nunca
   por sistema de auth.
4. **Não existe mais agendamento "convidado"** — todo agendamento exige uma conta
   logada (Google ou código por e-mail). Isso garante que todo `Appointments` sempre
   tem um `Customer` vinculado a uma conta real, sem ambiguidade de e-mail solto.
5. Papéis dentro de uma clínica, por agora: `OWNER` (acesso total, faturamento, convida/
   remove gente) e `STAFF` (operacional — agenda, clientes, serviços — sem billing).

## Modelo de dados

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  phone         String?

  memberships    Membership[]
  patientProfile PatientProfile?
  customerLinks  Customer[]        // contas vinculadas como cliente de alguma clínica
  accounts       Account[]
  sessions       Session[]
  Authenticator  Authenticator[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum MembershipRole {
  OWNER
  STAFF
}

model Membership {
  id             String         @id @default(cuid())
  role           MembershipRole @default(OWNER)

  userId         String
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  organizationId String
  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)

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

model PatientProfile {
  id      String @id @default(cuid())

  userId  String @unique
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)

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
  organization   Organization   @relation(fields: [organizationId], references: [id])

  userId String?
  user   User?   @relation(fields: [userId], references: [id])

  appointments Appointments[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, email])
  @@unique([organizationId, cpf])
}

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
```

Mudanças principais em relação ao schema atual:

- `User` perde todos os campos/relações de tenant (vão para `Organization`), mas ganha
  `phone` — o `Patient` órfão de hoje tinha telefone pessoal, que não é um dado de
  clínica (`Organization` já tem seu próprio `phone` de contato do negócio). `image`
  também migra para `Organization`: hoje é `User.image` que aparece como logo/foto da
  clínica na página pública de agendamento — isso é claramente um dado do negócio, não
  do avatar pessoal de quem loga.
- `Patient` é removido; `PatientProfile` o substitui, agora com FK real para `User`.
- `Customer.userId` (que hoje aponta pra clínica) é renomeado para
  `Customer.organizationId`; ganha `Customer.userId` **novo**, opcional, apontando pra
  conta do paciente (nullable porque a clínica pode cadastrar um paciente antes dele
  nunca ter logado — quando ele loga com e-mail correspondente, o vínculo é preenchido).
- `Service`, `Subscription`, `Reminder` trocam `userId` → `organizationId`.
- `Customer.cpf` deixa de ser único globalmente e passa a ser único por organização
  (`@@unique([organizationId, cpf])`, no mesmo padrão do e-mail). É necessário porque,
  com identidade global do paciente, a mesma pessoa passa a ter um `Customer` em cada
  clínica onde agenda — exigir CPF único no sistema todo impediria isso. A unicidade
  "de verdade" (uma pessoa = um CPF) já é garantida em `PatientProfile.cpf`.
- `Appointments` perde os campos soltos `name`/`email`/`phone` (viviam ali só porque
  agendamento convidado não tinha `Customer` garantido) e `customerId` deixa de ser
  opcional.
- `Segment` continua igual, só muda de dono (`User` → `Organization`).

## Fluxo de login e roteamento

- **Providers do NextAuth:** Google OAuth (como já existe) + um Credentials provider
  novo que reaproveita o fluxo de código por e-mail via Resend que já existe hoje
  (usuário digita e-mail, recebe código de 6 dígitos, confirma) — a diferença é que a
  sessão resultante cai na tabela `Session` do NextAuth, não em um cookie HMAC próprio.
- **`/login` para de ser um chooser de sistema** — mostra os métodos de login (Google /
  código por e-mail) sem precisar saber de antemão se quem está entrando é clínica ou
  paciente.
- **Roteamento pós-login**, calculado a partir da conta (`User`) já autenticada:
  - Tem `Membership` → `/dashboard` (se houver mais de uma `Organization`, escolhe
    qual antes de entrar; hoje sempre haverá só uma).
  - Não tem `Membership`, mas tem `PatientProfile` (ou algum `Customer.userId`
    vinculado) → `/perfil`.
  - Conta nova, sem nenhum dos dois (primeiro login, sem contexto) → tela única
    "Quero agendar como paciente" vs "Quero cadastrar minha clínica", que cria o
    `PatientProfile` ou a `Organization` + `Membership(OWNER)` correspondente.
- Isso elimina o `if` especial que hoje existe no callback do Google
  (`patient-auth/google/callback/route.ts`, linhas 66-88) que checava manualmente se o
  e-mail já era de uma clínica para redirecionar — passa a ser a mesma lógica de
  roteamento por papel, e passa a funcionar nos dois sentidos (uma conta pode
  futuramente ter `Membership` E `PatientProfile`).

## Impacto no código existente

Esse é o item de maior esforço da mudança. Hoje `session.user.id` é usado como
identificador de tenant em **45 arquivos** (`_data-access`, `_actions`,
`src/utils/permissions/**`, `src/utils/manage-subscription.ts`, o webhook do Stripe, o
upload de imagem, e a rota pública `/clinica/[id]`, onde `[id]` é hoje o `User.id`).

Para não fazer essa troca manualmente arquivo por arquivo sem padrão:

1. Criar `getActiveOrganization()` em `src/lib/` (mesmo formato de
   `getSession()`/`auth()` hoje) — resolve `session` → `User` → `Membership` →
   `Organization` ativa, lançando/retornando erro claro se não houver nenhuma.
2. Substituir mecanicamente, nos 45 arquivos listados, o uso de `session.user.id` como
   filtro de tenant por `organization.id` vindo de `getActiveOrganization()`. Arquivos
   que usam `session.user.id` para outra coisa (ex.: e-mail do usuário exibido no
   perfil) não mudam.
3. `/clinica/[id]` passa a receber `Organization.id` na URL em vez de `User.id`. Como
   não há dados de produção, links antigos podem quebrar sem problema.
4. Remover: `src/lib/patient-session.ts`, `src/lib/patient-google-oauth.ts`,
   `src/app/api/patient-auth/**`, o modelo `Patient`, e os componentes
   `login-chooser`/`patient-login-gate` atuais — substituídos pelo fluxo único descrito
   acima. (Nota: há um refactor de UI não relacionado em andamento nesses mesmos
   componentes de login/sidebar/profile, ainda não commitado — o plano de
   implementação precisa considerar esse estado local antes de remover/reescrever
   esses arquivos.)
5. `src/lib/auth.ts` ganha o Credentials provider de código por e-mail e a lógica de
   callback de roteamento pós-login.

## Migração de schema

Sem dados de produção a preservar: a migração do Prisma (`prisma migrate dev`) recria
diretamente as tabelas afetadas (`User` simplificado, novas `Organization`/
`Membership`/`PatientProfile`, `Customer`/`Service`/`Subscription`/`Reminder`/
`Appointments` com `organizationId`), sem necessidade de script de backfill.

## Testes / verificação

Não há suíte de testes configurada no projeto (confirmado no `CLAUDE.md`). Verificação
será manual, cobrindo pelo menos:

- Login de clínica nova (Google) → cai na tela de escolha → cria `Organization` →
  `/dashboard`.
- Login de paciente novo (Google e código por e-mail) → cai na tela de escolha → cria
  `PatientProfile` → `/perfil`.
- Mesmo e-mail usado depois em outra clínica como paciente → mesma conta, ganha
  `Customer.userId` vinculado automaticamente, aparece em `/perfil` com histórico
  daquela clínica também.
- Fluxo de agendamento público (`/clinica/[id]`) exige login antes de confirmar,
  sempre resulta em `Appointments.customerId` preenchido.
- Permissões de plano (`canPermissions`, `checkSubscripion`) continuam funcionando
  depois da troca de `userId` → `organizationId`.
