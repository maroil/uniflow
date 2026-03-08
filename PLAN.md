# Uniflow CDP — Build Plan

> Open-source Customer Data Platform on AWS. Self-hosted via `uniflow` CLI + AWS CDK.
> Stack: TypeScript · AWS CDK · Next.js 16 · Tailwind CSS v4 · pnpm monorepo

---

## Phase 0 — Repo Scaffold

- [ ] **0.1** Initialize pnpm workspace monorepo with Turborepo
  - `pnpm init` + `pnpm-workspace.yaml` covering `infra`, `services/*`, `connectors/*`, `libs/*`, `cli`, `sdk/*`, `ui`
  - `turbo.json` with `build`, `test`, `lint` pipelines
- [ ] **0.2** Add root tooling config
  - ESLint (flat config) + Prettier
  - TypeScript base `tsconfig.json` (shared, extended by each package)
  - Vitest workspace config
- [ ] **0.3** GitHub Actions CI pipeline
  - `.github/workflows/ci.yml`: lint → test → build (on push/PR)
  - `.github/workflows/release.yml`: publish CLI + CDK on tag push
- [ ] **0.4** Create top-level directory structure
  ```
  infra/       # CDK stacks (@uniflow/cdk)
  services/    # Lambda + Fargate handlers
  connectors/  # Destination plugins
  libs/        # Shared internal packages
  cli/         # uniflow CLI
  sdk/         # Client tracking SDKs
  ui/          # Next.js 16 admin dashboard
  docker/      # Local dev (docker-compose + localstack)
  docs/        # Docusaurus site
  examples/    # Sample CDK app
  ```

---

## Phase 1 — Event Schema + Core Libs

- [ ] **1.1** `libs/event-schema` — Zod schemas for all event types
  - `track`, `identify`, `page`, `group`, `screen` event shapes
  - Shared `UnifowEvent` union type
  - `validateEvent(raw): UnifowEvent` helper
- [ ] **1.2** `libs/identity` — Identity resolution logic
  - `resolveIdentity(anonymousId, userId)` — merges IDs in DynamoDB identity graph
  - `getCanonicalUserId(anonymousId)` — looks up resolved userId
- [ ] **1.3** `libs/logger` — Structured logging
  - Thin wrapper around AWS Lambda Powertools Logger
  - Consistent log shape: `{ level, service, requestId, ...fields }`
- [ ] **1.4** Write unit tests for all libs (Vitest)

---

## Phase 2 — Storage Infrastructure (CDK)

- [ ] **2.1** `infra/src/constructs/StorageConstruct.ts`
  - DynamoDB table (single-table design, PAY_PER_REQUEST, point-in-time recovery)
  - S3 bucket: `raw/` (Parquet archive, lifecycle: Glacier after 90 days)
  - S3 bucket: `processed/` (curated data for Athena)
  - Glue Database + Crawler for Athena catalog
  - KMS key for Secrets Manager (destination credentials)
- [ ] **2.2** DynamoDB single-table entity design
  - Profile: `PK=PROFILE#<userId>` `SK=META`
  - Event: `PK=PROFILE#<userId>` `SK=EVENT#<ts>#<id>`
  - Identity: `PK=ANON#<anonymousId>` `SK=IDENTITY`
  - Segment: `PK=SEGMENT#<id>` `SK=META`
  - SegmentMember: `PK=SEGMENT#<id>` `SK=MEMBER#<userId>`
  - Source: `PK=SOURCE#<id>` `SK=META`
  - Destination: `PK=DEST#<id>` `SK=META`
  - Migration: `PK=MIGRATION#<id>` `SK=META`
- [ ] **2.3** CDK snapshot tests for StorageConstruct

---

## Phase 3 — Ingestion Pipeline (CDK + Lambda)

- [ ] **3.1** `infra/src/constructs/IngestionConstruct.ts`
  - Kinesis Data Stream (7-day retention, on-demand capacity)
  - Kinesis Firehose → S3 `raw/` (Parquet conversion, partitioned by `source/year/month/day`)
  - API Gateway HTTP API (`/v1/track`, `/v1/identify`, `/v1/page`, `/v1/group`, `/v1/batch`)
  - Lambda authorizer (validates `writeKey` against DynamoDB `SOURCE#` records)
  - Ingest Lambda function (validate → enrich → publish to Kinesis)
- [ ] **3.2** `services/ingest/` — Ingest Lambda handler
  - Parse + validate event with `libs/event-schema`
  - Enrich: add `sourceId`, `receivedAt`, `messageId` (UUID)
  - Publish to Kinesis Data Stream
  - Return `200 OK { success: true }` or `400` with validation errors
- [ ] **3.3** Lambda authorizer
  - Read `writeKey` from `Authorization: Bearer <key>` header
  - Hash and compare against DynamoDB `SOURCE#<id>.writeKeyHash`
  - Cache policy: 5 minutes
