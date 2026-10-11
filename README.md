# Nottex

## Production Docker Compose

The root `docker-compose.yml` is the production stack. MongoDB is reachable only
inside the private Compose network. Mailpit is not part of this stack; configure
a real SMTP provider before starting the application.

1. Copy `.env.example` to `.env` and fill in the required values. Generate
   separate random secrets for the application signing key and both MongoDB
   passwords, for example with `openssl rand -hex 32`. `MONGO_APP_PASSWORD`
   must be hexadecimal and at least 64 characters. Do not reuse the root
   password. Production startup also requires `SECRET_KEY` to be at least 64
   characters and rejects `DEBUG=true`.
2. Set `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` for your production mail
   provider. SMTP STARTTLS is enabled by default on port 587. For implicit TLS,
   set `SMTP_SSL=true` and use the provider's SSL port.
3. Set `FRONTEND_URL` to the public HTTPS origin of the application.
   `CORS_ALLOW_ORIGINS` is a JSON array of exact browser origins, for example
   `["https://your-domain.example"]`. Add a second origin explicitly if the
   frontend is hosted on a separate domain; wildcards are rejected. CORS only
   allows the API methods and headers used by the application and exposes
   `Retry-After` for rate-limit responses.
4. Provision a valid certificate and private key for the public hostname, then
   set `TLS_CERTIFICATE_PATH` and `TLS_PRIVATE_KEY_PATH` to their absolute host
   paths. The certificate file must contain the full chain. Compose mounts both
   files read-only; renew the files and recreate/restart the frontend container
   after renewal so Nginx reloads them. Do not expose this stack publicly before
   TLS works with the hostname browsers will use.
5. Start the stack with `docker compose up -d --build`.

Nginx redirects HTTP to HTTPS and serves the frontend and API over TLS 1.2/1.3.
The HTTPS responses include HSTS (`max-age=31536000`), CSP, `nosniff`, click
protection, a referrer policy, and a restrictive permissions policy. The CSP
allows inline styles because the current UI uses React style properties; script
execution remains limited to same-origin assets. Certificates are supplied by
the operator (for example, from an ACME client); this repository does not issue
or renew certificates itself.

Access tokens expire after 12 hours by default (production rejects a configured
lifetime above 12 hours). Logout, password reset/change, and email change bump a
per-user token version, revoking earlier tokens on the next API/SSE check. This
revokes all of that user's sessions at once. The frontend now uses an
`Authorization` header for SSE via `fetch`, so the JWT is no longer placed in
request URLs. Tokens are still stored in `localStorage`; an XSS flaw could read
them, so an HttpOnly cookie session with CSRF protection remains a worthwhile
future hardening step. Existing access tokens without the new version claim are
rejected after this update, so users must sign in again.

New accounts do not receive an access token at registration. Login and all
authenticated endpoints require a verified email; changing an email requires
verification again before the account can be used.

The MongoDB initialization script creates `nottex_app` with `readWrite` access
only to the `users` and `notes` databases. The application connects as that user;
the root account is reserved for MongoDB initialization and its health check.
Neither MongoDB nor Mailpit publishes a host port in this stack.

API rate limits use atomic MongoDB token buckets, so they apply across backend
replicas. Defaults include 20 login attempts per IP per minute, 10 attempts per
email per 15 minutes, 5 registrations per IP per hour, 3 verification or reset
emails per address per hour, and 8 TOTP operations per account per minute.
Authenticated requests are limited to 180 per user and 300 per IP per minute;
creation limits are 60 notes, 20 workspaces, and 30 share changes per hour per
user. A note can have at most 50 collaborators. Expired rate-limit records are
removed by a MongoDB TTL index.

If another load balancer or CDN sits in front of Nginx, configure Nginx's real
IP module for only that provider's trusted proxy ranges. Do not trust arbitrary
client-supplied `X-Forwarded-For` values.

### Existing MongoDB volume

MongoDB's initialization scripts run only when its data directory is empty. An
existing `nottex_mongodb_data` volume will not automatically gain the restricted
application user. Before starting the backend against an existing volume, use an
administrative MongoDB session to create `nottex_app` in the `admin` database
with `readWrite` roles on `users` and `notes`, using the same password as
`MONGO_APP_PASSWORD`. Preserve the existing volume; do not remove it as a way to
rerun initialization.

Keep `.env` out of version control and backups that are accessible to ordinary
users. For hosted deployments, prefer the platform's secret manager over a
plain-text environment file.
