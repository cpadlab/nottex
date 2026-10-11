# Nottex

## Production Docker Compose

The root `docker-compose.yml` is the production stack. MongoDB is reachable only
inside the private Compose network. Mailpit is not part of this stack; configure
a real SMTP provider before starting the application.

1. Copy `.env.example` to `.env` and fill in the required values. Generate
   separate random secrets for the application signing key and both MongoDB
   passwords, for example with `openssl rand -hex 32`. `MONGO_APP_PASSWORD`
   must be hexadecimal and at least 64 characters. Do not reuse the root
   password.
2. Set `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` for your production mail
   provider. SMTP STARTTLS is enabled by default on port 587. For implicit TLS,
   set `SMTP_SSL=true` and use the provider's SSL port.
3. Set `FRONTEND_URL` to the public HTTPS origin of the application.
4. Start the stack with `docker compose up -d --build`.

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
