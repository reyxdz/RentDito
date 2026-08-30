# RentDito: MongoDB → Supabase/Postgres Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace MongoDB/Mongoose with Supabase Postgres + Prisma + Supabase Auth, preserving every existing API response shape so the React client requires no changes at cutover.

**Architecture:** The Postgres schema is owned by Prisma Migrate. The 27 Mongoose data-access sites collapse into a Prisma client used at the service layer — controllers are untouched because they already import zero models. Mongoose `.populate()` becomes Prisma `include`. A single response serializer emits both `id` and `_id` so existing client mapping code keeps working. Supabase Auth replaces the hand-rolled JWT/bcrypt flow, but the server proxies it behind the *existing* `/api/auth/*` contract so the client auth layer is unchanged. RLS is authored as defence-in-depth; the Express API remains the primary authorization boundary.

**Tech Stack:** Postgres 15 (Supabase), Prisma 6, `@supabase/supabase-js` (admin client, server-side only), Express 5, TypeScript, Jest + Supertest.

**Spec:** No separate spec document exists. The "Context" and "Locked Decisions" sections below are the spec; they were derived by direct measurement of the codebase at commit `67168ea` and by four explicit decisions from the repository owner. Executors read this document alone.

---

## Status

*A resuming executor should trust this section over the raw task numbering below — it reflects what has actually landed, not just what was planned.*

- **Done and reviewed clean:** Task 2 (Jest harness), Task 3a (extended Mongo seed), Task 3 (golden fixture capture), Task 4 (golden-fixture replay contract tests), Task 5 (Prisma schema for all 27 tables, batched with Task 1a below), Task 8 (dual `id`/`_id` serializer), Task 9 (Prisma error mapping). On this subset: `npm test` passes (4 suites), `npx tsc --noEmit` exits 0.
- **Task 1 is split into two:**
  - **Task 1a (done):** installing `prisma`, `@prisma/client`, `@supabase/supabase-js` (Step 3), the `schema.prisma` generator/datasource skeleton (Step 4), the `server/src/config/prisma.ts` singleton (Step 5), and `server/.env.example` with placeholder values (part of Step 2). None of this needs credentials, so it was executed batched into the Task 5 dispatch — both edit `server/prisma/schema.prisma`.
  - **Task 1b (blocked):** creating the actual Supabase project (Step 1), writing real values into `server/.env` (Step 2), and the `prisma db pull` connectivity check (Step 6). These need the repository owner's Supabase account and cannot be synthesized by an executor.
- **Blocked on Supabase credentials:** Task 1b, and Tasks 6, 7, and 10 through 32. None of these can be meaningfully dispatched until a real Supabase project exists and `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_JWT_SECRET` / `DATABASE_URL` / `DIRECT_URL` are set in `server/.env`.

---

## Execution Order

Task numbers are fixed and are **not** renumbered as work proceeds (Task 3a is inserted with that name for exactly this reason). But the numeric order is not the execution order — three corrections apply, discovered during dispatch:

1. **Task 5 precedes Tasks 8 and 9.** `serializeDoc`/`serializeList` (Task 8) and `toHttpError` (Task 9) both `import { Prisma } from '@prisma/client'`, which only exists once `npx prisma generate` has run — that happens in Task 5 Step 4. Dispatching 8 or 9 first fails on a missing module.
2. **Task 8 precedes Task 7.** `auth.service.ts` (Task 7) calls `serializeDoc` on every profile it returns. Task 8 must land first or Task 7 has nothing to import.
3. **Task 3a precedes Task 3.** Task 3a extends the seed data Task 3 captures fixtures from (see Task 3a below); running Task 3 first would freeze fixtures against thin, unrepresentative data.

The real dependency order:

```
Task 2 (jest harness)
  -> Task 1a + Task 5 (schema skeleton + all 27 models, batched — generates @prisma/client)
    -> Task 8 (serializer) -> Task 9 (error mapping)
  -> Task 3a (extend Mongo seed) -> Task 3 (capture golden fixtures) -> Task 4 (replay harness)
  -> Task 1b (Supabase provisioning — needs credentials)
    -> Task 6 (apply migration)
    -> Task 7 (Supabase Auth proxy — needs Task 8's serializeDoc)
  -> Tasks 10-29 (service port — needs 5, 6, 7, 8, 9 landed, and 4 to verify against)
  -> Task 30 (seed rewrite — Task 3a is its equivalence spec)
  -> Task 31 (cutover)
  -> Task 32 (RLS)
```

Tasks 2, 1a+5, 8, and 9 need no credentials and no reachable database at all. Tasks 3a, 3, and 4 need a live, reachable MongoDB but no Supabase credentials — this chain can run independently of, and in parallel with, the Prisma/Supabase chain above it. Everything from Task 1b onward needs real Supabase credentials.

This supersedes the ordering originally stated only in this document's own Self-Review (which named `Task 8 -> Task 9 -> Task 7` for Phase 3 but omitted Task 5's precedence over 8 and 9, and did not yet account for Task 3a).

---

## Known Coverage Gaps

