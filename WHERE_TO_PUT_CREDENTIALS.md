# AutomateKit — Where to Put Credentials & Configuration

This document is the single source of truth for **every secret, credential, and
environment variable** used in this project, and exactly where each one lives.

---

## Overview of Configuration Layers

```
GitHub Actions Secrets  →  used during CI/CD (build-time & SSH deploy)
VPS .env files          →  used at container runtime (never committed to git)
Nginx config            →  lives on VPS host, reverse proxies to correct port
```

---

## 1. GitHub Actions Secrets

**Where:** GitHub → Repository → Settings → Secrets and variables → Actions → Repository secrets

These are injected into **both** workflow files (`deploy-prod.yaml`, `deploy-staging.yaml`) at CI run time.

| Secret Name            | Description                                        | Example Value                     |
| ---------------------- | -------------------------------------------------- | --------------------------------- |
| `DOCKER_USERNAME`      | Your Docker Hub username                           | `johndoe`                         |
| `DOCKER_TOKEN`         | Docker Hub access token (not your password)        | `dckr_pat_xxx...`                 |
| `SSH_HOST`             | VPS public IP address or hostname                  | `203.0.113.42`                    |
| `SSH_USER`             | VPS user that runs deploys                         | `ubuntu`                          |
| `SSH_PRIVATE_KEY`      | Full content of your `~/.ssh/id_rsa` (private key) | `-----BEGIN OPENSSH...`           |
| `PROD_DEPLOY_PATH`     | Absolute path to prod folder on VPS                | `/var/www/automatekit/prod`       |
| `PROD_APP_URL`         | Full public URL of the production frontend         | `https://yourapp.com`             |
| `PROD_API_BASE_URL`    | Full public URL of the production API              | `https://api.yourapp.com`         |
| `STAGING_APP_URL`      | Full public URL of the staging frontend            | `https://staging.yourapp.com`     |
| `STAGING_API_BASE_URL` | Full public URL of the staging API                 | `https://staging-api.yourapp.com` |

> **Note:** `VITE_APP_BASE_URL` and `VITE_API_BASE_URL` are baked into the
> frontend image at build time via `--build-arg`. They come from the
> `PROD_APP_URL` / `PROD_API_BASE_URL` secrets above.

> **Note:** `STAGING_IMAGE_TAG` and `PROD_IMAGE_TAG` are **not** secrets —
> they are derived from `github.sha` inside the workflow automatically.

---

## 2. VPS Production Environment File

**Where on VPS:** `/var/www/automatekit/prod/.env.prod`

**Permissions:** `chmod 600 .env.prod` — owner-only read/write.

This file is **never committed to git**. Use `.env.prod.example` as the template.

```bash
# ── Docker Hub ────────────────────────────────────────────────────────────────
DOCKER_USERNAME=yourdockerhubuser

# ── Image tag (overridden by CI via inline env; this is a fallback) ───────────
PROD_IMAGE_TAG=prod-latest

# ── PostgreSQL ────────────────────────────────────────────────────────────────
PROD_POSTGRES_USER=postgres
PROD_POSTGRES_PASSWORD=<strong-random-password>
PROD_POSTGRES_DB=AutomateX

# ── Database URL (must match the above three values + container name) ─────────
PROD_DATABASE_URL=postgresql://postgres:<strong-random-password>@automatekit-postgres-prod:5432/AutomateX

# ── Redis (container name used as hostname inside Docker network) ─────────────
PROD_REDIS_HOST=automatekit-redis-prod
PROD_REDIS_PORT=6379

# ── Server ────────────────────────────────────────────────────────────────────
PROD_SERVER_PORT=8000

# ── Public URLs ───────────────────────────────────────────────────────────────
PROD_APP_URL=https://yourapp.com
PROD_API_BASE_URL=https://api.yourapp.com

# ── JWT Secrets (generate with: openssl rand -hex 64) ────────────────────────
PROD_ACCESS_SECRET=<64-byte-hex-string>
PROD_REFRESH_SECRET=<64-byte-hex-string>

# ── Google OAuth ──────────────────────────────────────────────────────────────
PROD_GOOGLE_CLIENT_ID=<from Google Cloud Console>
PROD_GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
PROD_GOOGLE_REDIRECT_URI=https://api.yourapp.com/api/v1/auth/google/callback
```

---

## 3. VPS Staging Environment File

**Where on VPS:** `/var/www/automatekit/staging/.env.staging`

**Permissions:** `chmod 600 .env.staging`

```bash
# ── Docker Hub ────────────────────────────────────────────────────────────────
DOCKER_USERNAME=yourdockerhubuser

# ── Image tag (overridden by CI via inline env; this is just a fallback) ──────
STAGING_IMAGE_TAG=staging-latest

# ── PostgreSQL ────────────────────────────────────────────────────────────────
STAGING_POSTGRES_USER=postgres
STAGING_POSTGRES_PASSWORD=<staging-random-password>
STAGING_POSTGRES_DB=AutomateX

# ── Database URL ──────────────────────────────────────────────────────────────
STAGING_DATABASE_URL=postgresql://postgres:<staging-random-password>@automatekit-postgres-staging:5432/AutomateX

# ── Redis ─────────────────────────────────────────────────────────────────────
STAGING_REDIS_HOST=automatekit-redis-staging
STAGING_REDIS_PORT=6379

# ── Server ────────────────────────────────────────────────────────────────────
STAGING_SERVER_PORT=8000

# ── Public URLs ───────────────────────────────────────────────────────────────
STAGING_APP_URL=https://staging.yourapp.com
STAGING_API_BASE_URL=https://staging-api.yourapp.com

# ── JWT Secrets ───────────────────────────────────────────────────────────────
STAGING_ACCESS_SECRET=<64-byte-hex-string>
STAGING_REFRESH_SECRET=<64-byte-hex-string>

# ── Google OAuth ──────────────────────────────────────────────────────────────
STAGING_GOOGLE_CLIENT_ID=<from Google Cloud Console — can be same app with staging redirect>
STAGING_GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
STAGING_GOOGLE_REDIRECT_URI=https://staging-api.yourapp.com/api/v1/auth/google/callback
```

