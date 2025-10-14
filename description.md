# CSO.AE — Local-Storage Deployment (Behind Nginx Proxy Manager)

**Version:** 1.1 — static IPs moved to `192.168.11.180+`
**File:** `LOCAL_STORAGE_DEPLOYMENT.md`

This guide deploys the landing-page generator stack **with local disk storage** only.
We **do not modify** your existing Nginx Proxy Manager (NPM) stack; we only join its existing `web` network (`192.168.11.0/24`) and expose services via **static container IPs** that you’ll forward to from NPM.

---

## 0) Assumptions

* NPM is already running on this host:

  * Docker network named **`web`** on subnet **`192.168.11.0/24`** (your NPM example used `192.168.11.10`).
  * NPM listens on **80/443/81**.
* This project lives in a **separate folder** and **separate compose**.
* You want **local storage** (no S3/MinIO) for uploads, PDFs, templates, etc.

---

## 1) DNS

Create `A/AAAA` records to your server IP:

* `studio.cso.ae`, `api.cso.ae`, `gen.cso.ae`, `lp.cso.ae`, `track.cso.ae`, `assets.cso.ae`

Wildcard for campaign subdomains:

* `*.lp.cso.ae` → **CNAME** to `lp.cso.ae` (or `A` if your DNS requires)

> In NPM, get a **wildcard certificate** for `*.lp.cso.ae` using **DNS challenge**.

---

## 2) Folder Layout

```text
/home/ubuntu/cso-landinggen/
├─ docker-compose.yml
├─ .env
├─ storage/                      # persistent local storage (bind mount)
│  ├─ public/
│  │  ├─ images/
│  │  ├─ uploads/
│  │  └─ assets/
│  └─ private/
│     ├─ pdf/
│     └─ exports/
├─ apps/
│  ├─ studio/        # Next.js Admin UI (Dockerfile)
│  ├─ api/           # API: uploads, webhooks, file streaming
│  ├─ gen/           # Orchestrator (LLM prompts/guards)
│  ├─ lp-runtime/    # Next.js runtime for live campaigns
│  ├─ track/         # First-party event collector (optional)
│  └─ pdf/           # Headless renderer (writes PDFs to /data/private/pdf)
└─ packages/...
```

Everything that must **survive redeploys** lives under `./storage/`.

---

## 3) Environment (`.env`)

```dotenv
# ===== Domain =====
DOMAIN=cso.ae

# ===== Database / Cache =====
POSTGRES_USER=cso
POSTGRES_PASSWORD=change_me
POSTGRES_DB=cso_prod
REDIS_PASSWORD=change_me

# ===== App secrets =====
JWT_SECRET=change_me
NEXTAUTH_SECRET=change_me
OPENAI_API_KEY=sk-xxx
ENCRYPTION_KEY=change_me_32bytes

# ===== Public hosts (for CORS / absolute URLs) =====
STUDIO_HOST=studio.${DOMAIN}
API_HOST=api.${DOMAIN}
GEN_HOST=gen.${DOMAIN}
LP_HOST=lp.${DOMAIN}
TRACK_HOST=track.${DOMAIN}
ASSETS_HOST=assets.${DOMAIN}

# ===== Local storage mount & public base =====
FILE_STORAGE_ROOT=/data
PUBLIC_BASE_URL=https://${ASSETS_HOST}

# ===== Internal DB/Cache URLs =====
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
REDIS_URL=redis://default:${REDIS_PASSWORD}@redis:6379
```

---

## 4) Static IP Plan on `web` Network (Updated)

Pick free addresses in `192.168.11.180+`:

| Service        | IP             | Port | NPM → Forward to             |
| -------------- | -------------- | ---- | ---------------------------- |
| studio         | 192.168.11.180 | 3000 | `http://192.168.11.180:3000` |
| api            | 192.168.11.181 | 3000 | `http://192.168.11.181:3000` |
| gen            | 192.168.11.182 | 3000 | `http://192.168.11.182:3000` |
| lp             | 192.168.11.183 | 3000 | `http://192.168.11.183:3000` |
| track          | 192.168.11.184 | 3000 | `http://192.168.11.184:3000` |
| pdf            | 192.168.11.185 | 3000 | `http://192.168.11.185:3000` |
| assets (nginx) | 192.168.11.186 | 8080 | `http://192.168.11.186:8080` |