- **The golden corpus (Tasks 3 and 4) is GET-only** (plus login and the health check). Task 3 deliberately excluded 83 mutating routes (POST/PATCH/PUT/DELETE) — a one-shot capture script cannot safely replay writes without side effects compounding on every run, so exclusion was correct for capture. The consequence: any `.populate()` call site reachable **only** through a write path has zero replay coverage. When a Phase 4 task touches such a site, the golden replay alone does not prove it correct — verify those sites with a hand-written test against the write path itself, or manual verification against the running app, before trusting the port.
- **The normalizer (`server/tests/helpers/normalize.ts`) has two known blind spots**, accepted as-is rather than fixed because closing them needs path-aware normalization the harness does not have:
  1. It strips the key `to` by bare name rather than scoping it to the one path it legitimately appears on (`financial.json`'s `summary.range.to`, a live `new Date()` value). A future, unrelated top-level `to` field elsewhere in the API would be silently stripped and never actually compared.
  2. Collapsing every `...Id`-suffixed value to the placeholder `<ID>` means a foreign key repointed at a **wrong-but-valid-shaped** entity (e.g. a bill's `tenancyId` silently pointing at the wrong tenancy after a botched Prisma `include`) will not be caught — both sides normalize to `<ID>` regardless of which real ID is underneath. The structural `assertDualId` check (Task 4 Step 2) closes a related but different gap (missing `_id`); it does not catch this one.

---

## Global Constraints

- **Postgres version:** 15 (Supabase default). Do not use syntax requiring 16+.
- **Prisma version:** `^6.0.0`. Pin exactly in `server/package.json`.
- **Node/TS:** TypeScript `^6.0.2`, `"type": "commonjs"`, Express `^5.2.1` — already in `server/package.json`. Do not change the module system.
- **API response envelope is frozen:** every endpoint keeps returning `{ status, message, data }`. Field names inside `data` do not change.
- **Every entity object returned by the API MUST carry both `id` and `_id` with identical string values.** This is what lets the client work untouched. Enforced by `serializeDoc` (Task 8) and asserted by contract tests.
- **Auth endpoint contract is frozen:** `/api/auth/login|register|refresh` return `{ user, accessToken, refreshToken }` (camelCase), NOT Supabase's `access_token`/`refresh_token`. `client/src/infrastructure/api/apiClient.ts` depends on this exact shape.
- **Naming:** Prisma models are PascalCase singular; tables are snake_case plural via `@@map`; columns are snake_case via `@map`. TypeScript-facing field names stay camelCase to match the current API.
- **No service-role key or database URL may reach the client bundle.** Server-side only. The client never talks to Supabase directly.
- **RLS is defence-in-depth, not the primary gate.** The API authorizes; RLS is a second layer. Never remove an API-level permission check on the grounds that RLS covers it.
- **Timestamps:** every table keeps `created_at` and `updated_at` (`timestamptz`), matching Mongoose `{ timestamps: true }`.
- **Money:** all monetary columns are `Decimal @db.Decimal(12, 2)`. Never `Float`. Mongo stored these as doubles; this is a deliberate correctness upgrade.
- **Commit after every task**, using Conventional Commits (`feat:`, `refactor:`, `test:`, `chore:`).

---

## Context: Measured Current State

Measured at commit `67168ea` on branch `development`.

| Metric | Value | Consequence |
|---|---|---|
| Mongoose models | 21 files, 1,787 lines | Become 27 Postgres tables (embedded arrays get promoted) |
| Files importing models | 27, **all under `server/src/services/`** | Controllers import zero models — the port is confined to one directory |
| `.populate()` call sites | 235 | The single largest mechanical workload |
| `.aggregate()` pipelines | 9, in 4 files | Rewritten as Prisma `groupBy` or raw SQL |
| `ObjectId` outside models | 3 files, 3 construction sites | Trivial ID-type churn |
| `.post()` / `.pre()` hooks | 4 + 1 | Become Postgres triggers |
| `Schema.Types.Mixed` | 2 (`Notification.metadata`, `AuditLog.details`) | Become `jsonb` |
| Mongo transactions in use | **0** | Nothing to port; Postgres transactions are a net upgrade |
| Automated tests | **0** | Highest risk in this migration — Phase 1 exists solely to fix this |
| Client `_id` read sites | 14 across 195 files | Neutralized by dual `id`/`_id` emission |

`.populate()` density per service, highest first — this is the port-effort ranking:

```
transfer 41   billing 30   tenancy 28   contract 27   visit 20   application 18
inventory 12  inquiry 10   ticket 8     scheduler 6   unit 5     security 4
property 4    report 3     reminder 3   public 3      message 3  landlord-app 3
document 2    utility 1    user 1       team 1        financial 1  admin 1
```

**The dominant risk is the absence of any test suite.** Rewriting 235 query sites with no regression net is not survivable. Phase 1 builds a characterization harness against the *current MongoDB implementation* first; every later phase is validated by replaying it.

---

## Locked Decisions

1. **No production data.** Atlas holds dev/seed data only. There is no ETL phase. `server/src/seeds/seed.ts` (610 lines) is rewritten against Postgres and becomes the fixture source of truth.
2. **Prisma** is the data layer. `include` maps near-1:1 onto `.populate()`, keeping the 235 rewrites mechanical.
3. **Supabase Auth** replaces JWT+bcrypt. `auth.users` owns credentials; `public.profiles` owns app data (role, permissions, landlord linkage). The server proxies Supabase Auth behind the frozen `/api/auth/*` contract.
4. **Dual `id` + `_id` emission** during migration. Client cleanup is a deliberate follow-up, out of scope here.

### Scope note on decision 3

Supabase Auth was chosen over keeping the existing JWT flow. It is the single largest cost in this plan: it adds Phases 3 and 7 (9 tasks), requires re-homing every user, rewrites `auth.service.ts`, `middleware/auth.ts`, and `utils/jwt.ts`, and demands RLS policies for 27 tables. Keeping the existing JWT would have removed both phases. Recorded as a deliberate, informed choice — proceed as planned.

---

## Schema Mapping Decisions

Every embedded structure needs an explicit call. These are settled here so no task has to improvise.

### Flattened into columns
| Source | Target columns |
|---|---|
| `Property.address.*` | `street`, `barangay`, `city`, `province`, `zip_code`, `country` |
| `Property.billingSettings.*` | `billing_day`, `due_day`, `late_fee_percent`, `utility_default` |
| `Property.geoCoords` | `latitude`, `longitude` (`Decimal @db.Decimal(10,7)`, nullable) |
| `Bill.billingPeriod` | `billing_period_start`, `billing_period_end` — must be columns; the unique index depends on them |
| `Tenancy.personalDetails` | `pd_full_name`, `pd_phone`, `pd_occupation`, `pd_school`, `pd_address`, `pd_emergency_name`, `pd_emergency_phone`, `pd_emergency_relationship` |
| `RentalApplication.personalDetails` | the same eight-column shape as Tenancy |

### Promoted to child tables
| Source | Table | Why |
|---|---|---|
| `Unit.slots[]` | `unit_slots` | Holds an FK to `tenancies`, mutated individually |
| `Tenancy.comments[]` | `tenancy_comments` | Holds an FK to `profiles`, ordered, append-heavy |
| `Ticket.updates[]` | `ticket_updates` | Holds an FK to `profiles`, ordered, append-heavy |
| `Conversation.participants[]` | `conversation_participants` | Many-to-many with `profiles` |
| `Message.readBy[]` | `message_reads` | Many-to-many with `profiles` |
| `User.assignedPropertyIds[]` | `staff_property_assignments` | Many-to-many with `properties` |

### Kept as `jsonb`
`Property.venues`, `Property.emergencyContacts`, `Tenancy.householdMembers`, `Bill.utilityBreakdown`, `Notification.metadata`, `AuditLog.details`.

These are display-only — never filtered or joined on. If utility analytics later need to aggregate `utilityBreakdown`, add generated columns rather than restructuring.

### Kept as native Postgres `text[]`
`Property.amenities`, `Property.inclusions`, `Property.images`, `Unit.features`, `Unit.images`, `Ticket.images`, `IncidentReport.attachments`, `RentalApplication.documents`, `LandlordApplication.documents`, `profiles.id_photos`, `profiles.permissions`.

### Partial unique indexes (raw SQL — Prisma cannot express these)
```sql
CREATE UNIQUE INDEX bills_auto_period_uniq
  ON bills (tenancy_id, type, billing_period_start, billing_period_end)
  WHERE is_auto_generated;

CREATE UNIQUE INDEX rental_applications_active_uniq
  ON rental_applications (user_id, unit_id)
  WHERE status IN ('pending', 'under_review');

CREATE UNIQUE INDEX inventory_serial_uniq
  ON inventories (property_id, serial_number)
  WHERE serial_number IS NOT NULL AND serial_number <> '';
```

**Table name note:** the `Inventory` model maps to table `inventories` (`@@map("inventories")` in Task 5's schema, following the plural-table naming convention), not `inventory`. The statement above was originally written against the bare singular table name and would fail with `relation "inventory" does not exist` — the `bills` and `rental_applications` statements were already correct.

### `properties.landlord_id` is `Restrict`, not `Cascade`
Deleting a `Profile` that owns properties must **not** cascade-delete those properties. The consequence is data-dependent and dangerous in both directions: a landlord who already has any contract/payment/audit row is blocked from deletion by those rows' own `Restrict` FKs regardless of this setting, but a landlord with properties and none of those rows would have the delete **succeed** under `Cascade` — silently destroying properties → units → tenancies → bills with no confirmation step. `Restrict` forces an explicit decision (archive the properties, or explicitly tear them down first) instead of a silent cascade. Task 30's seed teardown already deletes in reverse FK order, so it is unaffected by this choice.

### The Contract ↔ Tenancy cycle is not a cycle
`Tenancy.contractId` is required; `Contract.tenancyId` is optional. The real creation order is Contract (from an approved application) → Tenancy → backfill `contracts.tenancy_id`. So `tenancies.contract_id` is `NOT NULL` and `contracts.tenancy_id` is nullable. **No deferrable constraints are needed.** Do not add them.

### Enums
All Mongoose string enums become native Postgres enums via Prisma `enum`. Values are copied verbatim, including the capitalized `PropertyType` values (`'Boarding House'`, `'Mixed Use'`, …) and `PropertyStatus` (`'Active'`, …). Changing casing breaks the client's `statusColors.ts` maps.

---

## File Structure

**Created:**
- `server/prisma/schema.prisma` — single source of schema truth, all 27 models
- `server/prisma/migrations/**` — generated by Prisma Migrate
- `server/src/config/prisma.ts` — PrismaClient singleton with shutdown hook
- `server/src/config/supabase.ts` — service-role Supabase admin client
- `server/src/utils/serialize.ts` — `serializeDoc` / `serializeList`, the dual `id`+`_id` emitter
- `server/src/utils/prismaErrors.ts` — maps Prisma error codes to the app's `statusCode` convention
- `server/tests/helpers/db.ts` — per-suite schema reset + seeding
- `server/tests/helpers/auth.ts` — issues real Supabase tokens for test users
- `server/tests/golden/*.json` — captured characterization fixtures
- `server/tests/contract/*.test.ts` — one suite per domain, replays golden fixtures
- `server/jest.config.js` — currently absent despite jest being in `package.json` scripts
- `server/scripts/capture-golden.ts` — one-shot fixture recorder, runs against Mongo

**Modified:**
- All 24 files in `server/src/services/` — the Mongoose→Prisma port
- `server/src/middleware/auth.ts` — verify Supabase JWT instead of local HS256
- `server/src/services/auth.service.ts` — proxy Supabase Auth
- `server/src/utils/jwt.ts` — reduced to Supabase token verification
- `server/src/seeds/seed.ts` — rewritten against Prisma + Supabase Admin API
- `server/src/config/db.ts` — Mongo connector deleted at Task 30
- `server/src/server.ts` — first modified at Task 2 (guard boot side effects behind `require.main === module`, add named `{ app }` export); modified again at Task 31 to swap `connectDB()` for Prisma connect
- `server/package.json` — dependency swap

**Deleted (Task 30 only, never earlier):**
- `server/src/models/*.ts` (all 21)
- `server/src/config/db.ts`
- `server/src/utils/password.ts` (Supabase owns hashing)

---

## Phase 0 — Foundation

### Task 1: Provision Supabase and wire Prisma

**Files:**
- Create: `server/prisma/schema.prisma`, `server/src/config/prisma.ts`, `server/.env.example`
- Modify: `server/package.json`

**Interfaces:**
- Produces: `prisma` (a `PrismaClient` singleton) exported as default from `server/src/config/prisma.ts`.

- [ ] **Step 1: Create the Supabase project**

In the Supabase dashboard create a project named `rentdito-dev`, region closest to users (Southeast Asia for a Philippines-based product). Record from Settings → Database:
- Connection string (Transaction pooler, port `6543`) → `DATABASE_URL`
- Connection string (Session/Direct, port `5432`) → `DIRECT_URL`

Prisma Migrate requires the direct connection; the app uses the pooler.

- [ ] **Step 2: Add env vars**

Append to `server/.env` and `server/.env.example` (the example file carries placeholder values only):

```
DATABASE_URL="postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
SUPABASE_JWT_SECRET="..."
```

Confirm `server/.env` is already git-ignored before writing real values.

- [ ] **Step 3: Install dependencies**

```bash
cd server
npm install prisma@^6.0.0 @prisma/client@^6.0.0 @supabase/supabase-js@^2.45.0
npm install --save-dev @types/supertest
```

- [ ] **Step 4: Initialize the Prisma schema**

Create `server/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- [ ] **Step 5: Create the client singleton**

Create `server/src/config/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
```

- [ ] **Step 6: Verify connectivity**

```bash
cd server && npx prisma db pull
```
Expected: succeeds and reports an empty schema (`The introspected database was empty`). A connection error here means `DIRECT_URL` is wrong — fix before continuing.

- [ ] **Step 7: Commit**

```bash
git add server/prisma server/src/config/prisma.ts server/package.json server/package-lock.json server/.env.example
git commit -m "chore(db): provision Supabase and wire Prisma client"
```

---

## Phase 1 — Characterization Harness (do this before any rewrite)

This phase produces the regression net. Nothing in Phase 4 is safe without it.

### Task 2: Stand up Jest and prove it runs

**Files:**
- Create: `server/jest.config.js`, `server/tests/smoke.test.ts`
- Modify: `server/src/server.ts`

**Interfaces:**
- Produces: a working `npm test` in `server/`; a side-effect-free named export `{ app }` from `server/src/server.ts` that Tasks 3, 4, and 7 import via supertest.

- [ ] **Step 1: Write the failing test**

Create `server/tests/smoke.test.ts`:

```typescript
describe('jest harness', () => {
  it('runs TypeScript tests', () => {
    const sum = (a: number, b: number): number => a + b;
    expect(sum(2, 3)).toBe(5);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd server && npm test
```
Expected: FAIL — no jest config is present, so jest finds no tests or errors on the TS syntax.

- [ ] **Step 3: Add the config**

Create `server/jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: [],
  testTimeout: 30000,
  maxWorkers: 1,
};
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd server && npm test
```
Expected: PASS, 1 test.

- [ ] **Step 5: Make `server.ts` safely importable by tests**

`server.ts` currently calls `connectDB()` and `app.listen()` at module load, and does not export `app` at all — only the listening `Server`. Tasks 3, 4, and 7 all need to `import { app }` and pass it to `supertest`'s `request(app)` without binding a port or opening a MongoDB connection on every test run. Guard the boot side effects and add the named export:

```typescript
// eslint-disable-next-line import/no-mutable-exports
let server: import('http').Server | undefined;

// Only bind a port and connect to the database when this file is run
// directly (`npm run dev` / `npm start`), not when it is imported (e.g. by
// tests via supertest). Importing must be side-effect free.
if (require.main === module) {
  connectDB();

  server = app.listen(PORT, () => {
    console.log(`Server is running in development mode on port ${PORT}`);
    initScheduler();
  });
}

export { app };
export default server;
```

`npm start` / `npm run dev` behaviour is unchanged, since both invoke this file directly (`require.main === module` is true). Every later consumer (Task 3's `capture-golden.ts`, Task 4's `replay.test.ts`, Task 7's `auth.test.ts`) **must** use the named import `import { app } from '...'` — the default export is `undefined` on import from this point on, and a default import would silently call `request(undefined)`.

- [ ] **Step 6: Commit**

```bash
git add server/jest.config.js server/tests/smoke.test.ts server/src/server.ts
git commit -m "test: add jest configuration, smoke test, and guard server.ts boot side effects"
```

---

### Task 3a: Extend the Mongo seed before capturing fixtures

Inserted ahead of Task 3 (see "Execution Order" near the top) once the live Mongo database was inspected: the seed left roughly 100 of the 235 populate call sites with **zero rows to populate** — `transfer` (41 sites, 0 rows), `visit` (20, 0), `application` (18, 0), `inquiry` (10, 0), `ticket` (8, 0), `message` (3, 0), and `payment` (0 rows). Capturing golden fixtures (Task 3) against that seed would freeze empty arrays for exactly the six highest-populate-density services this plan calls out as the port-effort ranking — a regression net with a hole precisely where the risk concentrates. This task exists to close that hole before Task 3 records anything.

**Files:**
- Modify: `server/src/seeds/seed.ts`

**Interfaces:**
- Produces: seed data for every previously-empty domain above; consumed by Task 3's capture and, later, by Task 30's Postgres seed rewrite as its equivalence spec.

- [ ] **Step 1: Add seed data for the six under-seeded domains**

Add representative rows — enough to exercise every status value each domain's routes branch on (e.g. `pending`/`under_review`/`approved`/`rejected` for applications, `pending`/`approved`/`scheduled`/`completed`/`cancelled`/`no_show` for visits) — for `RentalApplication`, `VisitRequest`, `TransferRequest`, `Inquiry` (with its `Conversation`), `Message`, `Ticket`, and `Payment`. Wire each new record to the existing seeded users/properties/units/tenancies rather than inventing new top-level entities, so the six services' relations are exercised the same way production data would exercise them.

- [ ] **Step 2: Fix `clearDatabase()`'s incomplete teardown**

`clearDatabase()` omits `Bill` and `Notification`, so a second `npm run seed` run accumulates duplicate rows instead of replacing them (masking the same idempotency requirement Task 30 Step 3 later re-establishes against Postgres). Add both models to the teardown list.

- [ ] **Step 3: Fix dangling `Contract.applicationId` references**

Three seeded `Contract` records point `applicationId` at an existing but **wrong** `RentalApplication` — a real bug, not a migration artifact: it breaks `contract.service.ts`'s `generatePDF` (around line 396) with a `TypeError` under Mongo today, independently of this migration. Re-point every seeded contract's `applicationId` at an application sharing the same `userId` and `unitId` as the contract itself, and verify this by cross-checking each `Contract.create()` call's own `userId`/`unitId` against the application it references.

- [ ] **Step 4: Run the seed twice and inspect counts**

```bash
cd server && npm run seed && npm run seed
```
Expected: both runs exit 0 with identical resulting counts (proves Step 2's fix). Record the final counts — **Task 30's Postgres seed rewrite must reproduce at least this much data, split the same way across statuses:** `rentalapplications` 7, `visitrequests` 5, `transferrequests` 3, `inquiries` 3, `conversations` 3, `messages` 9, `tickets` 5, `payments` 4, `contracts` 3, `bills` 3, `landlordapplications` 2, `documents` 2, `incidentreports` 2.

- [ ] **Step 5: Commit**

```bash
git add server/src/seeds/seed.ts
git commit -m "feat(seed): extend Mongo seed data for under-populated domains and fix dangling contract refs"
```

---

### Task 3: Capture golden API fixtures from the live Mongo implementation

This is the highest-value task in the plan. It records what the API currently returns so the Postgres rewrite can be proven equivalent. Run this only after Task 3a has extended the seed — otherwise the six highest-populate-density domains get captured with empty arrays.

**Files:**
- Create: `server/scripts/capture-golden.ts`, `server/tests/golden/*.json`

**Interfaces:**
- Produces: `server/tests/golden/<domain>.json`, each an array of `{ name, method, path, status, body }` records consumed by Task 4's contract tests.

- [ ] **Step 1: Seed Mongo with deterministic data**

```bash
cd server && npm run seed
```
Expected: exits 0. If `seed.ts` uses randomness or `Date.now()`, pin it first — set a fixed seed and a fixed clock — otherwise golden fixtures will not reproduce. Record the resulting IDs; the capture script reads them from the DB rather than hard-coding.

- [ ] **Step 2: Write the capture script**

Create `server/scripts/capture-golden.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import mongoose from 'mongoose';
// IMPORTANT: named import. server.ts only calls connectDB()/app.listen() under
// `if (require.main === module)`, so the default export is `undefined` when this
// file is imported (as here, via supertest) rather than run directly. Importing
// `app` does NOT connect to MongoDB — this script owns its own connection below.
import { app } from '../src/server';

interface Capture {
  name: string;
  method: 'get' | 'post';
  path: string;
  token?: string;
  body?: unknown;
}

const OUT_DIR = path.resolve(__dirname, '../tests/golden');

async function capture(group: string, cases: Capture[]) {
  const results = [];
  for (const c of cases) {
    const req = request(app)[c.method](c.path);
    if (c.token) req.set('Authorization', `Bearer ${c.token}`);
    if (c.body) req.send(c.body as object);
    const res = await req;
    results.push({ name: c.name, method: c.method, path: c.path, status: res.status, body: res.body });
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `${group}.json`), JSON.stringify(results, null, 2));
  console.log(`captured ${results.length} cases -> ${group}.json`);
}

async function main() {
  // Importing `app` above does not connect to MongoDB — connect explicitly.
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rentdito');
  // ... call capture(group, cases) for each domain here ...
  await mongoose.disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Golden capture failed:', err);
    mongoose.disconnect().finally(() => process.exit(1));
  });

export { capture, Capture };
```

`server.ts`'s boot side effects (`connectDB()`, `app.listen()`) are guarded behind `require.main === module` (Task 2), so simply importing `{ app }` here does not open a MongoDB connection — this script must, and does, connect to MongoDB itself via `mongoose.connect(...)` before issuing any request, and disconnect when done.

- [ ] **Step 3: Enumerate the endpoints to capture**

```bash
cd server && grep -rnE "router\.(get|post|put|patch|delete)" src/routes/ | wc -l
```
Capture at minimum one success case per GET endpoint, for each of the four roles (`user`, `landlord`, `staff`, `super_admin`). Prioritise by populate density: transfer, billing, tenancy, contract, visit, application first — these carry 164 of the 235 populate calls.

- [ ] **Step 4: Run the capture**

```bash
cd server && npx tsx scripts/capture-golden.ts
```
Expected: one JSON file per domain under `server/tests/golden/`, each non-empty. Inspect one by eye and confirm nested populated objects are present (e.g. a bill's `tenancyId` is an object, not a bare string).

- [ ] **Step 5: Commit**

```bash
git add server/scripts/capture-golden.ts server/tests/golden
git commit -m "test: capture golden API fixtures from MongoDB implementation"
```

---

### Task 4: Contract tests that replay the golden fixtures

**Files:**
- Create: `server/tests/contract/replay.test.ts`, `server/tests/contract/replay.meta.ts`, `server/tests/helpers/normalize.ts`, `server/tests/helpers/auth.ts`

**Interfaces:**
- Consumes: `server/tests/golden/*.json` from Task 3.
- Produces: `normalizeBody(body: unknown): unknown` — strips volatile fields so Mongo and Postgres responses are comparable; `tokenForEmail(email: string): Promise<string>` — mints a bearer token for a seeded user.

- [ ] **Step 1: Write the token helper behind a swappable interface**

Task 3's captures used `signAccess()` (from `src/utils/jwt.ts`) to mint bearer tokens directly — cheap, and it avoids the login route's rate limiter. But `utils/jwt.ts` is deleted at Task 7's Supabase cutover, so this replay harness must not import `signAccess` anywhere it can be avoided at the call site — isolate it behind one function so only that function's body changes later (to mint/fetch a Supabase-issued token via `supabase.auth.signInWithPassword` instead).

Create `server/tests/helpers/auth.ts`:

```typescript
import { User } from '../../src/models/User';
import { signAccess } from '../../src/utils/jwt';

// This file is deliberately the ONLY place in the test suite that imports
// signAccess or knows how a bearer token is produced. When auth moves to
// Supabase, only tokenForEmail's implementation below needs to change —
// every test that calls it stays untouched. Tokens must never be compared
// by VALUE across engines: Mongo-JWTs and Supabase-JWTs are differently
// shaped and will never be equal, which is fine — replay only needs a
// token that authenticates as the right seeded user, not a specific string.
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'contract-replay-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'contract-replay-refresh-secret';

const tokenCache = new Map<string, string>();

export async function tokenForEmail(email: string): Promise<string> {
  const cached = tokenCache.get(email);
  if (cached) return cached;

  const user = await User.findOne({ email }).lean();
  if (!user) {
    throw new Error(`tokenForEmail: no seeded user found for "${email}". Run \`npm run seed\` first.`);
  }

  const token = signAccess((user as any)._id.toString(), (user as any).role);
  tokenCache.set(email, token);
  return token;
}
```

- [ ] **Step 2: Write the normalizer**

Create `server/tests/helpers/normalize.ts`:

```typescript
const VOLATILE = new Set(['createdAt', 'updatedAt', '__v', 'timestamp', 'signedAt']);

/**
 * Strip fields that legitimately differ between runs or engines, and
 * canonicalise IDs to a placeholder so Mongo ObjectIds and Postgres UUIDs
 * compare equal by position rather than by value.
 *
 * IMPORTANT: this collapses both `id` and `_id` to the same `'<ID>'`
 * placeholder, which makes it USELESS on its own for verifying that an
 * object carries a consistent, matching `id`/`_id` pair — by the time a
 * body reaches this function that information is already gone. Step 3's
 * `assertDualId` MUST run on the raw response body BEFORE this function,
 * never after (see the "Known Coverage Gaps" section near the top of this
 * document for the two blind spots this normalizer still has even so).
 */
export function normalizeBody(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(normalizeBody);
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (VOLATILE.has(k)) continue;
      if (k === 'id' || k === '_id' || k.endsWith('Id')) {
        out[k] = typeof v === 'string' ? '<ID>' : normalizeBody(v);
        continue;
      }
      out[k] = normalizeBody(v);
    }
    return out;
  }
  return input;
}
```

- [ ] **Step 3: Write the failing replay test**

Fixture records only carry `{ name, method, path, status, body }` — never which token produced them — so a companion file maps each captured case name to the seeded identity (or none, for the deliberately unauthenticated cases) it needs replayed with. Create `server/tests/contract/replay.meta.ts` with that mapping, populated to cover every case name Task 3 actually captured:

```typescript
export const EMAILS: Record<string, string> = {
  superAdmin: 'admin@rentdito.com',
  landlord1: 'landlord1@rentdito.com',
  landlord2: 'landlord2@rentdito.com',
  staffManager: 'manager@rentdito.com',
  staffMaintenance: 'maintenance@rentdito.com',
  staffFinance: 'finance@rentdito.com',
  user1: 'user1@rentdito.com',
  user2: 'user2@rentdito.com',
  user3: 'user3@rentdito.com',
};

// Case name -> EMAILS key. Populate one entry per authenticated case Task 3 captured.
export const CASE_AUTH: Record<string, keyof typeof EMAILS> = {
  'property-by-id-landlord1': 'landlord1',
  // ... one entry per remaining authenticated case name ...
};

// Case name -> query params, for cases captured with a query string.
export const CASE_QUERY: Record<string, Record<string, string>> = {};

// Case name -> request body, for the small set of real POST /api/auth/login captures.
export const AUTH_LOGIN_BODIES: Record<string, { email: string; password: string }> = {};

// Case names whose response is allowed to carry `id` with no sibling `_id`
// (a deliberate DTO shape) — see assertDualId below. Empty until a real one is found.
export const ALLOW_ID_ONLY = new Set<string>();
```

Create `server/tests/contract/replay.test.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import mongoose from 'mongoose';
// IMPORTANT: named import. server.ts only calls connectDB()/app.listen() under
// `if (require.main === module)`; the default export is `undefined` on import.
// Importing `app` here does NOT connect to MongoDB — this suite connects itself
// in beforeAll below.
import { app } from '../../src/server';
import { normalizeBody } from '../helpers/normalize';
import { tokenForEmail } from '../helpers/auth';
import { EMAILS, CASE_AUTH, CASE_QUERY, AUTH_LOGIN_BODIES, ALLOW_ID_ONLY } from './replay.meta';

const GOLDEN_DIR = path.resolve(__dirname, '../golden');
const files = fs.existsSync(GOLDEN_DIR)
  ? fs.readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.json'))
  : [];

if (files.length === 0) {
  throw new Error(`golden replay: no *.json fixtures found in ${GOLDEN_DIR}`);
}

interface GoldenCase {
  name: string;
  method: 'get' | 'post' | 'patch' | 'put' | 'delete';
  path: string;
  status: number;
  body: unknown;
}

/**
 * Structural dual-id assertion — MUST run on the raw body BEFORE normalizeBody,
 * which collapses both `id` and `_id` to the same placeholder and so cannot
 * verify this on its own. Global Constraint under test: every entity object the
 * API returns must carry both `id` and `_id`, equal to each other.
 */
function assertDualId(node: unknown, allowIdOnly: boolean, pointer = '$'): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => assertDualId(item, allowIdOnly, `${pointer}[${i}]`));
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(obj, 'id')) {
      const hasUnderscoreId = Object.prototype.hasOwnProperty.call(obj, '_id');
      if (!hasUnderscoreId && !allowIdOnly) {
        throw new Error(`assertDualId: object at ${pointer} has "id" with no sibling "_id".`);
      }
      if (hasUnderscoreId && String(obj.id) !== String(obj._id)) {
        throw new Error(`assertDualId: object at ${pointer} has mismatched id/_id.`);
      }
    }
    for (const [key, value] of Object.entries(obj)) {
      assertDualId(value, allowIdOnly, `${pointer}.${key}`);
    }
  }
}

