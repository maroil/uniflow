# Uniflow CDP — Build Plan

> Open-source Customer Data Platform on AWS. Self-hosted via `uniflow` CLI + AWS CDK.
> Stack: TypeScript · AWS CDK · Next.js 16 · Tailwind CSS v4 · pnpm monorepo

---

## Phase 0 — Repo Scaffold

- [x] **0.1** Initialize pnpm workspace monorepo with Turborepo
  - `pnpm init` + `pnpm-workspace.yaml` covering `infra`, `services/*`, `connectors/*`, `libs/*`, `cli`, `sdk/*`, `ui`
  - `turbo.json` with `build`, `test`, `lint` pipelines
- [x] **0.2** Add root tooling config
  - ESLint (flat config) + Prettier
  - TypeScript base `tsconfig.json` (shared, extended by each package)
  - Vitest workspace config
- [x] **0.3** GitHub Actions CI pipeline
  - `.github/workflows/ci.yml`: lint → test → build (on push/PR) ✅
  - `.github/workflows/release.yml`: publish CLI + CDK on tag push ✅
- [~] **0.4** Create top-level directory structure
  - `infra/`, `services/`, `connectors/`, `libs/`, `cli/`, `sdk/`, `ui/`, `docker/`, `examples/` ✅
  - `docs/` (Docusaurus) ❌ missing

---

## Phase 1 — Event Schema + Core Libs

- [x] **1.1** `libs/event-schema` — Zod schemas for all event types
  - `track`, `identify`, `page`, `group`, `screen` ✅
  - Shared `AnyEvent` union type ✅
  - `validateEvent(raw): UnifowEvent` standalone helper ❌ (parsing is inline via `.parse()`)
- [x] **1.2** `libs/identity` — Identity resolution logic
  - `IdentityResolver.resolve()` + `IdentityGraph` interface ✅
  - `DynamoIdentityGraph` impl in `services/processor` ✅
- [~] **1.3** `libs/logger` — Structured logging
  - Custom structured JSON logger ✅
  - AWS Lambda Powertools Logger ❌ (used simple custom impl instead)
- [x] **1.4** Write unit tests for all libs (Vitest)
  - `libs/event-schema` tests ✅, `libs/identity` tests ✅

---

## Phase 2 — Storage Infrastructure (CDK)

- [x] **2.1** `infra/src/constructs/StorageConstruct.ts`
  - DynamoDB table (single-table, PAY_PER_REQUEST, PITR, GSI) ✅
  - S3 `raw/` + `processed/` buckets ✅
  - Kinesis Firehose → S3 ✅
  - Glue Database + Table for Athena catalog ✅
  - KMS key for Secrets Manager ✅
- [x] **2.2** DynamoDB single-table entity design (all 8 entities implemented in code)
- [x] **2.3** CDK snapshot tests for StorageConstruct

---

## Phase 3 — Ingestion Pipeline (CDK + Lambda)

- [x] **3.1** `infra/src/constructs/IngestionConstruct.ts`
  - Kinesis Data Stream (7-day retention) ✅
  - Kinesis Firehose → S3 (GZIP, date-partitioned) ✅
  - API Gateway HTTP API (all 5 routes) ✅
  - Lambda authorizer (writeKey validation via SHA-256 + GSI) ✅
  - Ingest Lambda ✅
- [~] **3.2** `services/ingest/` — Ingest Lambda handler
  - Validate with event-schema ✅
  - Enrich with `messageId`, `timestamp` ✅ — `sourceId`, `receivedAt` ❌ not enriched
  - Publish to Kinesis ✅
  - 200/400 responses ✅
