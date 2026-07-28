# AutomateKit — Product Requirements Document

| Field        | Value                                          |
| ------------ | ---------------------------------------------- |
| Product      | AutomateKit — workflow automation platform     |
| Document     | Product Requirements Document (PRD)            |
| Version      | 1.0                                            |
| Last updated | 2026-07-28                                     |
| Status       | Active development                             |
| Repository   | https://github.com/abhradeepbarman/automatekit |

---

## 1. Overview

AutomateKit is a self-hostable workflow automation platform. A user connects their
third-party accounts (e.g. Gmail), composes a workflow from one **trigger** and one
or more **actions**, activates it, and the platform runs that workflow
automatically — on a schedule, or in response to an inbound webhook.

It is the open, self-hosted equivalent of the "when X happens, do Y" category
occupied by Zapier, Make and n8n.

### 1.1 Problem statement

Routine cross-application work — copying data between tools, sending templated
emails, reacting to inbound events — is repetitive and error-prone when done by
hand. Existing hosted automation tools solve this but introduce three costs:

1. **Per-task pricing** that scales badly with volume.
2. **Data residency** concerns: every payload transits a third-party vendor.
3. **Closed integration models** that cannot be extended for internal systems.

AutomateKit targets users who want the same capability while retaining control of
the deployment and the data.

### 1.2 Goals

| #   | Goal                                                                              |
| --- | --------------------------------------------------------------------------------- |
| G1  | Let a non-technical user build a working automation in under two minutes.         |
| G2  | Execute activated workflows reliably, with retries and durable, auditable logs.   |
| G3  | Store third-party credentials encrypted at rest and never expose them to clients. |
| G4  | Make adding a new integration a self-contained, declarative code change.          |
| G5  | Run the whole stack from a single `docker compose up`.                            |

### 1.3 Non-goals (v1)

- Branching, conditionals, loops, or fan-out within a workflow (strictly linear).
- Multi-tenant organisations, teams, roles, or credential sharing.
- A public marketplace or user-uploaded integration code.
- Real-time streaming triggers (v1 polling floor is 60 seconds).

---

## 2. Users

| Persona                | Need                                                  | Success looks like                                                |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| **Operations user**    | Automate recurring manual steps without writing code. | Builds and activates a workflow from the UI unaided.              |
| **Developer**          | Trigger internal systems from an event, self-hosted.  | Posts to a webhook URL and sees the action fire.                  |
| **Self-host operator** | Deploy and run the stack safely.                      | Boots the stack with documented env vars; misconfig fails loudly. |

---

## 3. Core concepts

| Concept         | Definition                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| **Workflow**    | A named, ordered chain of steps owned by one user. Runs only while `isActive`.                          |
| **Step**        | One node in the chain, addressed by a zero-based `index`. Index `0` is the trigger; `1..n` are actions. |
| **Trigger**     | Step `0`. Decides _whether_ a run starts. Either polling (timer) or inbound (webhook).                  |
| **Action**      | Any step after `0`. Performs an effect against a third-party API.                                       |
| **Connection**  | A user's stored OAuth credential for one app. Tokens are encrypted at rest.                             |
| **Run**         | One end-to-end execution, correlated across steps by a shared `jobId`.                                  |
| **Integration** | A declarative bundle of an app's `auth`, `triggers` and `actions`.                                      |

### 3.1 Data flow between steps

A step's output is passed to the next step as `dataAvailable`. Action
configuration fields may reference it with `{{key}}` placeholders, which the
executor interpolates at run time. Each integration event declares its outputs
via `dataAvailable`, so the UI can offer the available variables while the user
is configuring a step.

---

## 4. Functional requirements

### 4.1 Authentication & accounts