/**
 * Login responses embed live, freshly-signed tokens that can never equal a
 * fixed placeholder byte-for-byte, and per this task's design must NEVER be
 * compared by value at all — post-Supabase-cutover tokens are a different
 * shape entirely. Assert presence, then replace with a placeholder so the
 * rest of the body can still be deep-compared.
 */
function redactTokens(body: any): any {
  if (body?.data && typeof body.data === 'object') {
    if ('accessToken' in body.data) {
      expect(typeof body.data.accessToken).toBe('string');
      body.data.accessToken = '<ACCESS_TOKEN>';
    }
    if ('refreshToken' in body.data) {
      expect(typeof body.data.refreshToken).toBe('string');
      body.data.refreshToken = '<REFRESH_TOKEN>';
    }
  }
  return body;
}

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/rentdito');
});

afterAll(async () => {
  await mongoose.disconnect();
});

// RESOLVED — GET /api/tickets/:id used to return 403 to the ticket's own
// reporter; see the "Known Issues" section right after this task, fixed in
// commits 7264f23 / cc03c83.

describe.each(files)('golden replay: %s', (file) => {
  const cases: GoldenCase[] = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, file), 'utf8'));

  it.each(cases)('$name', async (c: GoldenCase) => {
    let req = (request(app) as any)[c.method](c.path);

    const loginBody = AUTH_LOGIN_BODIES[c.name];
    if (loginBody) {
      req = req.send(loginBody);
    } else {
      const key = CASE_AUTH[c.name];
      if (key) req = req.set('Authorization', `Bearer ${await tokenForEmail(EMAILS[key])}`);
      const query = CASE_QUERY[c.name];
      if (query) req = req.query(query);
    }

    const res = await req;
    expect(res.status).toBe(c.status);

    const actualBody = redactTokens(res.body);
    assertDualId(actualBody, ALLOW_ID_ONLY.has(c.name));
    expect(normalizeBody(actualBody)).toEqual(normalizeBody(c.body));
  });
});
```

As in Task 3, importing `{ app }` does not connect to MongoDB — the `beforeAll`/`afterAll` pair above owns this suite's connection.

- [ ] **Step 4: Run against the current Mongo build to verify the harness is sound**

```bash
cd server && npm test -- replay
```
Expected: PASS. The fixtures were captured from this same implementation, so a failure here means the normalizer is wrong, `replay.meta.ts` is missing an entry, or the seed is non-deterministic. Fix now — a harness that cannot reproduce its own baseline is worthless as a migration gate.

- [ ] **Step 5: Commit**

```bash
git add server/tests/contract server/tests/helpers/normalize.ts server/tests/helpers/auth.ts
git commit -m "test: add golden-fixture replay contract tests"
```

---

### Known Issues (carried by the golden fixtures)

**RESOLVED — see commits `7264f23` / `cc03c83`.** `GET /api/tickets/:id` used to return 403 to the ticket's own reporter: `ticket.service.ts`'s `canAccessTicket()` compared `ticket.reportedByUserId.toString() === userId` against an already-populated object (`populateTicket` runs first), so `.toString()` yielded the string `"[object Object]"` and never matched the raw `userId`. This was fixed in `7264f23` by reading `reportedByUserId._id` first and falling back to the raw value — the same populated-or-raw idiom already used for `propertyId` one line below. `tests/golden/ticket.json`'s `ticket-by-id-owner-user1` case was deliberately re-captured in `cc03c83` and now reflects the corrected 200. A new regression test at `server/tests/contract/ticket-access.test.ts` proves the ticket's own reporter gets 200 and was confirmed to fail (403) against the pre-`7264f23` code.

`ticket-by-id-assigned` was investigated as part of the same fix and is unaffected — it stays 403 for an unrelated reason: that request is made by the *assigned staff member*, not the reporter, so the `isOwner` branch never applied to it; its denial comes from `verifyPropertyManagementAccess()`'s `assignedPropertyIds` check, which the seed never populates for staff users. That is a separate, pre-existing characteristic of the seeded data, not this bug class, and was left untouched.

---

## Phase 2 — Schema

### Task 5: Author the Prisma schema for all 27 tables

**Files:**
- Modify: `server/prisma/schema.prisma`

**Interfaces:**
- Produces: generated `@prisma/client` types — `Profile`, `Property`, `Unit`, `UnitSlot`, `Tenancy`, `TenancyComment`, `Contract`, `RentalApplication`, `Bill`, `Payment`, `Inquiry`, `Conversation`, `ConversationParticipant`, `Message`, `MessageRead`, `Ticket`, `TicketUpdate`, `Inventory`, `InventoryRecord`, `TransferRequest`, `VisitRequest`, `Notification`, `Document`, `IncidentReport`, `LandlordApplication`, `AuditLog`, `StaffPropertyAssignment`.

- [ ] **Step 1: Write the enums**

Append to `server/prisma/schema.prisma`. Values copied verbatim from the Mongoose schemas:

```prisma
enum UserRole            { user landlord staff super_admin }
enum UserStatus          { active suspended }
enum VerificationStatus  { unverified pending verified }
enum PropertyStatus      { Active Inactive Maintenance Archived }
enum PropertyType        { BoardingHouse @map("Boarding House") Apartment Studio Dormitory Commercial Parking Land MixedUse @map("Mixed Use") }
enum UtilityDefault      { included metered shared }
enum UnitStatus          { vacant occupied reserved maintenance }
enum SlotStatus          { vacant occupied reserved }
enum AccommodationType   { room bedspace }
enum TenancyStatus       { pending checked_in checked_out }
enum CommentRole         { tenant caretaker admin }
enum ContractStatus      { draft pending_review pending_signature signed active expired terminated }
enum RateType            { fixed submetered }
enum ApplicationStatus   { pending under_review approved rejected }
enum LandlordAppStatus   { pending approved rejected }
enum BillType            { rent utility penalty combined }
enum BillStatus          { unpaid partial paid overdue }
enum PaymentMethod       { cash gcash bank_transfer other }
enum InquiryStatus       { open in_progress closed converted }
enum TicketStatus        { open assigned in_progress resolved closed }
enum TicketPriority      { low medium high urgent }
enum TicketCategory      { plumbing electrical structural appliance pest other }
enum InventoryCondition  { new good fair poor damaged }
enum InventoryStatus     { available issued maintenance retired }
enum InventoryRecordStatus { active returned damaged lost }
enum TransferStatus      { pending approved rejected completed }
enum VisitPurpose        { viewing inspection }
enum VisitStatus         { pending approved scheduled completed cancelled no_show }
enum NotificationType    { inquiry message visit application contract tenancy billing maintenance system }
enum DocumentType        { lease id contract receipt incident inventory_form other }
enum IncidentType        { theft damage medical fire dispute other }
enum IncidentSeverity    { low medium high critical }
enum IncidentStatus      { open investigating resolved closed }
```

- [ ] **Step 2: Write the identity and property models**

```prisma
model Profile {
  id                 String             @id @db.Uuid
  name               String
  email              String             @unique
  phone              String?
  role               UserRole           @default(user)
  status             UserStatus         @default(active)
  verificationStatus VerificationStatus @default(unverified) @map("verification_status")
  idPhotos           String[]           @map("id_photos")
  avatar             String?
  landlordId         String?            @map("landlord_id") @db.Uuid
  permissions        String[]
  positionName       String?            @map("position_name")
  createdAt          DateTime           @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime           @updatedAt @map("updated_at") @db.Timestamptz

  landlord            Profile?                   @relation("StaffOfLandlord", fields: [landlordId], references: [id], onDelete: SetNull)
  staff               Profile[]                  @relation("StaffOfLandlord")
  assignedProperties  StaffPropertyAssignment[]
  properties          Property[]

  @@index([role])
  @@index([landlordId])
  @@map("profiles")
}

