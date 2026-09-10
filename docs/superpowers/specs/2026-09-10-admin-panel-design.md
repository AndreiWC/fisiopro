# Área administrativa (super-admin) — Design

## Contexto e objetivo

O FisioPro é multi-tenant: cada `Organization` é uma clínica/empresa cliente, com sua própria `Subscription` (Stripe). Hoje não existe nenhuma visão cross-tenant — o dono do SaaS (Andre) não tem como ver, em um só lugar, quais empresas usam o produto, em que plano/status de assinatura estão, e como a receita evolui.

Este documento especifica uma área administrativa interna (`/admin`), visível apenas para o dono do SaaS, com:
1. Lista de empresas e suas assinaturas.
2. Detalhe de cada empresa (dados, assinatura, uso, ação de suspender/reativar).
3. Dashboard analítico com KPIs e gráficos de receita/crescimento/churn.

## Fora de escopo (v1)

- Editar plano ou cancelar assinatura pelo painel — segue sendo feito no Stripe Dashboard (o painel só linka para lá).
- Múltiplos administradores com papéis diferentes — é uma whitelist de e-mails, não um sistema de roles.
- Histórico exato de MRR/churn mês a mês — ver seção "Limitações conhecidas".
- Impersonar usuário/login-as.

## Controle de acesso

- Nova env var `ADMIN_EMAILS`: lista de e-mails separados por vírgula (ex: `ADMIN_EMAILS="andre@example.com"`), adicionada a `fisiopro/.env` e ao `CLAUDE.md` (seção Environment).
- Novo helper `src/lib/require-admin.ts`:
  - Chama `auth()` (o mesmo já usado em `@/lib/auth` / `@/lib/getSession`).
  - Se não houver sessão, ou `session.user.email` não estiver em `ADMIN_EMAILS`, faz `redirect("/")` (páginas) ou retorna `{ error: "Não autorizado" }` (actions/data-access chamadas de client components, se houver).
  - É chamado no topo de toda página, `_action` e `_data-access` sob `(admin)` — mesmo padrão per-request usado no resto do app (não há `middleware.ts`).
- Login continua sendo o NextAuth existente (Google/GitHub); não há um mecanismo de auth paralelo.

## Estrutura de rotas

Novo route group `src/app/(admin)/admin/`, com `layout.tsx` próprio (sidebar distinta da do `(panel)/dashboard`, sem os itens de clínica — só "Dashboard" e "Empresas"):

- `/admin` — dashboard analítico.
- `/admin/empresas` — lista de empresas/assinaturas.
- `/admin/empresas/[id]` — detalhe de uma empresa (`[id]` = `Organization.id`).

Cada segmento segue a convenção já usada no resto do app: `_data-access/` (leituras) e `_actions/` (mutations, `"use server"`) colocados junto da rota.

## Modelo de dados

Nenhuma migration é necessária. Tudo é construído em cima do schema existente:

- **Suspender/reativar empresa** → reaproveita `Organization.status` (`Boolean`, já existe).
- **Link para o Stripe** → reaproveita `Organization.stripe_customer_id`; a URL é montada como `https://dashboard.stripe.com/customers/{stripe_customer_id}`.
- **Preço por plano (para MRR)** → reaproveita `subscriptionPlans` em `src/utils/plans/index.tsx` (`price` de `BASIC`/`PROFESSIONAL`). Não é necessário chamar a API do Stripe para calcular receita — o valor local já reflete o preço cobrado.
- **Limites de uso (para o card de uso)** → reaproveita `PLANS.BASIC.maxServices/maxCustomer` e `PLANS.PROFESSIONAL.maxServices/maxCustomer`.

## Tela: Lista de empresas (`/admin/empresas`)

Tabela com uma linha por `Organization`:

| Coluna | Origem |
|---|---|
| Nome | `Organization.name` |
| Segmento | `Organization.segment` |
| Plano | `Subscription.plan` |
| Status da assinatura | `Subscription.status` |
| Status da empresa | `Organization.status` (ativa/suspensa) |
| Criada em | `Organization.createdAt` |

Filtros: por plano, por status de assinatura, por status da empresa, busca por nome (`ILIKE`). Paginação simples (offset/limit ou cursor, a critério da implementação). Clique na linha navega para `/admin/empresas/[id]`.

## Tela: Detalhe da empresa (`/admin/empresas/[id]`)