| ID     | Requirement                                                                                          | Priority |
| ------ | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1.1 | Register with name, email, password. Passwords hashed with bcrypt. Emails normalised before storage. | P0       |
| FR-1.2 | Log in with email + password, receiving a short-lived access token and a long-lived refresh token.   | P0       |
| FR-1.3 | Sign in with Google (OAuth2 authorization-code flow) with CSRF-protected `state`.                    | P1       |
| FR-1.4 | Refresh an expired access token without re-authenticating; refresh tokens rotate on each use.        | P0       |
| FR-1.5 | Request a password reset link; tokens are single-use, hashed at rest, and expire after one hour.     | P1       |
| FR-1.6 | Log out, clearing cookies and invalidating the stored refresh token.                                 | P0       |

An account created via Google cannot subsequently be used for password login, and
vice versa; the mismatch is reported explicitly. Password-reset responses are
identical whether or not the account exists, to avoid disclosing registration status.

### 4.2 Workflow management

| ID     | Requirement                                                          | Priority |
| ------ | -------------------------------------------------------------------- | -------- |
| FR-2.1 | Create, rename, list (paginated), and delete workflows.              | P0       |
| FR-2.2 | Every workflow endpoint is scoped to the authenticated owner.        | P0       |
| FR-2.3 | Activate/deactivate a workflow.                                      | P0       |
| FR-2.4 | Activation requires at least one trigger **and** one action.         | P0       |
| FR-2.5 | Deleting a workflow removes its steps, webhooks, and execution logs. | P0       |

### 4.3 Step management

| ID     | Requirement                                                                                        | Priority |
| ------ | -------------------------------------------------------------------------------------------------- | -------- |
| FR-3.1 | Add a step at an index; index `0` must be a trigger, all others must be actions.                   | P0       |
| FR-3.2 | Step configuration is validated server-side against the integration's own schema.                  | P0       |
| FR-3.3 | A referenced `connectionId` must belong to the requesting user.                                    | P0       |
| FR-3.4 | Update a step's app, connection, or configuration.                                                 | P0       |
| FR-3.5 | Deleting a step also deletes every downstream step; removing the trigger deactivates the workflow. | P0       |
| FR-3.6 | Adding a webhook trigger provisions a unique, unguessable webhook URL.                             | P0       |

### 4.4 Connections (third-party credentials)

| ID     | Requirement                                                                       | Priority |
| ------ | --------------------------------------------------------------------------------- | -------- |
| FR-4.1 | Start an OAuth flow for a provider and complete it via popup callback.            | P0       |
| FR-4.2 | Access and refresh tokens are encrypted (AES-256-GCM) before storage.             | P0       |
| FR-4.3 | List connections for a provider. **Responses never include token material.**      | P0       |
| FR-4.4 | Expired access tokens are refreshed transparently during execution.               | P0       |
| FR-4.5 | The authorization code is delivered to a pinned origin, never broadcast with `*`. | P0       |

### 4.5 Execution engine

| ID     | Requirement                                                                                       | Priority |
| ------ | ------------------------------------------------------------------------------------------------- | -------- |
| FR-5.1 | A scheduler polls active, polling-triggered workflows once per minute.                            | P0       |
| FR-5.2 | Poll enqueues are idempotent per workflow per minute, so slow runs cannot pile up.                | P0       |
| FR-5.3 | A trigger that is not yet due is a silent no-op, not a logged failure.                            | P0       |
| FR-5.4 | On trigger fire, actions execute in index order, each receiving the previous step's output.       | P0       |
| FR-5.5 | A `401` from a provider triggers one token refresh and one retry with identical parameters.       | P0       |
| FR-5.6 | Failed jobs retry up to 3 times with exponential backoff.                                         | P1       |
| FR-5.7 | A workflow deactivated mid-flight stops before the next step runs.                                | P0       |
| FR-5.8 | `lastExecutedAt` is stamped before the action chain is enqueued, so a failure cannot double-fire. | P0       |
| FR-5.9 | Workers drain in-flight jobs on SIGTERM before exiting.                                           | P1       |

### 4.6 Observability

