# Contributing to Uniflow CDP

Thank you for your interest in contributing! This document explains how to get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Building a Connector](#building-a-connector)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- Docker (for local dev with LocalStack)
- An AWS account (for integration testing)

### Setup

```bash
git clone https://github.com/maroil/uniflow
cd uniflow
pnpm install

# Configure git hooks (conventional commits)
git config core.hooksPath .githooks
```

### Run tests

```bash
pnpm test          # all packages
pnpm test --filter @uniflow/event-schema  # single package
```

### Build

```bash
pnpm build
```

### Local dev (LocalStack)

```bash
docker compose -f docker/docker-compose.yml up -d localstack
npx ts-node examples/send-events.ts
```

## Development Workflow

1. Fork the repository and create a branch from `main`
2. Branch names: `feat/<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`
3. Make your changes with tests
4. Run `pnpm lint && pnpm test && pnpm build`
5. Open a pull request

## Commit Messages

We enforce **Conventional Commits** via a git hook:

```
<type>[(scope)]: <description>

Types: feat | fix | chore | docs | style | refactor | test | perf | ci | build | revert
```

Examples:
```
feat(ingest): add writeKey Lambda authorizer
fix(processor): handle missing userId in identity graph
chore(deps): bump aws-cdk-lib to 2.155.0
test(event-schema): add screen event coverage
```

## Pull Request Process

1. Fill in the PR template
2. Ensure CI is green (lint + test + build)
3. Request a review from a maintainer
4. Squash-merge after approval

## Building a Connector

To build a community connector:

1. Create a package `packages/connector-<name>/`
2. Implement `BaseConnector<TConfig>` from `@uniflow/connector-sdk`
3. Publish as `@uniflow/connector-<name>` on npm
4. Add to the [connector registry](docs/connectors.md) via PR

See [connectors/webhook](connectors/webhook) for a reference implementation.