- **Dados cadastrais**: nome, segmento, telefone, endereço, e o(s) `Membership` com `role = OWNER` (nome/e-mail do dono).
- **Card de assinatura**: `plan`, `status`, `priceId`, preço (via `subscriptionPlans`), `createdAt`/`updatedAt` da `Subscription`, botão "Ver no Stripe" (usa `stripe_customer_id`; se nulo, botão desabilitado).
- **Card de uso**: contagem de `Service`, `Customer` e `Appointments` da organização, comparada com os limites do plano atual (`PLANS[plan].maxServices/maxCustomer`) — sinaliza visualmente quando está perto/no limite (proxy de engajamento e de risco de upgrade ou churn).
- **Ação**: botão de suspender/reativar, que chama a action `toggle-organization-status` e dá `revalidatePath` na própria página e na lista.

## Dashboard analítico (`/admin`)

**KPIs (cards no topo):**
- MRR atual: soma do preço do plano de cada `Subscription` com `status` ativo.
- Total de empresas, e quebra por status de assinatura (ativa/trial/cancelada/atrasada).
- Novas empresas no mês corrente (`Organization.createdAt` no mês atual).
- Taxa de churn no mês: assinaturas com `status` cancelado cujo `updatedAt` caiu no mês corrente, dividido pelas ativas no início do período (aproximado — ver limitações).

**Gráficos:**
- Evolução de novas empresas por mês (linha, últimos 12 meses) — exato, baseado em `createdAt`.
- Evolução aproximada de MRR por mês (linha) — soma do preço das assinaturas cuja `createdAt` é ≤ o mês em questão e que hoje ainda estão ativas (aproximação: não reflete cancelamentos/upgrades que aconteceram no meio do caminho).
- Distribuição de assinaturas por status (barra ou pizza) — snapshot atual, exato.
- Distribuição por plano (BASIC vs PROFESSIONAL) — snapshot atual, exato.

### Limitações conhecidas

O schema não guarda histórico de mudanças de `status`/`plan` de uma `Subscription` — só o estado atual mais `createdAt`/`updatedAt`. Por isso:
- Séries "por mês" de MRR e a taxa de churn são **aproximações**, calculadas a partir do estado atual e das datas existentes, não de um histórico real de eventos.
- Contagem de novas empresas por mês é a única série 100% exata (baseada em `Organization.createdAt`, que não muda).

Se os números aproximados de MRR/churn não forem confiáveis o suficiente na prática, a evolução natural é adicionar uma tabela `SubscriptionEvent` (populada a partir dos handlers já existentes em `api/webhook/route.ts` / `manage-subscription.ts`) para reconstruir o estado histórico com precisão. Isso fica fora do escopo desta v1 por decisão do usuário.

## Camada de dados

Seguindo a convenção `_data-access` (leitura) / `_actions` (escrita) colocada por rota:

- `src/app/(admin)/admin/_data-access/get-dashboard-metrics.ts` — agregações Prisma (`groupBy`, `count`, `aggregate`) que alimentam os KPIs e os gráficos do dashboard.
- `src/app/(admin)/admin/empresas/_data-access/get-organizations.ts` — lista paginada/filtrada de `Organization` + `Subscription` relacionada.
- `src/app/(admin)/admin/empresas/[id]/_data-access/get-organization-detail.ts` — uma `Organization` com `Subscription`, `Membership`s (para achar o OWNER) e contagens de `Service`/`Customer`/`Appointments`.
- `src/app/(admin)/admin/empresas/[id]/_actions/toggle-organization-status.ts` — `requireAdmin()` → `zod` valida o `organizationId` → atualiza `Organization.status` → `revalidatePath("/admin/empresas")` e `revalidatePath("/admin/empresas/[id]")`.

Nenhuma dessas queries filtra por tenant (`userId`/`organizationId` da sessão) — é justamente a visão cross-tenant —, mas todas passam por `requireAdmin()` antes de rodar.

## UI

Reaproveita shadcn/ui (`@/components/ui`), Tailwind v4 e o padrão de formulários (`react-hook-form` + zod) já usados no `(panel)/dashboard`. Gráficos: o projeto ainda não tem lib de charts instalada — adicionar `recharts`, que é a lib esperada pelos componentes de chart do shadcn/ui.

## Testes

O projeto não tem test runner configurado (ver `CLAUDE.md`). Validação será manual: rodar `npm run dev`, logar com um e-mail dentro e um fora de `ADMIN_EMAILS`, navegar pelas 3 telas, e conferir os números do dashboard contra uma consulta manual no `prisma studio`.