| ID     | Requirement                                                                               | Priority |
| ------ | ----------------------------------------------------------------------------------------- | -------- |
| FR-6.1 | Every step outcome writes an execution log with status, message, and correlating `jobId`. | P0       |
| FR-6.2 | Logs remain readable after their step is deleted (app/event/type are denormalized).       | P1       |
| FR-6.3 | Per-workflow logs are viewable in the UI, newest first, infinitely scrollable.            | P0       |
| FR-6.4 | Dashboard reports total workflows, and 30-day run and error counts.                       | P1       |
| FR-6.5 | Services expose `/health` (liveness) and `/health/ready` (dependency readiness).          | P1       |

### 4.7 Integrations

Shipped in v1:

| App      | Triggers       | Actions    | Auth   |
| -------- | -------------- | ---------- | ------ |
| `system` | Timer, Webhook | —          | none   |
| `gmail`  | —              | Send email | OAuth2 |

Adding an integration must require only: an `IApp` definition, its trigger/action
implementations with zod schemas, an optional auth module, and registration in the
integrations index. No changes to the server, executor, or database.

---

## 5. Non-functional requirements

### 5.1 Security

| ID       | Requirement                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------ |
| NFR-1.1  | OAuth tokens encrypted at rest with AES-256-GCM; the key is validated as 32 bytes at boot.       |
| NFR-1.2  | Passwords hashed with bcrypt; password-reset tokens stored only as SHA-256 hashes.               |
| NFR-1.3  | JWTs signed with distinct access/refresh secrets, each at least 32 characters.                   |
| NFR-1.4  | Auth cookies are `httpOnly`, and `secure` + `sameSite=none` in production.                       |
| NFR-1.5  | Every resource query is scoped by owner; cross-user references are rejected.                     |
| NFR-1.6  | `helmet` security headers; CORS restricted to the configured `APP_URL`.                          |
| NFR-1.7  | Rate limits: 300 req/min general, 20 per 15 min on auth, 60/min on webhooks.                     |
| NFR-1.8  | Request bodies capped at 1 MB.                                                                   |
| NFR-1.9  | Server-rendered HTML escapes all interpolated values; `postMessage` origins pinned on both ends. |
| NFR-1.10 | Misconfigured environments fail at boot with an explicit message, never with insecure defaults.  |

### 5.2 Reliability

- Bounded Postgres connection pools per service.
- BullMQ retention limits so Redis memory stays bounded.
- Container healthchecks; services wait for datastores to become _healthy_, not merely started.
- Idle-client pool errors are handled rather than crashing the process.

### 5.3 Performance

- Pagination counts execute as SQL `COUNT`, never by materialising rows.
- Page sizes clamped (workflows ≤ 100, logs ≤ 100).
- Worker concurrency configurable via `WORKER_CONCURRENCY`.

### 5.4 Maintainability

- TypeScript throughout, strict mode, shared config packages.
- Turborepo task graph with caching.
- One shared source of truth for types, validators, and integration schemas across frontend and backend.

---

## 6. Architecture

```
                 ┌────────────┐
                 │   Browser  │
                 └─────┬──────┘
                       │ HTTPS
                 ┌─────▼──────┐        ┌──────────────┐
                 │    web     │        │   Provider   │
                 │ React/Vite │        │  APIs (OAuth)│
                 └─────┬──────┘        └──────▲───────┘
                       │ REST                 │
                 ┌─────▼──────┐               │
   webhooks ────►│   server   │               │
                 │  Express   │               │
                 └──┬──────┬──┘               │
                    │      │ enqueue          │
            ┌───────▼──┐ ┌─▼─────────┐        │
            │ Postgres │ │   Redis   │        │
            │ (Drizzle)│ │  (BullMQ) │        │
            └───────▲──┘ └─▲─────────┘        │
                    │      │ consume          │
                 ┌──┴──────┴──┐               │
                 │  executor  ├───────────────┘
                 │  workers   │
                 └────────────┘
```

