# Local Development

## Prerequisites

- Node.js compatible with the repo engines. Current local check used Node
  `v25.2.1`; package docs require at least Node 18 and README mentions Node 20.
- pnpm compatible with the repo engines. Current local check used pnpm `10.30.3`.
- Docker and Docker Compose for MySQL and Redis.

## Install

**Run From:** repository root

```powershell
pnpm install
```

## Middleware

**Run From:** repository root

```powershell
docker compose up -d mysql redis
```

## Backend

**Run From:** repository root

```powershell
pnpm dev:server
```

Backend package command root is `packages/server`.

## Web Frontend

**Run From:** repository root

```powershell
pnpm dev:web
```

Default Vite port is `5173`.

## Miniapp

**Run From:** repository root

```powershell
pnpm dev:miniapp
```

Open the generated miniapp output with WeChat Developer Tools as described in
`packages/miniapp/CLAUDE.md`.

## Environment Files

Environment files exist locally and must not be committed. Use examples as
templates, not as proof that secrets are configured.