model StaffPropertyAssignment {
  staffId    String   @map("staff_id") @db.Uuid
  propertyId String   @map("property_id") @db.Uuid
  staff      Profile  @relation(fields: [staffId], references: [id], onDelete: Cascade)
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@id([staffId, propertyId])
  @@map("staff_property_assignments")
}

model Property {
  id          String         @id @default(uuid()) @db.Uuid
  landlordId  String         @map("landlord_id") @db.Uuid
  name        String
  description String
  street      String
  barangay    String?
  city        String
  province    String
  zipCode     String         @map("zip_code")
  country     String         @default("Philippines")
  amenities   String[]
  inclusions  String[]
  images      String[]
  propertyType PropertyType  @map("property_type")
  status      PropertyStatus @default(Active)

  venues            Json?
  emergencyContacts Json?    @map("emergency_contacts")

  billingDay     Int            @default(1) @map("billing_day")
  dueDay         Int            @default(5) @map("due_day")
  lateFeePercent Decimal        @default(5) @map("late_fee_percent") @db.Decimal(5, 2)
  utilityDefault UtilityDefault @default(metered) @map("utility_default")

  latitude  Decimal? @db.Decimal(10, 7)
  longitude Decimal? @db.Decimal(10, 7)

  totalUnits    Int     @default(0) @map("total_units")
  occupiedUnits Int     @default(0) @map("occupied_units")
  vacantUnits   Int     @default(0) @map("vacant_units")
  occupancyRate Decimal @default(0) @map("occupancy_rate") @db.Decimal(5, 2)

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  landlord Profile @relation(fields: [landlordId], references: [id], onDelete: Restrict)
  units    Unit[]
  assignedStaff StaffPropertyAssignment[]

  @@index([landlordId])
  @@index([city])
  @@index([status])
  @@index([latitude, longitude])
  @@map("properties")
}