Wildcard: **`*.lp.cso.ae`** → forward to **`http://192.168.11.183:3000`**.

---

## 5) Docker Compose (no public ports; joins external `web` with fixed IPs)

**`docker-compose.yml`**

```yaml
version: "3.9"

networks:
  # reuse existing NPM network
  web:
    external: true
  # private network for stateful services
  core:
    external: false

volumes:
  pg_data:
  redis_data:

services:
  # ---------- Postgres ----------
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 10
    volumes:
      - pg_data:/var/lib/postgresql/data
    networks: [core]
    restart: unless-stopped

  # ---------- Redis ----------
  redis:
    image: redis:7-alpine
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}"]
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 10
    volumes:
      - redis_data:/data
    networks: [core]
    restart: unless-stopped

  # ---------- Static Assets (public, read-only) ----------
  assets:
    image: nginx:alpine
    volumes:
      - ./storage/public:/usr/share/nginx/html:ro
      - ./apps/assets/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      web:
        ipv4_address: 192.168.11.186
    restart: unless-stopped

  # ---------- Admin UI ----------
  studio:
    build: ./apps/studio
    environment:
      NODE_ENV: production
      NEXTAUTH_URL: https://${STUDIO_HOST}
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      FILE_STORAGE_ROOT: ${FILE_STORAGE_ROOT}
      PUBLIC_BASE_URL: ${PUBLIC_BASE_URL}
      API_BASE_URL: https://${API_HOST}
    volumes:
      - ./storage:/data
    depends_on: [db, redis, api]
    networks:
      core: {}
      web:
        ipv4_address: 192.168.11.180
    restart: unless-stopped

  # ---------- API (uploads/files/webhooks) ----------
  api:
    build: ./apps/api
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      FILE_STORAGE_ROOT: ${FILE_STORAGE_ROOT}
      PUBLIC_BASE_URL: ${PUBLIC_BASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGINS: https://${STUDIO_HOST},https://${LP_HOST},https://${ASSETS_HOST}
    volumes:
      - ./storage:/data
    depends_on: [db, redis]
    networks:
      core: {}
      web:
        ipv4_address: 192.168.11.181
    restart: unless-stopped

  # ---------- Orchestrator ----------
  gen:
    build: ./apps/gen
    environment:
      NODE_ENV: production
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      FILE_STORAGE_ROOT: ${FILE_STORAGE_ROOT}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      API_BASE_URL: https://${API_HOST}
    volumes:
      - ./storage:/data
    depends_on: [db, redis, api]
    networks:
      core: {}
      web:
        ipv4_address: 192.168.11.182
    restart: unless-stopped

  # ---------- Landing Page Runtime ----------
  lp:
    build: ./apps/lp-runtime
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      FILE_STORAGE_ROOT: ${FILE_STORAGE_ROOT}
      ORIGIN_HOST: ${LP_HOST}
      PUBLIC_BASE_URL: ${PUBLIC_BASE_URL}
    volumes:
      - ./storage:/data
    depends_on: [db, redis]
    networks:
      core: {}
      web:
        ipv4_address: 192.168.11.183
    restart: unless-stopped

  # ---------- Event Collector (optional) ----------
  track:
    build: ./apps/track
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
    depends_on: [db]
    networks:
      core: {}
      web:
        ipv4_address: 192.168.11.184
    restart: unless-stopped

  # ---------- PDF Renderer (headless) ----------
  pdf:
    build: ./apps/pdf
    environment:
      NODE_ENV: production
      FILE_STORAGE_ROOT: ${FILE_STORAGE_ROOT}
    volumes:
      - ./storage:/data
    networks:
      core: {}
      web:
        ipv4_address: 192.168.11.185
    restart: unless-stopped
```

---

## 6) Nginx Config for `assets` (read-only public files)

**`apps/assets/nginx.conf`**

```nginx
server {
  listen 8080;
  server_name _;

  root /usr/share/nginx/html;   # mounted from ./storage/public
  autoindex off;

  location / {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000";
    try_files $uri =404;
  }

  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

---

## 7) Build & Start

```bash
cd /home/ubuntu/cso-landinggen

# Create storage paths and set permissions
mkdir -p storage/public/{images,uploads,assets} storage/private/{pdf,exports}
sudo chown -R $USER:$USER storage

# Bring the stack up
docker compose up -d --build