- [x] **3.3** Lambda authorizer (writeKey hash check against DynamoDB SOURCE# records)
- [x] **3.4** Unit tests for ingest Lambda (aws-sdk-client-mock)
- [x] **3.5** CDK snapshot tests for IngestionConstruct

---

## Phase 4 — Stream Processing: Identity + Profiles (CDK + Lambda)

- [x] **4.1** `infra/src/constructs/ProcessingConstruct.ts`
  - Kinesis → Lambda (batch 100, bisect on error, DLQ) ✅
  - IAM roles ✅
- [x] **4.2** `services/processor/` — Kinesis consumer Lambda
  - Identity resolution + profile upsert ✅
  - SQS fan-out to destinations ✅
  - DLQ on failure ✅
- [x] **4.3** Unit tests for processor Lambda
- [x] **4.4** CDK snapshot tests for ProcessingConstruct

---

## Phase 5 — Segmentation (CDK + Fargate)

- [~] **5.1** `infra/src/constructs/AudienceConstruct.ts`
  - ECS Fargate + EventBridge Scheduler ✅
  - IAM for Athena, S3, DynamoDB ✅
  - Scheduler set to hourly (plan says daily) — minor delta
- [x] **5.2** `services/audience-builder/` — Fargate task
  - Loads segments, runs Athena queries, writes SegmentMember records ✅
  - Dockerfile ✅
  - ECR publish via GitHub Actions ✅
  - Glue Database + Table provisioned by CDK ✅
- [~] **5.3** Segment rule DSL
  - Flat array of rules (`field/operator/value`) ✅
  - Nested `and/or` logical operators ❌ not implemented
- [ ] **5.4** Unit tests for rule-to-SQL translator (Vitest)
- [x] **5.5** CDK snapshot tests for AudienceConstruct

---

## Phase 6 — Destinations + Connector SDK

- [x] **6.1** `connectors/sdk/` — `BaseConnector` abstract class + `ConnectorEvent`/`ConnectorResult` types
- [x] **6.2** `connectors/webhook/` — HTTP Webhook connector
  - POST + HMAC-SHA256 signing ✅
  - Exponential backoff retry (1s, 2s, 4s on 5xx) ✅
- [~] **6.3** `connectors/s3-export/` — S3 dump connector
  - Per-event Hive-partitioned S3 write ✅
  - Batching by hour / file per source ❌ (writes per-event, not batched)
- [x] **6.4** `infra/src/constructs/ActivationConstruct.ts`
  - SQS fan-out queue exists in ProcessingConstruct ✅
  - Dedicated ActivationConstruct with connector Lambdas ✅
- [~] **6.5** Unit tests: webhook ✅ — s3-export ❌
- [x] **6.6** CDK snapshot tests for ActivationConstruct

---

## Phase 7 — Management API (CDK + Lambda)

- [x] **7.1** `infra/src/constructs/AdminConstruct.ts`
  - Cognito User Pool + App Client ✅
  - API Gateway + Lambda ✅
  - CloudFront + S3 for UI ✅
  - Cognito JWT authorizer on API routes ✅
- [x] **7.2** `services/management-api/` — CRUD Lambda
  - Sources GET/POST/PUT/DELETE ✅
  - Destinations GET/POST/PUT/DELETE ✅
  - Segments GET/POST/PUT/DELETE ✅
  - Profiles GET ✅
  - `GET /segments/:id/members` ✅
  - writeKey generation for sources ✅
- [x] **7.3** Unit tests for management API handlers
- [x] **7.4** CDK snapshot tests for AdminConstruct

---

## Phase 8 — Admin UI (Next.js 16 + Tailwind CSS v4)

- [~] **8.1** Scaffold Next.js app in `ui/`
  - `output: 'export'` + Tailwind CSS v4 ✅
  - shadcn/ui components ❌ not added
  - Cognito auth ❌ not integrated
- [~] **8.2** Pages
  - `/sources` ✅, `/destinations` ✅, `/profiles` ✅, `/segments` ✅
  - `/` Dashboard with charts/stats ✅
  - `/settings` ✅
  - SDK snippet in sources page ✅
  - Visual segment rule builder ❌ (create only, no rule UI)
- [x] **8.3** API client (`ui/src/lib/api.ts`) — typed fetch wrapper with Cognito JWT
- [ ] **8.4** CDK UI deploy integration (`s3 sync` + CloudFront invalidation)

---

## Phase 9 — CLI (`uniflow`)

- [x] **9.1** Scaffold CLI in `cli/` using `commander` + `inquirer` (binary entry point)
- [~] **9.2** `uniflow init`
  - Interactive prompts + generates `uniflow.config.yaml` ✅
  - AWS credentials validation (`aws sts get-caller-identity`) ❌ missing
- [~] **9.3** `uniflow deploy`
  - Reads config + runs `cdk deploy` ✅
  - `cdk bootstrap` check ❌ missing
  - Prints endpoint URLs after deploy ❌ missing
- [x] **9.4** `uniflow upgrade` — updates package, runs migrations, redeploys ✅
- [~] **9.5** `uniflow status` — CloudFormation stack status + outputs ✅
  - Kinesis stream status, ECS task last run, DynamoDB item counts ❌ missing
- [x] **9.6** `uniflow destroy` — confirmation prompt + `cdk destroy` ✅
- [x] **9.7** Migration system — DynamoDB-backed, idempotent, ordered ✅
- [ ] **9.8** Unit tests for CLI commands

---

## Phase 10 — Client SDKs

- [x] **10.1** `sdk/js/` — `@uniflow/js`
  - `track()`, `identify()`, `page()`, `group()` ✅
  - `anonymousId` via localStorage ✅
  - Event batching + auto-flush ✅
  - Exponential backoff retry ❌ (re-queues on failure but no backoff)
  - TypeScript types ✅
- [x] **10.2** `sdk/python/` — `uniflow-python`
  - `track`, `identify`, `page`, `group` ✅
  - Thread-safe batch queue ✅
- [~] **10.3** Unit tests: JS SDK ✅, Python SDK ✅ (but `group()` not tested in JS)

---

## Phase 11 — Local Dev

- [~] **11.1** `docker/docker-compose.yml`
  - LocalStack (DynamoDB, S3, Kinesis, SQS) ✅
  - Audience builder container profile ✅
  - Ingest Lambda via SAM Local ❌ not wired up
- [x] **11.2** `docker/localstack/init/01_setup.sh` — provisions all AWS resources on startup ✅
- [x] **11.3** `uniflow dev` CLI command
- [ ] **11.4** README "Run locally in 3 commands" quickstart section

---

## Phase 12 — Main CDK Stack + Docs

- [x] **12.1** `infra/src/stacks/UnifowStack.ts`
  - Composes Storage, Ingestion, Processing, Audience, Admin, Activation ✅
  - CloudFormation outputs ✅
- [x] **12.2** `examples/cdk-app/index.ts` — minimal CDK app using `@uniflow/cdk` ✅
- [ ] **12.3** Docusaurus docs in `docs/`
- [x] **12.4** `README.md` + `CONTRIBUTING.md` + `CODE_OF_CONDUCT.md` + `LICENSE` ✅

---

## Milestone Checklist

| Milestone | Phases | Status | Description |
|---|---|---|---|
| **M1: Data In** | 0–4 | ✅ Done | Events flow from SDK → API → Kinesis → DynamoDB profiles |
| **M2: Segments** | 5 | ✅ Done | Audience builder computes segment membership via Athena |
| **M3: Data Out** | 6 | ✅ Done | Destinations receive events via SQS → connector Lambda |
| **M4: Admin** | 7–8 | ~90% | UI + management API operational; missing Cognito auth in UI, visual rule builder |
| **M5: CLI** | 9 | ~85% | `init/deploy/status/upgrade/destroy/dev` working; missing `cdk bootstrap` check, CLI tests |
| **M6: SDKs** | 10–11 | ✅ Done | JS + Python SDKs, local dev mode with LocalStack |
| **M7: OSS Ready** | 12 | ~85% | README, LICENSE, CONTRIBUTING, examples on GitHub; missing Docusaurus docs |

## Remaining Items

| # | Item | Phase | Priority |
|---|---|---|---|
| 1 | Docusaurus docs site (`docs/`) | 12.3 | Medium |
| 2 | Cognito auth integration in Admin UI | 8.1 | Medium |
| 3 | Visual segment rule builder in UI | 8.2 | Low |
| 4 | CDK UI deploy integration (`s3 sync` + CF invalidation) | 8.4 | Medium |
| 5 | `cdk bootstrap` check in `uniflow deploy` | 9.3 | Low |
| 6 | AWS credentials validation in `uniflow init` | 9.2 | Low |
| 7 | Unit tests for rule-to-SQL translator | 5.4 | Low |
| 8 | CLI command unit tests | 9.8 | Low |
| 9 | S3 export batching by hour | 6.3 | Low |
| 10 | Nested `and/or` segment rule DSL | 5.3 | Low |