model Unit {
  id                String            @id @default(uuid()) @db.Uuid
  propertyId        String            @map("property_id") @db.Uuid
  unitIdentifier    String            @map("unit_identifier")
  accommodationType AccommodationType @map("accommodation_type")
  roomRent          Decimal?          @map("room_rent") @db.Decimal(12, 2)
  bedspaceRent      Decimal?          @map("bedspace_rent") @db.Decimal(12, 2)
  perHeadRate       Decimal?          @map("per_head_rate") @db.Decimal(12, 2)
  deposit           Decimal           @db.Decimal(12, 2)
  capacity          Int
  maxOccupants      Int               @map("max_occupants")
  sizeSqm           Decimal?          @map("size_sqm") @db.Decimal(8, 2)
  features          String[]
  images            String[]
  status            UnitStatus        @default(vacant)
  createdAt         DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime          @updatedAt @map("updated_at") @db.Timestamptz

  property Property   @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  slots    UnitSlot[]

  @@unique([propertyId, unitIdentifier])
  @@map("units")
}

model UnitSlot {
  id         String     @id @default(uuid()) @db.Uuid
  unitId     String     @map("unit_id") @db.Uuid
  slotNumber Int        @map("slot_number")
  status     SlotStatus @default(vacant)
  tenancyId  String?    @map("tenancy_id") @db.Uuid

  unit    Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  tenancy Tenancy? @relation(fields: [tenancyId], references: [id], onDelete: SetNull)

  @@unique([unitId, slotNumber])
  @@map("unit_slots")
}
```

- [ ] **Step 3: Write the remaining 21 models**

Follow the identical conventions: `@id @default(uuid()) @db.Uuid`, snake_case `@map` on every multi-word column, `@db.Timestamptz` on all dates, `Decimal @db.Decimal(12, 2)` on all money, and one `@@index` per Mongoose `.index()` recorded in the source model. The eight `pd_*` columns on `Tenancy` and `RentalApplication`, and the two `billing_period_*` columns on `Bill`, come from the Schema Mapping table above. `Notification.metadata` and `AuditLog.details` are `Json?`.

Cross-check every model against its source file in `server/src/models/` before moving on — the source is authoritative for nullability and defaults.

- [ ] **Step 4: Validate and generate**

```bash
cd server && npx prisma validate && npx prisma generate
```
Expected: `The schema at prisma/schema.prisma is valid` followed by a successful client generation.

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(db): add Prisma schema for all 27 tables"
```

---

### Task 6: Apply the initial migration with triggers, partial indexes, CHECK constraints, citext email, and the auth.users FK

**Files:**
- Create: `server/prisma/migrations/*_init/migration.sql`, `server/prisma/sql/triggers.sql`

**Interfaces:**
- Produces: a live Postgres schema; the `refresh_property_metrics()` trigger replacing `Unit.post()` hooks; the 27 `min`/`max`-derived CHECK constraints; case-insensitive `profiles.email` via `citext`; the FK from `profiles.id` to `auth.users.id`.

> **WORKFLOW UPDATE (post-incident, see task-6-report.md §8-§10 and its
> follow-up):** Once
> `profiles.id` carries a FK into Supabase's `auth` schema (Step 6 below), Prisma
> can no longer introspect this database — every command that introspects
> (`prisma migrate dev`, `prisma db pull`, `migrate diff --from-schema-datasource`)
> fails with **P4002** ("Cross schema references are only allowed when the
> target schema is listed in the `schemas` property..."). Adding `auth` to
> `datasource.schemas` is the wrong fix — it would put the Supabase-owned `auth`
> schema under Prisma's management.
>
> From Task 6 onward (this task included), every migration in this project is
> produced and applied with:
> ```bash
> npx prisma migrate diff \
>   --from-migrations ./prisma/migrations \
>   --to-schema-datamodel ./prisma/schema.prisma \
>   --shadow-database-url <A THROWAWAY DATABASE, NEVER A REAL ONE> \
>   --script > prisma/migrations/<timestamp>_<name>/migration.sql
> # review/hand-edit the generated SQL, then:
> npx prisma migrate deploy
> ```
> **`--shadow-database-url` RESETS whatever database it points at** (Prisma
> drops and recreates the schema there to compute the diff). This is not a
> "point it at prod and it'll be careful" flag — it is destructive by design.
> **Never pass `DATABASE_URL` or `DIRECT_URL` (or any other real/shared
> database) as the shadow database.** Use a disposable local Postgres
> (e.g. a throwaway Docker container) that you can afford to have wiped, or —
> if none is available — skip the shadow-database diff entirely and hand-author
> the migration SQL directly, then verify it with `migrate deploy` +
> `migrate status` against the real database. This is exactly what caused the
> live-database reset documented in task-6-report.md §8: `DIRECT_URL` was
> passed as `--shadow-database-url` and Prisma reset the live project database.
> Nothing was lost that time only because the database held no data yet — with
> real data present this would be destructive, not merely inconvenient.
>
> `prisma migrate dev` (Steps 1 and 7 below, as originally written) **must
> not be used** once this FK exists — its drift-detection introspection hits
> the same P4002. Use `migrate deploy` to apply, and the `migrate diff` +
> hand-edit flow above to generate new migrations.

- [ ] **Step 1: Generate the migration**

~~```bash
cd server && npx prisma migrate dev --name init --create-only
```~~
**Superseded — do not run this.** At the time this step was originally written,
`profiles.id`'s FK into `auth.users` did not exist yet, so `migrate dev
--create-only` (which introspects to compute drift) would have worked. In
practice the migration was produced and reviewed by hand instead — see
`server/prisma/migrations/20260830100425_init/migration.sql` and
`server/prisma/sql/triggers.sql` — and the same hand-authored approach is now
mandatory for every subsequent migration (see the workflow note above).
Expected outcome either way: a `migration.sql` is written but not yet applied.
Read it and confirm all 27 tables plus every enum are present.

- [ ] **Step 2: Append the partial unique indexes**

Paste the three `CREATE UNIQUE INDEX … WHERE …` statements from the Schema Mapping section verbatim to the end of the generated `migration.sql`. Prisma cannot express partial indexes, so they must live in raw SQL or the uniqueness guarantees from Mongo are silently lost.

- [ ] **Step 3: Append the property-metrics trigger**

This replaces the four `UnitSchema.post()` hooks and fixes the `deleteMany` gap the original code documents as a known limitation:

```sql
CREATE OR REPLACE FUNCTION refresh_property_metrics() RETURNS TRIGGER AS $$
DECLARE
  target UUID := COALESCE(NEW.property_id, OLD.property_id);
BEGIN
  UPDATE properties p SET
    total_units    = s.total,
    occupied_units = s.occupied,
    vacant_units   = s.vacant,
    occupancy_rate = CASE WHEN s.total > 0
                          THEN ROUND((s.occupied::numeric / s.total) * 100, 2)
                          ELSE 0 END
  FROM (
    SELECT
      COUNT(*)                                        AS total,
      COUNT(*) FILTER (WHERE status = 'occupied')     AS occupied,
      COUNT(*) FILTER (WHERE status = 'vacant')       AS vacant
    FROM units WHERE property_id = target
  ) s
  WHERE p.id = target;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER units_refresh_property_metrics
  AFTER INSERT OR UPDATE OF status, property_id OR DELETE ON units
  FOR EACH ROW EXECUTE FUNCTION refresh_property_metrics();
```

- [ ] **Step 4: Append CHECK constraints for the Mongoose min/max validators Prisma cannot express**

27 Mongoose `min`/`max` validators have no Prisma equivalent and would otherwise be silently unenforced in Postgres, letting invalid data (negative rent, zero-capacity units) become insertable post-cutover. Append to the end of `migration.sql`:

```sql
ALTER TABLE properties
  ADD CONSTRAINT properties_billing_day_check CHECK (billing_day BETWEEN 1 AND 31),
  ADD CONSTRAINT properties_due_day_check CHECK (due_day BETWEEN 1 AND 31),
  ADD CONSTRAINT properties_late_fee_percent_check CHECK (late_fee_percent >= 0 AND late_fee_percent <= 100);

ALTER TABLE units
  ADD CONSTRAINT units_room_rent_check CHECK (room_rent IS NULL OR room_rent >= 0),
  ADD CONSTRAINT units_bedspace_rent_check CHECK (bedspace_rent IS NULL OR bedspace_rent >= 0),
  ADD CONSTRAINT units_per_head_rate_check CHECK (per_head_rate IS NULL OR per_head_rate >= 0),
  ADD CONSTRAINT units_deposit_check CHECK (deposit >= 0),
  ADD CONSTRAINT units_size_sqm_check CHECK (size_sqm IS NULL OR size_sqm >= 0),
  ADD CONSTRAINT units_capacity_check CHECK (capacity >= 1),
  ADD CONSTRAINT units_max_occupants_check CHECK (max_occupants >= 1);

ALTER TABLE contracts
  ADD CONSTRAINT contracts_lock_in_period_check CHECK (lock_in_period >= 0),
  ADD CONSTRAINT contracts_monthly_rent_check CHECK (monthly_rent >= 0),
  ADD CONSTRAINT contracts_security_deposit_check CHECK (security_deposit >= 0),
  ADD CONSTRAINT contracts_advance_payment_check CHECK (advance_payment >= 0);

ALTER TABLE bills
  ADD CONSTRAINT bills_rent_amount_check CHECK (rent_amount >= 0),
  ADD CONSTRAINT bills_utility_amount_check CHECK (utility_amount >= 0),
  ADD CONSTRAINT bills_penalty_amount_check CHECK (penalty_amount >= 0),
  ADD CONSTRAINT bills_total_amount_check CHECK (total_amount >= 0),
  ADD CONSTRAINT bills_paid_amount_check CHECK (paid_amount >= 0),
  ADD CONSTRAINT bills_balance_amount_check CHECK (balance_amount >= 0);

ALTER TABLE payments
  ADD CONSTRAINT payments_amount_check CHECK (amount >= 0.01);

ALTER TABLE tenancies
  ADD CONSTRAINT tenancies_slot_number_check CHECK (slot_number IS NULL OR slot_number >= 1);

ALTER TABLE inventories
  ADD CONSTRAINT inventories_quantity_check CHECK (quantity >= 1),
  ADD CONSTRAINT inventories_available_quantity_check CHECK (available_quantity >= 0),
  ADD CONSTRAINT inventories_purchase_cost_check CHECK (purchase_cost IS NULL OR purchase_cost >= 0);

ALTER TABLE inventory_records
  ADD CONSTRAINT inventory_records_quantity_issued_check CHECK (quantity_issued >= 1),
  ADD CONSTRAINT inventory_records_penalty_amount_check CHECK (penalty_amount IS NULL OR penalty_amount >= 0);
```

If a column name above does not match Task 5's actual `@map`, adjust the constraint to the real column name — the invariant being enforced (the original Mongoose `min`/`max`) is what matters, not the exact identifier. `trim`/`lowercase` string normalization from the Mongoose schemas has no owning task anywhere in this plan; it is intentionally not ported — Postgres has no equivalent built-in and re-adding it would mean validating input shape in the service layer, which is out of scope for this migration.

- [ ] **Step 5: Restore case-insensitive email uniqueness**

`User.ts` had `lowercase: true` before its unique index; a bare `email String @unique` in Postgres is case-sensitive, so `A@x.com` and `a@x.com` could coexist post-cutover — a duplicate-account and failed-login-match risk that did not exist under Mongo. Append:

```sql
CREATE EXTENSION IF NOT EXISTS citext;
ALTER TABLE profiles ALTER COLUMN email TYPE citext;
```

Retyping the column to `citext` makes the existing `UNIQUE` constraint Prisma already generated on `email` case-insensitive without needing to drop and recreate it. Task 7 must additionally keep the existing app-level `email.toLowerCase()` calls in `auth.service.ts` — the citext column makes *storage and comparison* case-insensitive, but does not stop mixed-case input from being written, so keep normalizing at the boundary too.

- [ ] **Step 6: Add the FK from `profiles.id` to Supabase's `auth.users.id`**

Prisma does not manage the `auth` schema, so without this, `profiles.id` is a bare UUID with no referential link to the Supabase Auth user it names — deleting an auth user leaves an orphaned profile behind. Append:

```sql
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
```

`ON DELETE CASCADE` here is deliberate: a `profiles` row has no meaning once its owning `auth.users` row is gone, so removing the auth user should remove the profile rather than leaving it to fail lookups silently.

- [ ] **Step 7: Apply**

~~```bash
cd server && npx prisma migrate dev
```~~
**Superseded — use `migrate deploy` instead** (see the workflow note above the
Step 1 heading: `migrate dev`'s drift-detection introspection fails with P4002
once the `auth.users` FK exists, which it does as of Step 6 above):
```bash
cd server && npx prisma migrate deploy
```
Expected: `All migrations have been successfully applied.` (or, for a schema
already at this state, `Database schema is up to date!` — confirm with
`npx prisma migrate status`, not the `migrate dev` "in sync" message, which
this command does not print).

- [ ] **Step 8: Verify the trigger works**

```bash
cd server && npx prisma db execute --stdin <<'SQL'
SELECT tgname FROM pg_trigger WHERE tgname = 'units_refresh_property_metrics';
SQL
```
Expected: one row returned.

- [ ] **Step 9: Commit**

```bash
git add server/prisma/migrations
git commit -m "feat(db): apply initial migration with metrics trigger, partial indexes, CHECK constraints, citext email, and auth.users FK"
```

---

## Phase 3 — Auth

### Task 7: Proxy Supabase Auth behind the frozen `/api/auth/*` contract

**Files:**
- Create: `server/src/config/supabase.ts`
- Modify: `server/src/services/auth.service.ts`, `server/src/middleware/auth.ts`, `server/src/utils/jwt.ts`
- Test: `server/tests/contract/auth.test.ts`

**Interfaces:**
- Consumes: `prisma` from Task 1.
- Produces: `supabaseAdmin` (a `SupabaseClient`) from `server/src/config/supabase.ts`; `auth.service` keeps its existing exported names — `register`, `login`, `refreshToken`, `forgotPassword`, `resetPassword`, `logout` — with unchanged signatures and unchanged return shapes.

- [ ] **Step 1: Write the failing contract test**

Create `server/tests/contract/auth.test.ts`:

```typescript
import request from 'supertest';
// IMPORTANT: named import — server.ts's connectDB()/app.listen() are guarded
// behind `require.main === module` (Task 2), so the default export is
// `undefined` on import. Importing `app` does NOT connect to MongoDB; this
// suite does not need it either, since after this task's rewrite
// /api/auth/login is served entirely by Prisma + Supabase, not Mongoose.
import { app } from '../../src/server';

describe('POST /api/auth/login', () => {
  it('returns camelCase tokens and a dual-id user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'landlord@rentdito.test', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data).not.toHaveProperty('access_token');
    expect(res.body.data.user.id).toBe(res.body.data.user._id);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && npm test -- auth
```
Expected: FAIL — the user does not exist in Supabase yet and the service still reads Mongo.

- [ ] **Step 3: Add the admin client**

Create `server/src/config/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
```

- [ ] **Step 4: Rewrite register and login**

Replace the bodies in `server/src/services/auth.service.ts`, keeping export names and return shapes identical:

```typescript
import { supabaseAdmin } from '../config/supabase';
import prisma from '../config/prisma';
import { serializeDoc } from '../utils/serialize';

export const register = async (data: {
  name: string; email: string; phone?: string; password: string;
}) => {
  const email = data.email.toLowerCase();

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: false,
  });
  if (error) {
    const status = error.status === 422 ? 409 : 400;
    throw Object.assign(new Error(
      status === 409 ? 'Email already registered' : error.message
    ), { statusCode: status });
  }

  const profile = await prisma.profile.create({
    data: { id: created.user.id, name: data.name, email, phone: data.phone, role: 'user' },
  });

  const session = await signIn(email, data.password);
  return { user: serializeDoc(profile), ...session };
};

/** Sign in against Supabase and remap snake_case tokens to the frozen contract. */
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }
  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
};

