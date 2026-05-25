# Mtendere Production Deployment Architecture

Target domains:

- Public app: `https://mtendereeducationconsult.com`
- Admin app: `https://admin.mtendereeducationconsult.com`
- API and WebSocket gateway: `https://api.mtendereeducationconsult.com`

## Architecture

Nginx is the public edge. It terminates HTTPS, redirects all HTTP traffic to HTTPS, serves the public and admin Vite builds as static assets, and proxies only the API domain to the private Node process on `127.0.0.1:5000`.

The Node API runs under PM2 as `mec-api`. PM2 handles auto restart, memory restart, startup persistence, and log files. The backend must not be exposed directly to the internet.

```
Browser -> HTTPS Nginx
  mtendereeducationconsult.com       -> /var/www/mec/dist/client
  admin.mtendereeducationconsult.com -> /var/www/mec/dist/admin
  api.mtendereeducationconsult.com   -> 127.0.0.1:5000
```

## Production Blockers Found And Fixed

- Frontend and admin API calls were relative to the serving domain. They now resolve through `VITE_API_URL`.
- WebSocket clients were using the current host. They now connect to the API origin and upgrade to `wss`.
- Production CORS could include development origins. Production runtime now allows only the public and admin domains.
- The backend listened publicly by default. Production now binds to `127.0.0.1` unless `HOST` is explicitly set.
- Admin subdomain builds needed a root asset base. `Admin/.env.production` sets `VITE_ADMIN_BASE_PATH=/`.
- WebSocket subscriptions did not distinguish public and admin channels. Admin-only real-time channels now require a valid admin portal token.
- `.env.example` contained deploy-time values and has been sanitized. Rotate any credential that was previously committed or shared.

## Environment Files

Frontend `client/.env.production` and tracked template `client/.env.production.example`:

```
VITE_API_URL=https://api.mtendereeducationconsult.com
VITE_SITE_URL=https://mtendereeducationconsult.com
```

Admin `Admin/.env.production` and tracked template `Admin/.env.production.example`:

```
VITE_API_URL=https://api.mtendereeducationconsult.com
VITE_SITE_URL=https://admin.mtendereeducationconsult.com
VITE_ADMIN_BASE_PATH=/
```

Backend production environment should be created from `.env.example` as `.env.production`. Set real secret values for:

- `DATABASE_URL`
- `JWT_SECRET`
- `EMAIL_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `SENTRY_DSN`

Do not commit `.env`, `.env.production`, or provider credentials.

## Build

Use Node 22 LTS, matching `.node-version` and `.nvmrc`.

Run from the repository root:

```
npm ci
npm ci --prefix ./Admin
npm run check
npm run build
```

Expected build outputs:

- Public app: `dist/client`
- Admin app: `dist/admin`
- API bundle: `dist/index.js`

## PM2 Runtime

Install PM2 on the server:

```
npm install -g pm2
mkdir -p /var/www/mec/logs/pm2
cd /var/www/mec
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup systemd
```

Run the command printed by `pm2 startup systemd`. After that, reboot persistence is enabled.

Operational commands:

```
pm2 status
pm2 logs mec-api
pm2 reload ecosystem.config.cjs --env production
pm2 monit
```

Install log rotation:

```
sudo cp infra/logrotate/mec-api /etc/logrotate.d/mec-api
sudo logrotate -d /etc/logrotate.d/mec-api
```

## Nginx

Install the config:

```
sudo cp infra/nginx/mtendereeducationconsult.conf /etc/nginx/sites-available/mtendereeducationconsult.conf
sudo ln -s /etc/nginx/sites-available/mtendereeducationconsult.conf /etc/nginx/sites-enabled/mtendereeducationconsult.conf
sudo nginx -t
sudo systemctl reload nginx
```

Issue TLS certificates for all three domains before enabling the HTTPS servers:

```
sudo certbot --nginx -d mtendereeducationconsult.com -d admin.mtendereeducationconsult.com -d api.mtendereeducationconsult.com
```

## Security Controls

- HTTPS is enforced at Nginx with permanent HTTP redirects and HSTS.
- API CORS allows credentials only from:
  - `https://mtendereeducationconsult.com`
  - `https://admin.mtendereeducationconsult.com`
- Backend refresh cookies are `HttpOnly`, `Secure` in production, and `SameSite=Lax`.
- Bearer tokens are sent in `Authorization` headers, not query strings, except WebSocket upgrade authentication.
- Internal API port `5000` binds to loopback and is not public.
- Static apps include security headers and CSP allowing API/WebSocket access only to the API domain.
- Admin registration is restricted in production for privileged roles.

## Validation Checklist

```
curl -I http://mtendereeducationconsult.com
curl -I https://mtendereeducationconsult.com
curl -I https://admin.mtendereeducationconsult.com
curl https://api.mtendereeducationconsult.com/api/health
curl -I -H "Origin: https://mtendereeducationconsult.com" https://api.mtendereeducationconsult.com/api/health
curl -I -H "Origin: https://admin.mtendereeducationconsult.com" https://api.mtendereeducationconsult.com/api/health
curl -I -H "Origin: https://example.com" https://api.mtendereeducationconsult.com/api/health
```

Expected:

- HTTP redirects to HTTPS.
- Public and admin apps return HTML.
- API health returns `{"status":"ok"}`.
- Approved origins receive `Access-Control-Allow-Origin`.
- Unapproved origins do not receive CORS access and mutating requests are rejected.

## Scaling Notes

The current real-time broadcaster is in-memory, so PM2 runs one API instance to keep WebSocket updates correct. Before horizontal API scaling, add Redis or another pub/sub adapter for WebSocket fan-out across instances.

The route structure already supports future modules for scholarships, jobs, analytics, events, applications, MEL systems, partner systems, and AI integrations. Keep new modules behind `/api/<module>` and `/api/admin/<module>` boundaries, use the shared API client, and add module-specific admin real-time channels only after defining access control.