---

## 4. VPS Folder Layout

The two environments are fully isolated on disk:

```
/var/www/automatekit/
├── prod/
│   ├── docker-compose.prod.yaml        ← copy from repo
│   └── .env.prod                       ← ⚠️ NEVER commit this
│
└── staging/
    ├── docker-compose.staging.yaml     ← copy from repo
    └── .env.staging                    ← ⚠️ NEVER commit this
```

> The GitHub Actions workflow for **prod** expects `PROD_DEPLOY_PATH` =
> `/var/www/automatekit/prod`.  
> The staging workflow is hardcoded to `cd /var/www/automatekit/staging`.

---

## 5. Nginx Configuration (Host — not Docker)

Nginx runs on the VPS host and reverse-proxies each domain to the correct
localhost port.

**Where:** `/etc/nginx/sites-available/automatekit` (symlinked to `sites-enabled/`)

```nginx
# ── Production Frontend ───────────────────────────────────────────────────────
server {
    listen 80;
    server_name yourapp.com www.yourapp.com;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
    }
}

# ── Production API ────────────────────────────────────────────────────────────
server {
    listen 80;
    server_name api.yourapp.com;

    location / {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

# ── Staging Frontend ─────────────────────────────────────────────────────────
server {
    listen 80;
    server_name staging.yourapp.com;

    location / {
        proxy_pass         http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
    }
}

# ── Staging API ───────────────────────────────────────────────────────────────
server {
    listen 80;
    server_name staging-api.yourapp.com;

    location / {
        proxy_pass         http://127.0.0.1:8100;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

After editing, enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/automatekit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

For **HTTPS**, use Certbot:

```bash
sudo certbot --nginx -d yourapp.com -d www.yourapp.com -d api.yourapp.com \
             -d staging.yourapp.com -d staging-api.yourapp.com
```

---

## 6. Port Mapping Summary

| Environment | Service               | Host Port | Container Port | Nginx Domain              |
| ----------- | --------------------- | --------- | -------------- | ------------------------- |
| Prod        | Web (nginx in Docker) | `3000`    | `80`           | `yourapp.com`             |
| Prod        | Server (Node.js API)  | `8000`    | `8000`         | `api.yourapp.com`         |
| Staging     | Web (nginx in Docker) | `3100`    | `80`           | `staging.yourapp.com`     |
| Staging     | Server (Node.js API)  | `8100`    | `8000`         | `staging-api.yourapp.com` |
| Prod        | PostgreSQL            | _none_    | `5432`         | internal only             |
| Prod        | Redis                 | _none_    | `6379`         | internal only             |
| Staging     | PostgreSQL            | _none_    | `5432`         | internal only             |
| Staging     | Redis                 | _none_    | `6379`         | internal only             |

> PostgreSQL and Redis have **no host port binding** — they are only reachable
> by other containers on the same Docker network.

---

## 7. Checklist: First-Time VPS Setup

```bash
# 1. Create folders
sudo mkdir -p /var/www/automatekit/prod
sudo mkdir -p /var/www/automatekit/staging
sudo chown -R $USER:$USER /var/www/automatekit

# 2. Copy compose files from repo (or git clone the repo and copy)
cp docker-compose.prod.yaml    /var/www/automatekit/prod/
cp docker-compose.staging.yaml /var/www/automatekit/staging/

# 3. Create and fill the env files (NEVER copy .env.prod.example directly — it has placeholders)
nano /var/www/automatekit/prod/.env.prod
nano /var/www/automatekit/staging/.env.staging

# 4. Lock down permissions
chmod 600 /var/www/automatekit/prod/.env.prod
chmod 600 /var/www/automatekit/staging/.env.staging

# 5. Log in to Docker Hub on the VPS (one-time)
docker login

# 6. Bootstrap prod (first run — also starts postgres & redis)
cd /var/www/automatekit/prod
docker compose --env-file .env.prod -f docker-compose.prod.yaml up -d

# 7. Bootstrap staging
cd /var/www/automatekit/staging
docker compose --env-file .env.staging -f docker-compose.staging.yaml up -d

# 8. Run database migrations (adjust command to your migration tool)
docker exec automatekit-server-prod node dist/migrate.js
docker exec automatekit-server-staging node dist/migrate.js
```

---

## 8. Security Rules

| Rule                                                       | Reason                                            |
| ---------------------------------------------------------- | ------------------------------------------------- |
| Never commit `.env.prod` or `.env.staging`                 | Leaks secrets into git history                    |
| Use Docker Hub **access tokens**, not your password        | Can be revoked independently                      |
| Use a **dedicated deploy SSH key** (not your personal key) | Blast radius control                              |
| `chmod 600` all `.env` files                               | Prevents other users on the VPS from reading them |
| Do not expose PostgreSQL or Redis ports to the host        | Attack surface reduction                          |
| Rotate `ACCESS_SECRET` and `REFRESH_SECRET` periodically   | Invalidates stolen JWTs                           |
| Use Certbot/Let's Encrypt for HTTPS                        | Prevents credentials in transit being sniffed     |