export const login = async (email: string, password: string) => {
  const normalized = email.toLowerCase();
  const profile = await prisma.profile.findUnique({ where: { email: normalized } });
  if (!profile) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }
  if (profile.status === 'suspended') {
    throw Object.assign(new Error('Account is suspended. Contact support.'), { statusCode: 403 });
  }
  if (profile.verificationStatus !== 'verified') {
    throw Object.assign(new Error('Please verify your email address to continue.'), { statusCode: 403 });
  }
  const session = await signIn(normalized, password);
  return { user: serializeDoc(profile), ...session };
};
```

The `suspended` and `verificationStatus` checks must stay ahead of the Supabase call, and their messages and status codes must match the originals exactly — the client surfaces these strings directly.

- [ ] **Step 5: Rewrite refresh, forgotPassword, resetPassword, logout**

```typescript
export const refreshToken = async (incoming: string) => {
  const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: incoming });
  if (error || !data.session || !data.user) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }
  const profile = await prisma.profile.findUnique({ where: { id: data.user.id } });
  return {
    user: profile ? serializeDoc(profile) : undefined,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
};

export const forgotPassword = async (email: string) => {
  // Supabase sends the mail; never reveal whether the address exists.
  await supabaseAdmin.auth.resetPasswordForEmail(email.toLowerCase(), {
    redirectTo: `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password`,
  });
};

export const resetPassword = async (token: string, newPassword: string) => {
  const { data, error } = await supabaseAdmin.auth.verifyOtp({ token_hash: token, type: 'recovery' });
  if (error || !data.user) {
    throw Object.assign(new Error('Invalid or expired reset token'), { statusCode: 400 });
  }
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    data.user.id, { password: newPassword }
  );
  if (updateError) {
    throw Object.assign(new Error('Failed to reset password'), { statusCode: 400 });
  }
};

export const logout = async (userId: string) => {
  await supabaseAdmin.auth.admin.signOut(userId);
};
```

`nodemailer` is no longer used for password resets. Leave `server/src/config/mailer.ts` in place — `reminder.service.ts` still uses it for billing reminders.

- [ ] **Step 6: Rewrite the auth middleware to verify Supabase tokens**

Replace the verification block in `server/src/middleware/auth.ts`. The exported `AuthRequest` interface and all 401 response bodies stay byte-identical:

```typescript
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';

const token = authHeader.split(' ')[1];
try {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    res.status(500).json({ status: 'error', message: 'Server misconfiguration: JWT secret not set' });
    return;
  }
  const decoded = jwt.verify(token, secret) as { sub: string };
  const profile = await prisma.profile.findUnique({
    where: { id: decoded.sub },
    select: { id: true, role: true },
  });
  if (!profile) {
    res.status(401).json({ status: 'error', message: 'Invalid token.' });
    return;
  }
  req.user = { id: profile.id, role: profile.role };
  next();
} catch (error: any) {
  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      status: 'error',
      message: 'Token expired. Please refresh your token.',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }
  res.status(401).json({ status: 'error', message: 'Invalid token.' });
}
```

The `TOKEN_EXPIRED` code must be preserved — `apiClient.ts` keys its refresh-and-retry flow on the 401 status, and any change to these bodies risks a redirect loop to `/login`.

The middleware is now async. Change its signature to `async (req, res, next)` and confirm Express 5 handles the returned promise; Express 5 forwards async rejections to the error handler automatically.

- [ ] **Step 7: Reduce utils/jwt.ts**

Delete `signAccess` and `signRefresh` — Supabase issues tokens now. Keep only `verifyToken` if any caller still needs it; otherwise delete the file and remove its imports. Check first:

```bash
cd server && grep -rn "signAccess\|signRefresh\|utils/jwt" src/
```
Remove every hit.

- [ ] **Step 8: Run tests**

```bash
cd server && npm test -- auth
```
Expected: PASS. If login 401s, confirm the seed created the user in Supabase Auth (Task 12) — a `profiles` row alone is not enough.

- [ ] **Step 9: Commit**

```bash
git add server/src/config/supabase.ts server/src/services/auth.service.ts server/src/middleware/auth.ts server/src/utils/jwt.ts server/tests/contract/auth.test.ts
git commit -m "feat(auth): proxy Supabase Auth behind existing API contract"
```

---

### Task 8: The dual `id`/`_id` serializer

**Files:**
- Create: `server/src/utils/serialize.ts`
- Test: `server/tests/unit/serialize.test.ts`

**Interfaces:**
- Produces:
  - `serializeDoc<T extends { id: string }>(doc: T | null): Record<string, unknown> | null`
  - `serializeList<T extends { id: string }>(docs: T[]): Record<string, unknown>[]`

Both recurse into nested objects and arrays so populated relations also gain `_id`, and both convert `Decimal` to `number` so JSON output matches what Mongo emitted.

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/serialize.test.ts`:

```typescript
import { Prisma } from '@prisma/client';
import { serializeDoc, serializeList } from '../../src/utils/serialize';

describe('serializeDoc', () => {
  it('mirrors id into _id', () => {
    const out = serializeDoc({ id: 'abc', name: 'Sunrise' }) as any;
    expect(out.id).toBe('abc');
    expect(out._id).toBe('abc');
  });

  it('recurses into nested relations', () => {
    const out = serializeDoc({
      id: 'bill-1',
      tenancy: { id: 'ten-1', pdFullName: 'Ana' },
    }) as any;
    expect(out.tenancy._id).toBe('ten-1');
  });

  it('recurses into arrays', () => {
    const out = serializeDoc({ id: 'p1', units: [{ id: 'u1' }, { id: 'u2' }] }) as any;
    expect(out.units.map((u: any) => u._id)).toEqual(['u1', 'u2']);
  });

  it('converts Decimal to number', () => {
    const out = serializeDoc({ id: 'u1', deposit: new Prisma.Decimal('5000.00') }) as any;
    expect(out.deposit).toBe(5000);
    expect(typeof out.deposit).toBe('number');
  });

  it('preserves Date instances', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    const out = serializeDoc({ id: 'x', dueDate: d }) as any;
    expect(out.dueDate).toBeInstanceOf(Date);
  });

  it('returns null for null', () => {
    expect(serializeDoc(null)).toBeNull();
  });

  it('serializeList maps every element', () => {
    expect(serializeList([{ id: 'a' }, { id: 'b' }]).map((d: any) => d._id)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && npm test -- serialize
```
Expected: FAIL with "Cannot find module '../../src/utils/serialize'".

