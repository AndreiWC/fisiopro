# Prontuário de pacientes (anotações de sessão) — Design

## Contexto e objetivo

O FisioPro hoje modela `Customer` (paciente) e `Appointments` (agendamentos), mas não tem nenhum lugar para o profissional registrar o que efetivamente aconteceu em cada sessão — apenas a aba "Histórico" da `PatientProfileSheet`, que lista os agendamentos (data, serviço, status), sem espaço para anotações clínicas.

Este documento especifica um sistema de prontuário: cada membro da organização pode registrar uma anotação de sessão por paciente (texto livre + data + imagens opcionais), formando um histórico de atendimentos ao longo do tempo, para melhor acompanhamento clínico.

## Fora de escopo (v1)

- Vínculo obrigatório com `Appointments` — o registro é avulso, ligado só ao paciente (permite registrar sessões antigas, atendimentos sem agendamento prévio, ou múltiplas anotações no mesmo dia).
- Campos estruturados (estilo SOAP), nível de dor, procedimento realizado — só texto livre + data nesta versão.
- Versionamento/histórico de edições — edição é livre (sobrescreve), sem guardar versões anteriores do texto.
- Restrição de edição/exclusão por role ou por autor — qualquer membro (OWNER ou STAFF) da organização pode editar e excluir qualquer anotação.
- Impressão/exportação em PDF do prontuário.

## Controle de acesso

- Sem checagem de role: `OWNER` e `STAFF` (via `Membership`) têm os mesmos direitos sobre o prontuário de qualquer paciente da organização.
- Toda leitura/escrita usa `requireActiveOrganization()` / `getActiveOrganization()` (`src/lib/organization.ts`), igual ao resto do dashboard — sem `middleware.ts`, checagem per-request.
- Toda query de `ClinicalRecord` filtra por `organizationId` da organização ativa — mesmo tenant boundary usado em `Customer`/`Service`/`Reminder`. A rota `/dashboard/patients/[id]/prontuario` valida que o `Customer` pertence a essa organização antes de renderizar (404/redirect caso contrário).
- **Entra no limite de plano**, como `Service`/`Customer` hoje: novo tipo `"clinicalRecord"` em `TypeCheck` (`canPermissions.ts`), com `canCreateClinicalRecord(subscription, organization)` no mesmo formato de `canCreateService`. `PLANS.BASIC.maxClinicalRecords = 100`, `PLANS.PROFESSIONAL.maxClinicalRecords = null` (sem limite) — novo campo em `PlanDetailsProps`. A contagem usa só registros não excluídos (`deletedAt: null`), no nível da organização (não por paciente).
  - Nota de implementação: `canCreateService` hoje checa a contagem de serviços **e** de clientes juntas (`serviceCont <= planLimits.maxServices && customerCont <= planLimits.maxCustomer`) — uma peculiaridade específica daquela função. `canCreateClinicalRecord` **não** deve replicar esse acoplamento: checa somente `clinicalRecordCount <= planLimits.maxClinicalRecords` (quando `maxClinicalRecords` não for `null`).
- Diferente do padrão atual de `create-service.ts` (que só bloqueia via UI/`canPermissions` na página), a criação de `ClinicalRecord` **também** checa o limite dentro da própria server action antes do `prisma.create`, para não depender só do gate client-side. A tela mostra o mesmo componente `LabelSubscription` já usado em serviços/pacientes quando o limite é atingido.

## Modelo de dados

Novo model, sem alterar nenhum existente:

