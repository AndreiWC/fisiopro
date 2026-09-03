# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FisioPro — a Next.js 15 (App Router, React 19) SaaS for physiotherapists/clinics to manage services, customers and appointments, with public booking pages, Stripe-billed subscriptions (BASIC/PROFESSIONAL plans), and NextAuth (GitHub/Google) login. All user-facing copy is in Portuguese (pt-BR); keep new UI/error strings consistent with that.

The actual app lives in `fisiopro/` — this is the working directory for all commands below. The repo root (`d:/SaaS`) also contains an unrelated `install/stripe_*` CLI binary and some marketing images; ignore those unless asked.

## Commands

Run from `fisiopro/`:

- `npm run dev` — start dev server (localhost:3000)
- `npm run build` — `prisma generate && npx prisma migrate deploy && next build` (applies pending migrations against `DATABASE_URL` before building — be careful running this against a shared/prod database)
- `npm run start` — start production server
- `npm run lint` — `next lint`
- `npm run stripe:listen` — forwards Stripe webhook events to `localhost:3000/api/webhook` (needed for local subscription testing)

Prisma (no npm script wrapper — invoke directly):
- `npx prisma migrate dev --name <name>` — create/apply a migration in dev
- `npx prisma studio` — inspect the database
- `npx prisma generate` runs automatically via `postinstall`

There is no test suite/runner configured in this project.

## Environment

Config is read from `fisiopro/.env` (not committed). Required vars: `DATABASE_URL` (Postgres), `AUTH_SECRET`, `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`, `CLOUDINARY_NAME`/`CLOUDINARY_KEY`/`CLOUDINARY_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_SECRET_WEBHOOK_KEY`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`, `STRIPE_BASIC_PLAN_ID`, `STRIPE_PREMIUM_PLAN_ID`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `NEXT_PUBLIC_BASE_URL`. Optional: `RESEND_API_KEY` (and `RESEND_FROM_EMAIL`) — powers the e-mail verification code on the public `/agendamentos` page (`src/app/(public)/agendamentos`); without it, that page's "enviar código" step returns a clear error instead of sending anything.

## Architecture

**Route groups.** `src/app` splits into two route groups plus `api`:
- `(panel)/dashboard` — authenticated clinic-owner area (services, customers/reports, profile, plans/billing).
- `(public)` — marketing home page and `clinica/[id]` public booking flow (no login required; `[id]` is a user id).
- `api` — NextAuth handler, Stripe webhook, image upload (Cloudinary), and a couple of JSON endpoints used by the public booking page (`schedule/get-appointments`, `clinic/appointments`).

There is no `middleware.ts`; route protection happens per-request by calling `auth()` inside server actions/pages, not via edge middleware.

**Data flow convention.** Each route segment keeps its own `_actions/` (server actions, `"use server"`, mutations) and `_data-access/` (read queries) folders colocated with `_components/`. This split is intentional — new reads go in `_data-access`, new writes go in `_actions`. Follow the existing pattern in `create-reminder.ts` for actions: `auth()` → zod `safeParse` on input → try/catch around the Prisma call → return `{ data }` or `{ error }` (never throw to the client), then `revalidatePath` the affected route.

**Prisma.** Single schema at `prisma/schema.prisma`. Core models: `User` (the clinic professional/tenant) has many `Service`, `Customer`, `Appointments`, `Reminder`, and one `Subscription`; `Appointments` links a `Service` + `User` + optional `Customer`. `User` is the tenant boundary — most queries should scope by `session.user.id` / `userId`. Import the shared client from `@/lib/prisma` (`src/lib/prisma.ts`), never instantiate `PrismaClient` directly — it's memoized on `global` in dev to survive HMR.

**Auth.** NextAuth v5 (beta) configured in `src/lib/auth.ts` with the Prisma adapter and GitHub/Google OAuth only (no credentials provider). Use `auth()` (server-only) from `@/lib/auth`, or the `@/lib/getSession` re-export, to get the session inside actions/data-access/pages.

**Plans, permissions & billing.** `src/utils/plans/index.tsx` defines the two plans (`BASIC`, `PROFESSIONAL`) and their limits (`maxServices`, `maxCustomer`) plus pricing copy shown on `/dashboard/plans`. `src/utils/permissions/` enforces those limits and trial/expired state — `canPermissions({ type })` looks up the user's `Subscription` and dispatches to a per-resource checker (currently `canCreateService`); extend this switch when gating a new resource type rather than checking limits ad hoc. Stripe: `src/utils/stripe.ts` exports the server SDK client, `src/utils/stripe-js.ts` the browser `loadStripe` client, and `src/utils/manage-subscription.ts` is the single place that creates/updates/deletes the local `Subscription` row from Stripe webhook events (`api/webhook/route.ts` handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` and calls into it).

**UI.** shadcn/ui (`components.json`, "new-york" style) with Tailwind v4 and `src/lib/utils.ts`'s `cn()` helper for class merging. Shared primitives live under `@/components/ui`; forms use `react-hook-form` + `@hookform/resolvers/zod`. Path alias `@/*` → `src/*`.