- [ ] **3.4** Unit tests for ingest Lambda (mock Kinesis with `aws-sdk-client-mock`)
- [ ] **3.5** CDK snapshot tests for IngestionConstruct

---

## Phase 4 — Stream Processing: Identity + Profiles (CDK + Lambda)

- [ ] **4.1** `infra/src/constructs/ProcessingConstruct.ts`
  - Lambda Event Source Mapping: Kinesis → Processor Lambda (batch size 100, bisect on error)
  - IAM roles for DynamoDB read/write
- [ ] **4.2** `services/processor/` — Kinesis consumer Lambda
  - For each event in batch:
    - `identify` event → call `libs/identity.resolveIdentity()` → upsert profile traits in DynamoDB
    - `track/page/group` event → append event record to DynamoDB + resolve anonymousId
    - Fan-out: write event to SQS queues for each enabled destination
  - Dead-letter handling: failed records to SQS DLQ
- [ ] **4.3** Unit tests for processor Lambda
- [ ] **4.4** CDK snapshot tests for ProcessingConstruct

---

## Phase 5 — Segmentation (CDK + Fargate)

- [ ] **5.1** `infra/src/constructs/AudienceConstruct.ts`
  - ECS Cluster + Fargate Task Definition (audience-builder image)
  - EventBridge Scheduler: daily trigger of Fargate task
  - IAM roles for Athena, S3, DynamoDB read/write
- [ ] **5.2** `services/audience-builder/` — Fargate task (Node.js container)
  - Load segment definitions from DynamoDB (`SEGMENT#*`)
  - For each segment: translate rule set → Athena SQL → run query
  - Write results back to DynamoDB SegmentMember records
  - Publish to public ECR as `uniflow/audience-builder:<version>`
- [ ] **5.3** Segment rule DSL (JSON)
  ```json
  { "and": [
    { "trait": "plan", "op": "eq", "value": "pro" },
    { "event": "Checkout Completed", "op": "gte", "count": 2 }
  ]}
  ```
- [ ] **5.4** Unit tests for rule-to-SQL translator (Vitest)
- [ ] **5.5** CDK snapshot tests for AudienceConstruct

---

## Phase 6 — Destinations + Connector SDK

- [ ] **6.1** `connectors/sdk/` — Connector interface
  ```typescript
  export abstract class BaseConnector {
    abstract configSchema: ZodSchema;
    abstract handle(event: UnifowEvent, config: unknown): Promise<void>;
  }
  ```
- [ ] **6.2** `connectors/webhook/` — HTTP Webhook connector
  - POST event payload to configured URL
  - Retry with exponential backoff (3 attempts)
  - HMAC-SHA256 signature header
- [ ] **6.3** `connectors/s3-export/` — S3 dump connector
  - Write events as NDJSON to a customer-specified S3 bucket
  - Batch by hour, file per source
- [ ] **6.4** `infra/src/constructs/ActivationConstruct.ts`
  - SQS queue per connector type + DLQ (maxReceiveCount: 3)
  - Lambda per connector (reads from SQS, runs connector handler)
  - Processor Lambda publishes to SQS queues for enabled destinations
- [ ] **6.5** Unit tests for connector handlers
- [ ] **6.6** CDK snapshot tests for ActivationConstruct

---

## Phase 7 — Management API (CDK + Lambda)

- [ ] **7.1** `infra/src/constructs/AdminConstruct.ts`
  - Cognito User Pool + App Client (email/password auth)
  - API Gateway HTTP API with Cognito JWT authorizer
  - Lambda handler for management routes
  - S3 bucket for UI static assets + CloudFront distribution
- [ ] **7.2** `services/management-api/` — CRUD Lambda
  - Sources: `GET /sources`, `POST /sources`, `DELETE /sources/:id` (generates writeKey)
  - Destinations: `GET /destinations`, `POST /destinations`, `PUT /destinations/:id`, `DELETE /destinations/:id`
  - Segments: `GET /segments`, `POST /segments`, `PUT /segments/:id`, `DELETE /segments/:id`
  - Profiles: `GET /profiles/:userId` (traits + recent events)
  - Segment members: `GET /segments/:id/members`
- [ ] **7.3** Unit tests for management API handlers
- [ ] **7.4** CDK snapshot tests for AdminConstruct

---

## Phase 8 — Admin UI (Next.js 16 + Tailwind CSS v4)

- [ ] **8.1** Scaffold Next.js 16 app in `ui/`
  - `output: 'export'` in `next.config.ts` (static export → S3)
  - Tailwind CSS v4 (`@import "tailwindcss"` CSS-first config)
  - shadcn/ui components (adapted for Tailwind v4)
  - Cognito auth via `amazon-cognito-identity-js` or Auth.js
- [ ] **8.2** Pages
  - `/` — Dashboard (event volume chart, profile count, active segments)
  - `/sources` — List + create sources, copy write key + SDK snippet
  - `/destinations` — List + create/configure destinations
  - `/profiles` — Search profiles by email/userId, view traits + event timeline
  - `/segments` — List segments, visual rule builder, preview membership count
  - `/settings` — Account, retention policy