### 6.1 Components

| Component               | Responsibility                                                       |
| ----------------------- | -------------------------------------------------------------------- |
| `apps/web`              | React + Vite dashboard; workflow canvas via React Flow.              |
| `apps/server`           | REST API: auth, workflows, steps, connections, webhook ingress.      |
| `apps/executor`         | Cron scheduler + BullMQ trigger and action workers.                  |
| `packages/db`           | Drizzle schema, migrations, pooled client.                           |
| `packages/queue`        | Queue definitions, shared Redis connection and job retention policy. |
| `packages/integrations` | App definitions: auth, triggers, actions, schemas.                   |
| `packages/common`       | Shared types, zod validators, logger, encryption helpers.            |

### 6.2 Execution sequence

**Polling trigger**

1. Executor cron fires each minute.
2. Selects active workflows whose step `0` is a non-webhook trigger.
3. Enqueues one trigger job per workflow, keyed `{workflowId}:{minuteBucket}` (idempotent).
4. Trigger worker re-checks `isActive`, decrypts the connection if the app needs auth, and runs the trigger.
5. If not due → silent return. If due → write log, stamp `lastExecutedAt`, enqueue action at index 1.
6. Action worker resolves the step, interpolates `{{variables}}`, runs the action, writes a log, and enqueues index+1 only if such a step exists.

**Webhook trigger**

1. `POST /api/v1/webhook/:path`.
2. Server resolves the webhook, loads the workflow, and rejects if inactive.
3. Writes a trigger log and enqueues the action chain with the request body as input.

---

## 7. Data model

| Table             | Purpose                     | Key columns                                                                   |
| ----------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `users`           | Accounts                    | `email` (unique), `password`, `authProvider`, `refreshToken` (hashed)         |
| `workflows`       | Automations                 | `userId`, `isActive`, `activatedAt`, `lastExecutedAt`                         |
| `steps`           | Trigger/action chain        | `workflowId`, `index`, `type`, `app`, `eventName`, `metadata`, `connectionId` |
| `connections`     | Encrypted OAuth credentials | `userId`, `app`, `*TokenEncrypt`/`IV`/`Tag`, `expiresAt`                      |
| `webhooks`        | Inbound endpoints           | `workflowId`, `stepId`, `path` (unique)                                       |
| `execution_logs`  | Run audit trail             | `workflowId`, `stepId`, `app`, `eventName`, `stepType`, `jobId`, `status`     |
| `password_tokens` | Reset tokens                | `userId`, `token` (hashed), `expiresAt`, `usedAt`                             |

Constraints of note:

- `steps` has a unique index on `(workflowId, index)`.
- Deleting a workflow cascades to steps, webhooks, and logs.
- Deleting a step sets `execution_logs.stepId` to `NULL` rather than deleting history;
  `app`, `eventName` and `stepType` are denormalized so the log stays readable.

---

## 8. API surface

Base path `/api/v1`. All routes require a bearer token or auth cookie except where noted.

