<div align="center">
  <h1>Uniflow CDP</h1>
  <p><strong>Open-source Customer Data Platform — self-hosted on your own AWS account.</strong></p>
  <p>
    <a href="https://github.com/maroil/uniflow/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
    <a href="https://github.com/maroil/uniflow/actions"><img src="https://github.com/maroil/uniflow/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node 20+">
    <img src="https://img.shields.io/badge/AWS-CDK-orange" alt="AWS CDK">
    <img src="https://img.shields.io/badge/pnpm-workspace-yellow" alt="pnpm workspace">
  </p>
  <p>
    <a href="#-quick-start">Quick Start</a> ·
    <a href="#-architecture">Architecture</a> ·
    <a href="#-repo-structure">Structure</a> ·
    <a href="#-local-dev">Local Dev</a> ·
    <a href="#-connector-sdk">Connectors</a> ·
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>
</div>

---

Uniflow gives you the core features of a modern CDP — event collection, identity resolution, unified profiles, audience segmentation, and destination connectors — packaged as a single CLI + AWS CDK library you can deploy in minutes to your own cloud account.

> **Status:** Early development · MVP in progress · Contributions welcome

## ✨ Features

| Feature | Description |
|---|---|
| **Event Collection** | Segment-compatible HTTP API (`track`, `identify`, `page`, `group`) |
| **Identity Resolution** | Anonymous ID → known user ID linking with a persistent identity graph |
| **Unified Profiles** | Merged profile with traits and full event history in DynamoDB |
| **Segmentation** | Rule-based audiences evaluated on a schedule via Athena |
| **Destinations** | Webhook and S3 export built-in · plugin SDK for community connectors |
| **Admin UI** | Next.js dashboard: Sources, Destinations, Profile Explorer, Segments |
| **CLI** | `uniflow init / deploy / status / upgrade / destroy` |
| **Client SDKs** | `@uniflow/js` (browser + Node) · `uniflow-python` |

## 🏗 Architecture

```
Client SDK
  └─▶ API Gateway (HTTP API)
        └─▶ Lambda (validate + enrich)
              ├─▶ Kinesis Data Stream ──▶ Firehose ──▶ S3 (raw, GZIP)
              └─▶ Kinesis Data Stream
                    └─▶ Lambda (processor)
                          ├─▶ DynamoDB  (identity graph + profile upsert)
                          └─▶ SQS       (destination fan-out)
                                └─▶ Lambda (connector) ──▶ External system

EventBridge Scheduler (hourly)
  └─▶ ECS Fargate (audience-builder)
        └─▶ Athena query over S3 ──▶ DynamoDB (segment membership)

Cognito ──▶ API Gateway ──▶ Lambda (management API)
Next.js static export ──▶ S3 ──▶ CloudFront
```

**Compute decisions:**

| Component | Compute | Why |
|---|---|---|
| Ingest API | Lambda | Zero idle cost, auto-scales |
| Stream processor | Lambda | Short-lived, stateless |
| Audience builder | ECS Fargate | Long-running Athena queries exceed Lambda limit |
| Destination connectors | Lambda | Event-driven, short-lived |
| Management API | Lambda | Low-traffic CRUD |

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9
- AWS CLI configured (`aws configure`)
- AWS CDK bootstrapped (`npx cdk bootstrap`)

```bash
# Install the CLI
npm install -g uniflow

# Interactive setup — generates uniflow.config.yaml
uniflow init

# Deploy to your AWS account
uniflow deploy

# Check deployment health
uniflow status
```

After deploy you'll get:
- **Ingest endpoint** — send events from your apps
- **Admin UI URL** — manage sources, destinations, segments
- **Write key** — authenticate your SDK calls

## 📦 Repo Structure

