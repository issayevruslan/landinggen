# CSO Landing Generator

End-to-end stack to generate, explain, and publish brand-compliant landing pages behind Nginx Proxy Manager (NPM), using local storage.

## Prerequisites

- Docker & Docker Compose
- An existing NPM stack on the external Docker network `npm_web` (192.168.11.0/24)
- DNS pointing to your server for:
  - studio.<your-domain>, api.<your-domain>, gen.<your-domain>, lp.<your-domain>, track.<your-domain>, assets.<your-domain>
  - wildcard: *.lp.<your-domain> → CNAME to lp.<your-domain> (or A if your DNS requires)

## 1) Clone & Configure

```bash
cd /home/ubuntu/docker/landinggen

# Create environment
cp -n .env.example .env || true

# Edit .env with real secrets and IDs
vim .env
```

Important `.env` keys (examples only; do not commit secrets):
- Domain/hosts: DOMAIN, STUDIO_HOST, API_HOST, GEN_HOST, LP_HOST, TRACK_HOST, ASSETS_HOST
- Secrets: JWT_SECRET, NEXTAUTH_SECRET, ENCRYPTION_KEY
- DB/Cache: POSTGRES_*, REDIS_PASSWORD
- Analytics (optional):
  - NEXT_PUBLIC_GA_ID=G-XXXX
  - NEXT_PUBLIC_GTM_ID=GTM-XXXX

## 2) Storage

```bash
mkdir -p storage/public/{images,uploads,assets} storage/private/{pdf,exports}
sudo chown -R $USER:$USER storage
```

## 3) External Network

This stack assumes the existing NPM network is named `npm_web` on 192.168.11.0/24. The compose attaches services to that network with static IPs.

If your NPM network has a different name, update `docker-compose.yml` → `networks.web.external.name` to match.

## 4) Build & Start (no public ports)

```bash
# From repository root
docker compose up -d --build

# Check
docker compose ps
```

Services attach to the external NPM network (e.g., `npm_web`) and can be given fixed IPs in your environment. See `docker-compose.yml` and adjust IPs to your network.

## 5) NPM Proxy Hosts

Create hosts in NPM (UI on port 81), forwarding each subdomain to its corresponding container IP:PORT from your compose. Example:

| Domain                        | Scheme | Forward Host (example) | Port |
|-------------------------------|--------|-------------------------|------|
| studio.<your-domain>          | http   | <studio-container-ip>   | 3000 |
| api.<your-domain>             | http   | <api-container-ip>      | 3000 |
| gen.<your-domain>             | http   | <gen-container-ip>      | 3000 |
| lp.<your-domain>              | http   | <lp-container-ip>       | 3000 |
| *.lp.<your-domain> (wildcard) | http   | <lp-container-ip>       | 3000 |
| track.<your-domain>           | http   | <track-container-ip>    | 3000 |
| assets.<your-domain>          | http   | <assets-container-ip>   | 8080 |

SSL tab (each host): Force SSL, HTTP/2, HSTS. Use DNS challenge for `*.lp.cso.ae`.

Optional Advanced headers in NPM:

```
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## 6) Quick Health

```bash
# Example health checks (replace with your container IPs)
curl -s http://<api-container-ip>:3000/health   # API
curl -s http://<pdf-container-ip>:3000/health   # PDF
```

## 7) Use the System

1) Studio
- Open https://studio.<your-domain>
- The left JSON auto-fills analytics from `.env` via `/api/env`.
- Click "Generate" → a spec is created and rationale PDF generated.
- Click "Publish" with a slug (e.g., `difc-corp`) → live at:
  - https://lp.<your-domain>/p/<slug>
  - https://<slug>.lp.<your-domain> (requires wildcard host)

2) Preview from spec
- Any spec can be previewed via `https://lp.<your-domain>/preview?spec=<base64 JSON>`

3) Static assets
- Place public files under `storage/public` → served from https://assets.<your-domain>/

## 8) Analytics

- GA4/GTM IDs can be set globally in `.env` (NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_GTM_ID)
- Or per-spec via the Studio JSON `analytics` block.
- Verify on a published page: DevTools → Network → `gtag/js` or `gtm.js`.

## 9) Forms & Tracking

- Forms: LP posts to `/api/forms/submit` (proxied to API). Leads stored under `storage/private/exports/leads/`; optional webhook via `FORMS_WEBHOOK_URL`.
- Tracking: Client events post to `/api/track` (proxied to `track`).

## 10) SEO

- LP exposes `robots.txt` and `sitemap.xml` (built from published slugs) and sets canonical/OG for slug pages.

## 11) Wildcard Subdomains

- Middleware on LP rewrites `https://<slug>.lp.cso.ae/` → `/p/<slug>` and respects `X-Forwarded-Host` from NPM.

## 12) Troubleshooting

- NPM cannot reach a container: `docker network inspect npm_web` and confirm IPs.
- 502/timeout: Ensure services bind to `0.0.0.0:3000` and proxy host forwards the path unchanged.
- Analytics not loading: check `.env`, `/api/env`, and ad‑blockers/incognito.
- Storage permissions: `sudo chown -R $(id -u):$(id -g) storage`.

## 13) Backups

Database:
```bash
docker exec -t $(docker ps -qf name=_db_) \
  pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > /opt/backups/$(date +%F)-cso.sql
```

Files:
```bash
rsync -a /home/ubuntu/docker/landinggen/storage/ /opt/backups/cso-storage/
```

---

For deeper details, see `description.md` in this repo.