| Method | Path                                | Purpose                         | Auth        |
| ------ | ----------------------------------- | ------------------------------- | ----------- |
| POST   | `/auth/register`                    | Create account                  | Public      |
| POST   | `/auth/login`                       | Password login                  | Public      |
| POST   | `/auth/refresh`                     | Rotate tokens                   | Cookie      |
| POST   | `/auth/logout`                      | End session                     | Yes         |
| POST   | `/auth/forgot-password`             | Send reset link                 | Public      |
| POST   | `/auth/reset-password/:token`       | Complete reset                  | Public      |
| GET    | `/auth/google`                      | Begin Google sign-in            | Public      |
| GET    | `/auth/google/callback`             | Complete Google sign-in         | Public      |
| GET    | `/workflow`                         | List workflows (paginated)      | Yes         |
| POST   | `/workflow`                         | Create workflow                 | Yes         |
| GET    | `/workflow/:id`                     | Workflow with ordered steps     | Yes         |
| PUT    | `/workflow/:id`                     | Rename / activate / deactivate  | Yes         |
| DELETE | `/workflow/:id`                     | Delete workflow                 | Yes         |
| GET    | `/workflow/:workflowId/logs`        | Execution logs (paginated)      | Yes         |
| POST   | `/step/workflow/:id`                | Add step                        | Yes         |
| GET    | `/step/:id`                         | Get step                        | Yes         |
| PUT    | `/step/:id`                         | Update step                     | Yes         |
| DELETE | `/step/:id`                         | Delete step + downstream        | Yes         |
| GET    | `/credential/:provider`             | Get provider auth URL           | Yes         |
| GET    | `/credential/:provider/callback`    | OAuth popup callback            | Public      |
| GET    | `/credential/:provider/connections` | List connections                | Yes         |
| POST   | `/credential/:provider/token`       | Exchange code, store connection | Yes         |
| GET    | `/integrations`                     | Integration catalogue           | Yes         |
| GET    | `/dashboard/stats`                  | Aggregate stats                 | Yes         |
| POST   | `/webhook/:path`                    | Webhook ingress                 | Path secret |

Non-versioned operational routes: `GET /health`, `GET /health/ready`.

All responses share the envelope `{ status, message, data }`.

---

## 9. Configuration

| Variable                                         | Required                 | Notes                                 |
| ------------------------------------------------ | ------------------------ | ------------------------------------- |
| `DATABASE_URL`                                   | Yes                      | Postgres connection string            |
| `REDIS_URL`                                      | Yes                      | Redis connection string               |
| `ACCESS_SECRET`                                  | Yes                      | ≥ 32 chars, distinct from refresh     |
| `REFRESH_SECRET`                                 | Yes                      | ≥ 32 chars                            |
| `ENCRYPTION_KEY`                                 | Yes                      | Exactly 64 hex chars (32 bytes)       |
| `APP_URL`                                        | Yes                      | Dashboard origin; CORS + OAuth target |
| `API_URL`                                        | Yes                      | Public API origin                     |
| `PORT`                                           | No                       | Default `5000`                        |
| `DATABASE_POOL_MAX`                              | No                       | Default `10`                          |
| `WORKER_CONCURRENCY`                             | No                       | Default `5`                           |
| `SHUTDOWN_TIMEOUT_MS`                            | No                       | Default `15000`                       |
| `GOOGLE_AUTH_CLIENT_ID` / `_SECRET`              | For Google sign-in       |                                       |
| `GOOGLE_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | For Gmail integration    |                                       |
| `MAIL_USER` / `MAIL_PASS`                        | For password reset email |                                       |

Rotating `ENCRYPTION_KEY` makes existing stored connections undecryptable; users
must reconnect their accounts.

---

## 10. Known limitations

1. Polling resolution is fixed at 60 seconds.
2. Workflows are strictly linear — no branching or conditionals.
3. Webhook endpoints are authenticated only by the secrecy of the path; there is
   no signature verification or replay protection.
4. Multiple executor replicas would each run the cron scheduler; the per-minute
   idempotent job id limits but does not fully eliminate duplicate polling.
5. Step outputs are passed only from the immediately preceding step, not from
   arbitrary earlier steps.
6. There is no automated test suite.

---

## 11. Roadmap

**Next**

- Automated tests: unit coverage for the executor's decision logic, integration coverage for auth and step ownership.
- Webhook HMAC signature verification and replay protection.
- Manual "Run once" for testing a workflow before activation.
- Distributed lock so only one executor replica schedules polls.

**Later**

- Conditional branching and filter steps.
- More integrations (Slack, Notion, Discord, HTTP request).
- Per-user quotas and execution history retention policies.
- Structured JSON logging plus metrics and tracing export.
- Dead-letter queue surfaced in the UI with manual replay.