- [ ] **8.3** API client (`ui/src/lib/api.ts`)
  - Typed fetch wrapper pointing to Management API Gateway URL
  - Attaches Cognito JWT to all requests
- [ ] **8.4** CDK deploys UI: `aws s3 sync ui/out/ s3://<bucket>` + CloudFront invalidation

---

## Phase 9 — CLI (`uniflow`)

- [ ] **9.1** Scaffold CLI in `cli/` using `commander` + `inquirer`
  - Published as `uniflow` on npm (binary entry point)
- [ ] **9.2** `uniflow init`
  - Interactive prompts: AWS region, admin email, connectors to enable
  - Generates `uniflow.config.yaml` in current directory
  - Validates AWS credentials (`aws sts get-caller-identity`)
- [ ] **9.3** `uniflow deploy`
  - Reads `uniflow.config.yaml`
  - Runs `cdk bootstrap` if needed
  - Runs `cdk deploy UnifowStack`
  - Prints deployed endpoint URLs + admin credentials
- [ ] **9.4** `uniflow upgrade`
  - Pulls latest `uniflow` version
  - Runs pending migrations (checks `MIGRATION#*` records in DynamoDB)
  - Runs `cdk deploy` with new version
- [ ] **9.5** `uniflow status`
  - Checks API Gateway health endpoint
  - Reports Kinesis stream status, ECS task last run, DynamoDB item counts
- [ ] **9.6** `uniflow destroy`
  - Confirmation prompt
  - Runs `cdk destroy UnifowStack`
- [ ] **9.7** Migration system
  - `cli/src/migrations/` — ordered `.ts` files (`0001_init.ts`, `0002_...ts`)
  - Each migration: idempotent, records completion in DynamoDB
  - Migration runner: load pending → execute in order → mark complete
- [ ] **9.8** Unit tests for CLI commands (mock CDK + AWS SDK calls)

---

## Phase 10 — Client SDKs

- [ ] **10.1** `sdk/js/` — `@uniflow/js` (Browser + Node.js)
  - Auto-generates `anonymousId` (localStorage / cookie)
  - `analytics.track()`, `.identify()`, `.page()`, `.group()`
  - Event batching (flush every 30 events or 5 seconds)
  - Retry with exponential backoff
  - TypeScript types
- [ ] **10.2** `sdk/python/` — `uniflow-python`
  - Same API shape as JS SDK
  - Thread-safe batch queue
  - `pip install uniflow-python`
- [ ] **10.3** Unit tests for both SDKs

---

## Phase 11 — Local Dev

- [ ] **11.1** `docker/docker-compose.yml`
  - LocalStack (DynamoDB, S3, Kinesis, SQS)
  - Ingest Lambda local via SAM Local or direct Node.js process
  - Audience builder container (local image build)
- [ ] **11.2** `docker/localstack/init.sh`
  - Create DynamoDB tables, S3 buckets, Kinesis streams on startup
- [ ] **11.3** `uniflow dev` CLI command (optional) — starts docker-compose + watches for changes
- [ ] **11.4** README: "Run locally in 3 commands"
  ```bash
  docker compose up -d
  uniflow init --local
  curl http://localhost:3000/v1/track -d '{"type":"track","event":"Test"}'
  ```

---

## Phase 12 — Main CDK Stack + Docs

- [ ] **12.1** `infra/src/stacks/UnifowStack.ts`
  - Composes all constructs: Storage → Ingestion → Processing → Audience → Activation → Admin
  - Accepts `UnifowStackProps` (from `uniflow.config.yaml`)
  - Exports: API endpoint, Admin UI URL, CloudFront URL
- [ ] **12.2** `examples/basic/` — minimal CDK app using `@uniflow/cdk`
  ```typescript
  import { UnifowStack } from '@uniflow/cdk';
  new UnifowStack(app, 'Uniflow', { adminEmail: 'you@example.com' });
  ```
- [ ] **12.3** Docusaurus docs in `docs/`
  - Quickstart (< 5 min deploy)
  - Architecture overview
  - Event schema reference
  - Connector SDK guide (how to build community connectors)
  - Upgrade guide
- [ ] **12.4** `README.md` — hero section, quickstart, architecture diagram, contributing guide

---

## Milestone Checklist

| Milestone | Phases | Description |
|---|---|---|
| **M1: Data In** | 0–4 | Events flow from SDK → API → Kinesis → DynamoDB profiles |
| **M2: Segments** | 5 | Audience builder computes segment membership |
| **M3: Data Out** | 6 | Destinations receive events via SQS connectors |
| **M4: Admin** | 7–8 | UI + management API fully operational |
| **M5: CLI** | 9 | `uniflow init/deploy/upgrade` working end-to-end |
| **M6: SDKs** | 10–11 | JS + Python SDKs, local dev mode |
| **M7: OSS Ready** | 12 | Docs, examples, GitHub release, npm publish |