```prisma
model ClinicalRecord {
  id          String    @id @default(cuid())
  note        String    @db.Text
  sessionDate DateTime
  images      String[]  @default([])

  deletedAt   DateTime?

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

- `Customer`, `Organization`, `User` e `Appointments` ganham a relação inversa `clinicalRecords ClinicalRecord[]`.
- `appointmentId` fica opcional e sem uso na v1 (nenhuma UI liga um registro a um agendamento específico) — existe só para permitir essa ligação no futuro sem nova migration.
- `authorId` registra quem criou o registro originalmente; não impede outros membros de editar depois (ver "Controle de acesso"), mas dá um mínimo de rastreabilidade.
- Exclusão é soft delete (`deletedAt` preenchido); toda listagem/contagem filtra `deletedAt: null`.
- `images` é um array de URLs (Cloudinary `secure_url`), máximo de 3 por registro (validado na action e no form).

## Estrutura de rotas e UI

Nova rota sob `(panel)/dashboard/patients`:

```
patients/
  [id]/
    prontuario/
      page.tsx                    — página do prontuário do paciente
      _components/
        clinical-record-list.tsx  — lista cronológica das anotações
        clinical-record-form.tsx  — dialog criar/editar (texto, data, imagens)
        clinical-record-item.tsx  — card de uma anotação (editar/excluir)
      _actions/
        create-clinical-record.ts
        update-clinical-record.ts
        delete-clinical-record.ts   — soft delete (seta deletedAt)
      _data-access/
        get-clinical-records.ts
```

- `patients/page.tsx` (lista) e `PatientProfileSheet` ganham um link "Ver prontuário completo" → `/dashboard/patients/[id]/prontuario`, no mesmo espírito do botão atual "Agendar novo atendimento" na Sheet.
- A aba "Histórico" existente na `PatientProfileSheet` não muda — continua mostrando só agendamentos. O prontuário clínico vive exclusivamente na página dedicada (mais espaço para texto longo e imagens, e permite crescer no futuro sem apertar a Sheet).
- Criar/editar uma anotação acontece em um `Dialog` na própria página do prontuário (sem rota própria), com `react-hook-form` + `@hookform/resolvers/zod`, no mesmo padrão de `create-service`.
- `page.tsx` busca a `organization` ativa, valida que `Customer.id === params.id` pertence a ela (senão `redirect`/404), busca os registros via `get-clinical-records` e o resultado de `canPermissions({ type: "clinicalRecord" })` para o gate de limite.

## Upload de imagens

- Reaproveita o endpoint existente `/api/image/upload` (Cloudinary) sem alterações — o form sobe cada imagem selecionada (até 3) nesse endpoint e guarda as `secure_url` retornadas no array `images` antes de chamar a action de criar/editar.
- Formatos aceitos: os mesmos já validados no endpoint hoje (`image/png`, `image/jpeg`).
- Se uma imagem falhar no upload, a submissão inteira é bloqueada com uma mensagem clara ("Falha ao enviar uma das imagens, tente novamente") — nunca salva um registro com imagens parciais.

## Tratamento de erros

Segue o padrão já usado em `create-reminder.ts`/`create-service.ts`:

- Actions nunca lançam para o cliente — sempre retornam `{ data }` ou `{ error: "mensagem em pt-BR" }`.
- `auth()` sem sessão → `{ error: "Usuário não autenticado" }`.
- `zod.safeParse` inválido → `{ error: <primeira mensagem do schema> }`.
- Sem organização ativa (`getActiveOrganization()` retorna `null`) → `{ error: "Nenhuma organização vinculada à sua conta" }`.
- Limite de plano atingido → `{ error: "Limite de registros do seu plano atingido" }`, sem chegar a tentar o `prisma.create`.
- Falha do Prisma → `catch` genérico retornando `{ error: "Erro ao salvar o registro" }` (mesmo padrão dos demais `_actions`).

## Testes (verificação manual)

Sem suíte automatizada no projeto — validação via `npm run dev`, cobrindo:

1. Criar anotação só com texto + data (sem imagem).
2. Criar anotação com 1–3 imagens; tentar uma 4ª e confirmar bloqueio no form.
3. Editar uma anotação existente (texto, data, imagens).
4. Excluir uma anotação e confirmar que some da lista, mas o registro permanece no banco com `deletedAt` preenchido.
5. Atingir o limite de 100 registros numa organização em plano BASIC (simulando via Prisma Studio) e confirmar bloqueio na criação, com o aviso `LabelSubscription` visível.
6. Confirmar isolamento entre organizações: paciente/registro de uma organização não aparece nem é editável a partir de outra.
7. Acessar `/dashboard/patients/[id]/prontuario` com um `id` de paciente que não pertence à organização ativa → deve bloquear.