- [ ] **Step 3: Implement**

Create `server/src/utils/serialize.ts`:

```typescript
import { Prisma } from '@prisma/client';

const isDecimal = (v: unknown): v is Prisma.Decimal =>
  v instanceof Prisma.Decimal;

/**
 * Recursively prepare a Prisma result for JSON output:
 *  - mirrors `id` into `_id` so existing client code keeps working
 *  - converts Decimal to number, matching what Mongo used to emit
 * Dates are left as Date instances; Express serializes them to ISO strings.
 */
const walk = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (isDecimal(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(walk);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v);
    }
    if (typeof out.id === 'string') out._id = out.id;
    return out;
  }
  return value;
};

export function serializeDoc<T extends object>(doc: T | null): Record<string, unknown> | null {
  if (doc === null || doc === undefined) return null;
  return walk(doc) as Record<string, unknown>;
}

export function serializeList<T extends object>(docs: T[]): Record<string, unknown>[] {
  return docs.map((d) => walk(d) as Record<string, unknown>);
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd server && npm test -- serialize
```
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/serialize.ts server/tests/unit/serialize.test.ts
git commit -m "feat(api): add dual id/_id response serializer"
```

---

### Task 9: Prisma error mapping

**Files:**
- Create: `server/src/utils/prismaErrors.ts`
- Test: `server/tests/unit/prismaErrors.test.ts`

**Interfaces:**
- Produces: `toHttpError(e: unknown): Error & { statusCode: number }` — maps `P2002` (unique violation) → 409, `P2025` (record not found) → 404, `P2003` (FK violation) → 400, anything else → 500.

- [ ] **Step 1: Write the failing test**

```typescript
import { Prisma } from '@prisma/client';
import { toHttpError } from '../../src/utils/prismaErrors';

const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: '6.0.0' });

describe('toHttpError', () => {
  it('maps P2002 to 409', () => expect(toHttpError(known('P2002')).statusCode).toBe(409));
  it('maps P2025 to 404', () => expect(toHttpError(known('P2025')).statusCode).toBe(404));
  it('maps P2003 to 400', () => expect(toHttpError(known('P2003')).statusCode).toBe(400));
  it('maps unknown errors to 500', () => expect(toHttpError(new Error('x')).statusCode).toBe(500));
  it('passes through an error that already has a statusCode', () => {
    const e = Object.assign(new Error('nope'), { statusCode: 403 });
    expect(toHttpError(e).statusCode).toBe(403);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && npm test -- prismaErrors
```
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```typescript
import { Prisma } from '@prisma/client';

const CODE_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: 'A record with these values already exists' },
  P2025: { status: 404, message: 'Record not found' },
  P2003: { status: 400, message: 'Referenced record does not exist' },
};

export function toHttpError(e: unknown): Error & { statusCode: number } {
  if (e && typeof e === 'object' && 'statusCode' in e) {
    return e as Error & { statusCode: number };
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = CODE_MAP[e.code];
    if (mapped) {
      return Object.assign(new Error(mapped.message), { statusCode: mapped.status });
    }
  }
  return Object.assign(
    new Error(e instanceof Error ? e.message : 'Internal server error'),
    { statusCode: 500 }
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd server && npm test -- prismaErrors
```
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/prismaErrors.ts server/tests/unit/prismaErrors.test.ts
git commit -m "feat(api): map Prisma error codes to HTTP status codes"
```

---

## Phase 4 — Service Layer Port

Twenty-four services, ordered so that the ones everything else depends on land first, and the highest-populate-density ones get the most attention while the pattern is freshest.

**The pattern, established once in Task 10 and applied by every task after it:**

| Mongoose | Prisma |
|---|---|
| `Model.find(q)` | `prisma.model.findMany({ where: q })` |
| `Model.findById(id)` | `prisma.model.findUnique({ where: { id } })` |
| `Model.findOne(q)` | `prisma.model.findFirst({ where: q })` |
| `.populate('propertyId')` | `include: { property: true }` |
| `.populate('userId', 'name email')` | `include: { user: { select: { id: true, name: true, email: true } } }` |
| `Model.create(d)` | `prisma.model.create({ data: d })` |
| `Model.findByIdAndUpdate(id, d)` | `prisma.model.update({ where: { id }, data: d })` |
| `Model.countDocuments(q)` | `prisma.model.count({ where: q })` |
| `{ field: { $in: xs } }` | `{ field: { in: xs } }` |
| `.sort({ createdAt: -1 })` | `orderBy: { createdAt: 'desc' }` |
| `.skip(n).limit(m)` | `skip: n, take: m` |

**The naming trap.** Mongoose populates *in place*: `.populate('propertyId')` replaces the `propertyId` string with the property object under the key `propertyId`. Prisma puts it under a separate relation key (`property`) and leaves `propertyId` as the scalar. The client reads both forms — `shared.ts` defines `Ref<T> = string | T` and `resolveId()` handles either. **Every service must therefore return the relation under the original `propertyId`-style key**, done in the mapping step:

```typescript
const row = await prisma.bill.findUnique({
  where: { id },
  include: { property: true, unit: true, tenancy: true },
});
if (!row) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });
const { property, unit, tenancy, ...rest } = row;
return serializeDoc({ ...rest, propertyId: property, unitId: unit, tenancyId: tenancy });
```

The golden replay tests from Task 4 catch any service that forgets this.

### Task 10: Port property.service.ts (the exemplar)

**Files:**
- Modify: `server/src/services/property.service.ts`
- Test: `server/tests/contract/property.test.ts`

**Interfaces:**
- Consumes: `prisma`, `serializeDoc`, `serializeList`, `toHttpError`.
- Produces: the established relation-remapping pattern that Tasks 11–29 follow. Exported function names and signatures are unchanged.

- [ ] **Step 1: Record the current surface**

```bash
cd server && grep -n "^export const\|^export async function" src/services/property.service.ts
grep -c "populate" src/services/property.service.ts
```
Expected: 4 populate calls. Every exported name here must still exist, with the same parameters, when the task is done.

- [ ] **Step 2: Run the golden replay to confirm the baseline is green**

```bash
cd server && npm test -- replay
```
Expected: PASS (still on Mongo). This is the before-picture.

- [ ] **Step 3: Rewrite the service**

Replace `import { Property } from '../models/Property'` with `import prisma from '../config/prisma'` and convert each function using the mapping table above. Preserve every thrown error's message and `statusCode`. Where the old code returned a Mongoose document, return `serializeDoc(...)`; where it returned an array, return `serializeList(...)`.

Do not touch `property.controller.ts` — it consumes only the service's return values.

- [ ] **Step 4: Typecheck**

```bash
cd server && npx tsc --noEmit
```
Expected: exit 0. Errors elsewhere are expected while other services still use Mongoose — only `property.service.ts` must be clean.

- [ ] **Step 5: Run the property contract tests**

```bash
cd server && npm test -- property
```
Expected: PASS, matching the golden fixtures.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/property.service.ts server/tests/contract/property.test.ts
git commit -m "refactor(property): port property service to Prisma"
```

---

### Tasks 11–29: Port the remaining services

Each follows Task 10's six steps exactly. Ordered by dependency, then by populate density. Every task: rewrite the service, keep exported names and error messages identical, remap relations onto the original `*Id` keys, `npx tsc --noEmit`, run that domain's golden replay, commit as `refactor(<domain>): port <name> service to Prisma`.

| Task | Service | populates | Domain-specific notes |
|---|---|---|---|
| 11 | `user.service.ts` | 1 | Reads `profiles`. `assignedPropertyIds` now comes from `staff_property_assignments` — return it as a flat array of IDs to preserve the response shape. `getMe` currently does `const TenancyModel = mongoose.default.models['Tenancy']` via a lazy dynamic `import('mongoose')` purely to dodge a circular dependency between `user.service.ts` and the Tenancy model — Prisma has no such cycle (all models live on one `prisma` client), so drop the hack entirely and query `prisma.tenancy.findFirst({ where: { userId, status: 'checked_in' }, include: { property: true, unit: true } })` directly. `changePassword` must also be ported here, not left behind: it currently reads `hash`/`compare` from `utils/password.ts` (bcrypt) — verify the current password via `supabaseAdmin.auth.signInWithPassword({ email, password: currentPassword })` (401/400 on failure, matching the existing "Current password is incorrect." message and status code), then set the new one via `supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })`. `utils/password.ts` has no other consumer left in this service after that — Task 31 deletes the file, and if `changePassword` is not ported first, either the build breaks on the missing import or password changes silently stop working post-cutover. |
| 12 | `team.service.ts` | 1 | Staff creation goes through `supabaseAdmin.auth.admin.createUser` then a `profiles` insert, inside one `prisma.$transaction`. Roll back the Supabase user if the profile insert fails. |
| 13 | `unit.service.ts` | 5 | `slots` is now the `unit_slots` child table — write via nested `create`. Drop the manual property-metrics update; the Task 6 trigger owns it. One of the three `new mongoose.Types.ObjectId` sites is here. |
| 14 | `public.service.ts` | 3 | Listing queries. No auth context; keep the existing `status: 'Active'` filters. |
| 15 | `landlord-application.service.ts` | 3 | On approval, updates `profiles.role` to `landlord` — wrap the approval and role change in one transaction. |
| 16 | `inquiry.service.ts` | 10 | Creates a `Conversation` alongside the inquiry; `participants` is now a child table. |
| 17 | `message.service.ts` | 3 | `readBy` becomes `message_reads`. Marking read is an `upsert` on the composite key, not an `$addToSet`. |
| 18 | `visit.service.ts` | 20 | Six repeats of `.populate(['userId','propertyId','unitId','assignedStaffId'])` — define one shared `include` constant and reuse it. |
| 19 | `application.service.ts` | 18 | `personalDetails` is now eight `pd_*` columns; rebuild the nested object in the mapping step so the response shape is unchanged. The `rental_applications_active_uniq` partial index now enforces what the code checked manually — keep the explicit check for its friendlier error message. |
| 20 | `contract.service.ts` | 27 | Creates before Tenancy exists; `tenancyId` is backfilled later. Uses `puppeteer` for PDF generation — that path is unrelated to the DB and must not change. |
| 21 | `tenancy.service.ts` | 28 | Largest state machine. `comments` → `tenancy_comments`, `householdMembers` → jsonb, `personalDetails` → `pd_*` columns. Check-in/check-out must move to `prisma.$transaction` — these were multi-document writes with no atomicity under Mongo, so this is a genuine fix. |
| 22 | `billing.service.ts` | 30 | `billingPeriod` → two columns. Bill totals and balances must stay `Decimal` end-to-end; only `serializeDoc` converts to number. Never compute money in JS floats. |
| 23 | `payment.service.ts` | — | Recording a payment updates the parent bill's `paidAmount`, `balanceAmount`, and `status`. Wrap in `prisma.$transaction` — previously non-atomic. |
| 24 | `transfer.service.ts` | 41 | Highest density. Completing a transfer touches TransferRequest, Tenancy, and two Units — one transaction. Six repeated 4-way populates; use one shared `include` constant. |
| 25 | `ticket.service.ts` | 8 | `updates[]` → `ticket_updates`; append via nested `create`, ordered by `createdAt`. |
| 26 | `inventory.service.ts` | 12 | Holds 2 of the 9 aggregations (`mostDamagedItems`, `depreciation`). Rewrite as `prisma.groupBy` where the shape allows, `$queryRaw` where it doesn't. `availableQuantity` clamping from the `pre('validate')` hook moves into the service. |
| 27 | `utility.service.ts` | 1 | Reads `utilityBreakdown` jsonb. Analytics filter in JS after fetch, as today. |
| 28 | `report.service.ts` | 3 | Holds 3 aggregations including a `$lookup` + `$unwind` and a `$year`/`$month` grouping over `checkOutDate`. Rewrite as `$queryRaw` with `date_trunc('month', check_out_date)`. |
| 29 | `financial.service.ts`, `admin.service.ts`, `document.service.ts`, `security.service.ts`, `notification.service.ts`, `scheduler.service.ts`, `reminder.service.ts` | 1,1,2,4,—,6,3 | Group these seven low-density services into one task. `admin.service` holds 3 aggregations over Bill and User — `prisma.groupBy`. `scheduler`/`reminder` run under `node-cron`; keep `ENABLE_CRON` gating and confirm `initScheduler()` still fires from `server.ts`. |

---

## Phase 5 — Seed and Cutover

### Task 30: Rewrite the seed against Prisma and Supabase Auth

**Files:**
- Modify: `server/src/seeds/seed.ts`

**Interfaces:**
- Consumes: `prisma`, `supabaseAdmin`.
- Produces: a deterministic dataset matching the one Task 3's fixtures were captured against.

- [ ] **Step 1: Rewrite user creation**

Every seeded user needs a Supabase Auth user *and* a `profiles` row sharing its UUID:

```typescript
async function seedUser(email: string, password: string, profile: {
  name: string; role: 'user' | 'landlord' | 'staff' | 'super_admin'; phone?: string;
}) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) throw error;
  return prisma.profile.create({
    data: { id: data.user.id, email, verificationStatus: 'verified', ...profile },
  });
}
```

`email_confirm: true` matters — `login` rejects any profile whose `verificationStatus` is not `verified`.

- [ ] **Step 2: Rewrite entity creation in FK order**

Order: Profiles → Properties → Units (+ slots) → RentalApplications → Contracts → Tenancies → backfill `contracts.tenancyId` → Bills → Payments → everything else. Use `prisma.$transaction` per group.

Do not set `totalUnits`/`occupiedUnits`/`vacantUnits`/`occupancyRate` on properties — the Task 6 trigger computes them. Setting them manually will be overwritten and masks trigger bugs.

- [ ] **Step 3: Make it idempotent**

Begin with a teardown that deletes in reverse FK order, and delete the Supabase Auth users too — otherwise the second run fails on duplicate emails:

```typescript
const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
for (const u of existing.users) {
  if (u.email?.endsWith('@rentdito.test')) {
    await supabaseAdmin.auth.admin.deleteUser(u.id);
  }
}
```

- [ ] **Step 4: Run it twice**

```bash
cd server && npm run seed && npm run seed
```
Expected: both runs exit 0. A failure on the second run means teardown is incomplete.

- [ ] **Step 5: Commit**

```bash
git add server/src/seeds/seed.ts
git commit -m "feat(seed): rewrite seed against Prisma and Supabase Auth"
```

---

### Task 31: Cut over and remove Mongoose

**Files:**
- Modify: `server/src/server.ts`, `server/package.json`
- Delete: `server/src/models/` (21 files), `server/src/config/db.ts`, `server/src/utils/password.ts`

- [ ] **Step 1: Confirm nothing still imports a model**

```bash
cd server && grep -rn "from '../models\|from './models\|mongoose" src/ | grep -v node_modules
```
Expected: no output. Any hit means a Phase 4 task is incomplete — stop and finish it.

- [ ] **Step 2: Swap the connector in server.ts**

Replace `import connectDB from './config/db'` with `import prisma from './config/prisma'`, and replace the `connectDB()` call with:

```typescript
prisma.$connect()
  .then(() => console.log('Postgres connected'))
  .catch((e) => { console.error('Postgres connection failed:', e); process.exit(1); });