# Check status
docker compose ps
```

---

## 8) Configure **Nginx Proxy Manager** (UI on port 81)

Create **Proxy Hosts** with these mappings:

| Domain               | Scheme | Forward Host   | Forward Port | Notes                        |
| -------------------- | ------ | -------------- | ------------ | ---------------------------- |
| `studio.cso.ae`      | http   | 192.168.11.180 | 3000         | Admin UI                     |
| `api.cso.ae`         | http   | 192.168.11.181 | 3000         | Uploads, webhooks            |
| `gen.cso.ae`         | http   | 192.168.11.182 | 3000         | Orchestrator                 |
| `lp.cso.ae`          | http   | 192.168.11.183 | 3000         | Runtime                      |
| `*.lp.cso.ae` (wild) | http   | 192.168.11.183 | 3000         | Needs **DNS challenge** cert |
| `track.cso.ae`       | http   | 192.168.11.184 | 3000         | Optional                     |
| `assets.cso.ae`      | http   | 192.168.11.186 | 8080         | Public static, read-only     |

**SSL tab (each host):**

* **Force SSL**, **HTTP/2**, **HSTS**
* Let’s Encrypt (HTTP challenge) for single hosts
* **DNS challenge** for wildcard `*.lp.cso.ae`

**Advanced (optional):**

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

---

## 9) Using Local Storage in Apps

* All services mount `./storage` → `/data`.
* **Public** files → `${FILE_STORAGE_ROOT}/public/...` → served at `https://assets.cso.ae/<path>`.
* **Private** files → `${FILE_STORAGE_ROOT}/private/...` → **not** web-exposed; serve via API after auth or with short-lived tokens.

**Node example (save & stream a PDF)**

```ts
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import express from "express";
const app = express();
const ROOT = process.env.FILE_STORAGE_ROOT || "/data";

app.post("/pdf", express.raw({ type: "application/pdf", limit: "25mb" }), async (req, res) => {
  const key = `private/pdf/${Date.now()}.pdf`;
  const full = path.join(ROOT, key);
  await fsp.mkdir(path.dirname(full), { recursive: true });
  await fsp.writeFile(full, req.body);
  res.json({ key });
});

app.get("/download", async (req, res) => {
  const key = String(req.query.key || "");
  const full = path.join(ROOT, key);
  if (!full.startsWith(path.join(ROOT, "private"))) return res.status(403).end();
  if (!fs.existsSync(full)) return res.status(404).end();
  res.setHeader("Content-Type", "application/pdf");
  fs.createReadStream(full).pipe(res);
});
```

---

## 10) Backups

**Database**

```bash
docker exec -t $(docker ps -qf name=_db_) \
  pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > /opt/backups/$(date +%F)-cso.sql
```

**Files**

```bash
rsync -a /home/ubuntu/cso-landinggen/storage/ /opt/backups/cso-storage/
```

Restore by reversing the commands.

---

## 11) Security Notes

* Rotate all secrets in `.env`; keep `.env` out of git.
* `assets` serves **only** `./storage/public` (read-only).
* Keep private PDFs/exports outside web path; serve through API after auth.
* Consider NPM **Access Lists** (IP allowlisting) for `studio.cso.ae`.
* Add CSP headers in app responses if feasible.

---

## 12) Troubleshooting

* **NPM can’t reach container** → Confirm the service is attached to `web` and IP matches. `docker network inspect web`.
* **SSL errors** → DNS must resolve to your server; port 80 open (HTTP challenge). Use correct DNS API creds for wildcard.
* **Uploads not saved** → Fix permissions on `./storage`: `sudo chown -R $(id -u):$(id -g) storage`.
* **Wildcard not working** → Ensure NPM has a wildcard cert for `*.lp.cso.ae` and a Proxy Host forwarding to `192.168.11.183:3000`.

---

## 13) Post-Deploy Checklist

* [ ] `docker compose ps` shows all services healthy
* [ ] NPM proxy hosts created with **192.168.11.180+** IPs
* [ ] TLS green lock for each domain + wildcard
* [ ] Studio can create a page → live at `https://<campaign>.lp.cso.ae`
* [ ] Public files available at `https://assets.cso.ae/...`
* [ ] Private PDFs under `/data/private/pdf` downloadable via API
* [ ] Backups configured (DB + storage)

---