```
uniflow/
├── infra/                    # @uniflow/cdk — CDK constructs
│   └── src/
│       ├── stacks/UnifowStack.ts
│       └── constructs/
│           ├── StorageConstruct.ts      # DynamoDB · S3 · Kinesis · Firehose
│           ├── IngestionConstruct.ts    # API Gateway · Ingest Lambda
│           ├── ProcessingConstruct.ts   # Kinesis consumer · SQS fan-out
│           ├── AudienceConstruct.ts     # ECS Fargate · EventBridge Scheduler
│           └── AdminConstruct.ts        # Cognito · CloudFront · Management API
│
├── services/
│   ├── ingest/               # Validate events → Kinesis
│   ├── processor/            # Kinesis consumer → DynamoDB + SQS
│   ├── audience-builder/     # Fargate: Athena → segment membership
│   └── management-api/       # CRUD: sources · destinations · segments · profiles
│
├── connectors/
│   ├── sdk/                  # BaseConnector abstract class
│   ├── webhook/              # HTTP webhook (HMAC signing)
│   └── s3-export/            # S3 NDJSON export
│
├── libs/
│   ├── event-schema/         # Zod schemas for all event types
│   ├── identity/             # Identity resolution logic
│   └── logger/               # Structured JSON logging
│
├── cli/                      # uniflow CLI (npm: uniflow)
├── sdk/
│   ├── js/                   # @uniflow/js — browser + Node tracking SDK
│   └── python/               # uniflow-python tracking SDK
│
├── ui/                       # Next.js 15 admin dashboard
├── docker/                   # docker-compose + LocalStack for local dev
└── examples/                 # CDK app example · tracking scripts
```

## 📐 Data Model

Single-table DynamoDB design:

| Entity | PK | SK |
|---|---|---|
| Profile | `PROFILE#<userId>` | `META` |
| Event | `PROFILE#<userId>` | `EVENT#<ts>#<id>` |
| Identity link | `ANON#<anonymousId>` | `IDENTITY` |
| Segment | `SEGMENT#<id>` | `META` |
| Segment member | `SEGMENT#<id>` | `MEMBER#<userId>` |
| Source | `SOURCE#<id>` | `META` |
| Destination | `DEST#<id>` | `META` |
| Migration | `MIGRATION#<id>` | `META` |

## 💻 Local Dev

```bash
# Prerequisites: Docker, Node.js 20+, pnpm 9+

git clone https://github.com/maroil/uniflow
cd uniflow
pnpm install

# Start LocalStack (DynamoDB, S3, Kinesis, SQS)
docker compose -f docker/docker-compose.yml up -d localstack

# Send test events
npx ts-node examples/send-events.ts

# Run all tests
pnpm test

# Build all packages
pnpm build
```

## 🔌 Connector SDK

Build your own destination connector and publish it as `@uniflow/connector-<name>`:

```typescript
import { BaseConnector, type ConnectorEvent, type ConnectorResult } from '@uniflow/connector-sdk';
import { z } from 'zod';

const ConfigSchema = z.object({ apiKey: z.string() });

export class MyConnector extends BaseConnector<z.infer<typeof ConfigSchema>> {
  readonly metadata = {
    id: 'my-connector',
    name: 'My Service',
    description: 'Send events to My Service',
    configSchema: ConfigSchema,
  };

  async handle(event: ConnectorEvent, config: z.infer<typeof ConfigSchema>): Promise<ConnectorResult> {
    await fetch('https://api.myservice.com/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify(event),
    });
    return { success: true };
  }
}
```

## ⚙️ Configuration

`uniflow.config.yaml` is generated by `uniflow init` and should be version-controlled:

```yaml
version: "0.1"
region: us-east-1
adminEmail: admin@acme.com
retentionDays: 90
connectors:
  - webhook
  - s3-export
stackName: UnifowStack
```

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| IaC | AWS CDK (TypeScript) |
| Ingest | Lambda + API Gateway HTTP API |
| Long-running compute | ECS Fargate |
| Event buffer | Kinesis Data Streams (7-day retention) |
| Hot store | DynamoDB (single-table, PAY_PER_REQUEST) |
| Analytics | S3 + Athena + Glue Catalog |
| Auth | Cognito User Pool |
| Reliability | SQS + Dead-letter queues |
| Admin UI | Next.js 15 + Tailwind CSS v4 |
| Monorepo | pnpm + Turborepo |
| Local dev | docker-compose + LocalStack |

## 🗺 Roadmap

- [ ] Lambda authorizer for write-key validation
- [ ] Cognito JWT on management API
- [ ] Visual segment rule builder in Admin UI
- [ ] Docusaurus documentation site
- [ ] `uniflow dev` command (local hot-reload)
- [ ] CDK snapshot tests
- [ ] Community connector: Braze, Mixpanel, BigQuery

## 🤝 Contributing

Contributions are very welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

## 📄 License

MIT — see [LICENSE](LICENSE).