```

Also remove the `express-mongo-sanitize` middleware and its Express 5 query-getter workaround — both exist solely to defend against Mongo operator injection and are dead weight against Postgres. Prisma parameterizes all queries.

- [ ] **Step 3: Run the full golden replay against Postgres**

```bash
cd server && npm run seed && npm test
```
Expected: every replay case PASSES. **This is the migration's acceptance gate.** Any failure is a real behavioural regression — fix it rather than editing the fixture.

- [ ] **Step 4: Delete the Mongo layer**

```bash
cd server && rm -rf src/models src/config/db.ts src/utils/password.ts
npm uninstall mongoose express-mongo-sanitize bcryptjs @types/bcryptjs
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 5: Verify the app boots and serves**

```bash
cd server && npm run dev
```
In a second shell: `curl -s localhost:5000/api/health` → `{"status":"success",...}`. Then log in through the running client and confirm the hub dashboard, a bill detail page, and a transfer detail page all render.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(db): cut over to Postgres and remove Mongoose"
```

---

## Phase 6 — RLS Hardening

### Task 32: Enable RLS with deny-by-default on all 27 tables

**Files:**
- Create: `server/prisma/migrations/*_rls/migration.sql`

RLS here is a second layer, not the gate. The API authorizes; these policies limit the blast radius if the pooled connection string ever leaks.

> **DONE EARLY, OUT OF ORDER — see task-6-report.md §8-§9 and its follow-up
> report.** Task 6's shadow-database incident destroyed Supabase's automatic-RLS
> event trigger (`ensure_rls` / `rls_auto_enable()`), which had been keeping
> `rolbypassrls` moot for the app but meant RLS was enabled on 0 of 27 tables
> and would not auto-enable on any new one. That made this task's substance
> urgent immediately rather than at its numbered position in Phase 6, so it was
> executed right after Task 6 as
> `server/prisma/migrations/*_enable_rls_deny_by_default/migration.sql`.
> Two differences from the draft SQL below, both deliberate:
> - It excludes `_prisma_migrations` from the `pg_tables` loop explicitly
>   (`AND tablename <> '_prisma_migrations'`) rather than looping over every
>   table in `public` unconditionally. Enabling RLS on Prisma's own migration
>   ledger is harmless either way since `postgres` owns it and bypasses RLS,
>   but there is no reason to touch a table Prisma manages.
> - Step 3's verification below (`curl` against the PostgREST anon key) was not
>   run, because this project's Supabase Data API is disabled (see Task 6
>   remediation report); the equivalent proof used instead was querying
>   `pg_class.relrowsecurity` (27/27 true) and `information_schema.role_table_grants`
>   for `anon`/`authenticated` on `public` tables (zero rows), plus Step 4's
>   proof done against real inserted-and-read-back rows, not just an empty-table
>   count, to rule out RLS silently returning zero rows.
>
> This task's remaining checkbox value if revisited: confirming nothing here
> needs to change once real per-role policies are considered (see "Per-user RLS
> policies" in Out of Scope) — the migration this task specifies has already
> shipped.

- [ ] **Step 1: Confirm the app connects as table owner**

Prisma connects as `postgres`, which bypasses RLS by default. Verify:

```sql
SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user;
```
If `true`, RLS will not affect the app — which is the intent for this phase. It protects against direct access with the `anon`/`authenticated` keys, not against the service connection.

- [ ] **Step 2: Enable RLS and deny anon everywhere**

```sql
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;
```

With no policies defined and privileges revoked, `anon` and `authenticated` can read nothing. That is the correct default for this architecture — the client never queries Supabase directly.

- [ ] **Step 3: Verify anon is locked out**

Using the project's anon key:

```bash
curl -s "$SUPABASE_URL/rest/v1/properties?select=id" -H "apikey: $SUPABASE_ANON_KEY"
```
Expected: a permission-denied error, not a row array. **If rows come back, stop and fix before deploying.**

- [ ] **Step 4: Confirm the app still works**

```bash
cd server && npm test
```
Expected: full suite PASSES — the service connection bypasses RLS.

- [ ] **Step 5: Commit**

```bash
git add server/prisma/migrations
git commit -m "feat(db): enable RLS with deny-by-default on all tables"
```

---

## Out of Scope

Deliberately excluded. Each is a separate piece of work:

- **Removing `_id` from responses and cleaning the 14 client sites.** The dual-emission serializer makes this safe to defer.
- **Per-user RLS policies** (`auth.uid()`-scoped read/write rules). Task 32 establishes deny-by-default only. Meaningful per-role policies require role claims in the JWT via a custom access token hook — a project of its own.
- **Supabase Storage.** Cloudinary and local `/uploads` stay as they are.
- **Realtime subscriptions** for messages/notifications, which currently poll.
- **PostGIS.** `geoCoords` stays as two numeric columns; no geo queries exist today.

---

## Self-Review

**Spec coverage.** All four locked decisions are implemented: no ETL (Task 30 rewrites the seed instead); Prisma throughout Phases 2 and 4; Supabase Auth in Task 7 with RLS in Task 32; dual `id`/`_id` in Task 8. Every measured coupling point has an owning task — 235 populates across Tasks 10–29, 9 aggregations in Tasks 26/28/29, the 5 Mongoose hooks in Task 6 (4) and Task 26 (1), both `Schema.Types.Mixed` fields in Task 5, and all 3 `ObjectId` construction sites in Tasks 13, 28, and 10.

**Known gaps, stated rather than hidden.** Two items are specified by convention rather than exhaustively enumerated, because enumerating them would mean transcribing 1,787 lines of schema and 8,687 lines of services into this document:

1. **Task 5 Step 3** covers 21 of 27 models by convention, with 6 written out in full as the pattern. The source models are authoritative and are named.
2. **Tasks 11–29** are specified per-service with their populate counts and domain-specific hazards, but do not reproduce each service's code. Task 10 is the fully-worked exemplar. This is a deliberate trade: the golden replay tests from Task 4 are the real specification of correct behaviour for those tasks, and they are executable rather than prose.

**Type consistency.** `serializeDoc`/`serializeList` (Task 8) and `toHttpError` (Task 9) both import `{ Prisma }` from `@prisma/client`, which only exists once Task 5 has run `prisma generate` — so **Task 5 must execute before Task 8 and Task 9**, not after. `serializeDoc`/`serializeList` are then used from Task 7 onward — Task 7 depends on Task 8, so **execute Task 8 before Task 7**, or stub `serializeDoc` in Task 7 and replace it. `toHttpError` (Task 9) is referenced by Task 10's pattern. `AuthRequest` keeps its existing shape from `middleware/auth.ts`. Prisma model names in Task 5's Interfaces block match those used in Tasks 10–29.

**Ordering correction:** the dependency above means the true execution order spanning Phases 2–3 is Task 5 → Task 8 → Task 9 → Task 7, not the numeric 5 → 6 → 7 → 8 → 9 the phase layout implies. Task 3a's insertion ahead of Task 3 is a further correction, discovered later, to the same numeric-order assumption. See "Execution Order" near the top of this document for the complete, corrected sequence.
