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

Use the root environment files for Docker deployments:

- `.env.staging` for `docker-compose.staging.yaml`
- `.env.prod` for `docker-compose.prod.yaml`

Create them from the examples and fill in real secrets:

```bash
cp .env.staging.example .env.staging
cp .env.prod.example .env.prod
```

Start staging:

```bash
docker compose --env-file .env.staging -f docker-compose.staging.yaml up -d --build
```

Start production:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yaml up -d --build
```

When deploying from CI/CD with prebuilt images, set image tags then pull:

```bash
STAGING_IMAGE_TAG=staging-<git_sha> docker compose --env-file .env.staging -f docker-compose.staging.yaml pull
PROD_IMAGE_TAG=prod-<git_sha> docker compose --env-file .env.prod -f docker-compose.prod.yaml pull
```

For deployment, you no longer need `apps/server/.env` or `apps/executor/.env` on the host.

## Environment Hygiene

- `.env.example` files are tracked; `.env` files are not.
- Keep `.env` values out of version control and use a secrets manager in production.
- For Docker, prefer `--env-file` with `.env.staging` or `.env.prod` rather than copying app-level `.env` files.

## Contributing

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request
