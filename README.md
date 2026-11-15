# AutomateKit

Connect your apps, pick a trigger, and let workflows run themselves.

## Run locally

```bash
pnpm install
cp .env.example .env              # fill in the values
pnpm --filter @repo/db db:migrate
pnpm dev
```

## Run with Docker

```bash
cp .env.example .env              # fill in the values
docker compose up -d --build
```

Open http://localhost:5173
