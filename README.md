# AutomateKit

AutomateKit is a powerful workflow automation platform designed to integrate various services and execute complex workflows efficiently. It allows users to create triggers and actions to automate tasks across different applications like Gmail, Discord, and more.

## Architecture

The project is a monorepo built with [Turborepo](https://turbo.build/repo) and consists of the following applications:

### Apps

- **`web`**: The frontend dashboard built with [Vite](https://vitejs.dev/), [React](https://react.dev/), and [Tailwind CSS](https://tailwindcss.com/). It provides a user-friendly interface for managing workflows, viewing dashboard statistics, and configuring integrations.
- **`server`**: The backend API built with [Express](https://expressjs.com/) and [Node.js](https://nodejs.org/). It handles user authentication, workflow management, and communicates with the database.
- **`executor`**: A specialized worker service that executes the automation workflows. It uses [BullMQ](https://docs.bullmq.io/) and [Redis](https://redis.io/) for job queuing and processing.

### Packages

- **`@repo/common`**: Shared utilities, constants, and Zod schemas used across applications.
- **`@repo/db`**: Database schema and ORM configuration using [Drizzle ORM](https://orm.drizzle.team/) and PostgreSQL.
- **`@repo/eslint-config`**: Shared ESLint configurations.
- **`@repo/typescript-config`**: Shared TypeScript configurations.

## Tech Stack

- **Monorepo Tool**: Turborepo
- **Package Manager**: pnpm
- **Frontend**: React, Vite, Tailwind CSS, Radix UI, Lucide React
- **Backend**: Node.js, Express
- **Database**: PostgreSQL, Drizzle ORM
- **Queue/Workers**: BullMQ, Redis
- **Language**: TypeScript

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (>= 18)
- [pnpm](https://pnpm.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/abhradeepbarman/automatekit.git
    cd automatekit
    ```

2.  Install dependencies:

    ```bash
    pnpm install
    ```

3.  Set up environment variables:

    Copy the example environment files and configure them with your credentials.

    ```bash
    # Individual apps (development)
    cp apps/server/.env.example apps/server/.env
    cp apps/web/.env.example apps/web/.env
    cp apps/executor/.env.example apps/executor/.env
    cp packages/db/.env.example packages/db/.env
    ```

    Update the `.env` files with your database URL, Redis connection string, and other necessary secrets.

4.  Database Migration:

    Run the database migrations to set up the schema.

    ```bash
    # Using the filter to run the migrate script in the db package
    pnpm --filter @repo/db db:migrate
    ```

### Running the Project

To start all applications in development mode:

```bash
pnpm dev
```

This command uses Turbo to run the `dev` script in all apps (`web`, `server`, `executor`) simultaneously.

- **Web Dashboard**: http://localhost:5173 (default Vite port)
- **API Server**: http://localhost:3000 (check logs for actual port)

### Building

To build all apps and packages:

```bash
pnpm build
```

## Docker Deployment

The whole stack (web, server, executor, Postgres, Redis) runs from the root
`docker-compose.yaml`, which reads a single root `.env`:

```bash
cp .env.example .env
# fill in secrets, then:
docker compose up -d --build
```

Generate the required secrets with:

```bash
openssl rand -hex 32   # ACCESS_SECRET
openssl rand -hex 32   # REFRESH_SECRET
openssl rand -hex 32   # ENCRYPTION_KEY (must be exactly 64 hex characters)
```

Postgres and Redis are not published to the host — only `web` (`:3000`) and
`server` (`:8000`) are. The app containers wait for both datastores to report
_healthy_ before starting.

There is a single `docker-compose.yaml` for every environment. It builds from
source by default; to run the images pushed by CI instead, point it at them and
pull rather than build:

```bash
IMAGE_PREFIX=<docker-hub-username> IMAGE_TAG=prod-<git_sha> \
  docker compose --env-file .env pull
IMAGE_PREFIX=<docker-hub-username> IMAGE_TAG=prod-<git_sha> \
  docker compose --env-file .env up -d
```

The GitHub Actions workflow (`.github/workflows/deploy-prod.yaml`) does exactly
this on push to `main`. The deploy host needs only `docker-compose.yaml` and a
populated `.env` in `/var/www/automatekit/prod` — no source checkout.

Run migrations against the running database:

```bash
pnpm --filter @repo/db db:migrate
```

## Health Checks

| Endpoint        | Meaning                                                    |
| --------------- | ---------------------------------------------------------- |
| `/health`       | Liveness — the process is running.                         |
| `/health/ready` | Readiness — the database is reachable. Returns 503 if not. |

## Configuration

Both `server` and `executor` validate their environment at boot and exit with an
explicit list of problems if anything is missing or malformed, rather than
starting with insecure empty defaults. See `.env.example` for every variable and
[`docs/PRD.md`](docs/PRD.md#9-configuration) for what each one does.

## Environment Hygiene

- `.env.example` files are tracked; `.env` files are not.
- Keep `.env` values out of version control and use a secrets manager in production.
- Rotating `ENCRYPTION_KEY` makes stored OAuth connections undecryptable — users must reconnect.

## Documentation

- [Product Requirements Document](docs/PRD.md) — scope, requirements, architecture, data model, API surface.

## Contributing

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request
