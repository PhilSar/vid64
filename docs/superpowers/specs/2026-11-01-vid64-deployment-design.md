# Vid64 production deployment — short design

## Intent

Prepare the existing Vite site and aiohttp/Telegram bot for deployment to `vid64.ru` on Ubuntu 24.04. A fresh VPS operator should be able to build and serve the site, route form submissions only to the loopback API, keep the bot running under systemd, and enable HTTPS without exposing secrets or lead data.

## Goals and boundaries

- Build the production site into the existing ignored `dist/` directory and verify its generated files.
- Add a site-level Nginx configuration for `/opt/vid64/dist`, SPA fallback, gzip, cache policy, and `/api/` proxying to `127.0.0.1:8080` with the real client IP forwarded.
- Add `vid-bot.service` running the existing virtualenv entry point as a dedicated unprivileged user, with `Restart=always`.
- Add a concise Russian `deploy.md` for Ubuntu 24.04, including DNS/firewall prerequisites, source transfer (the repository currently has no Git remote), dependencies, permissions for `.env` and `leads.csv`, Nginx, Certbot, service operations, and logs.
- Do not deploy to or modify a real VPS, send Telegram messages, expose the API port publicly, or track build output/secrets.

## Approaches

1. **HTTP Nginx site plus Certbot Nginx plugin (selected).** Install the site config, verify it, then use `certbot --nginx` to obtain and configure HTTPS. This is the shortest first deployment path, at the cost of Certbot modifying the active Nginx site file.
2. **Fixed HTTP+HTTPS Nginx config plus Certbot webroot.** Obtain a certificate before enabling the final TLS config. This keeps more of the TLS config in source control but adds bootstrap and certificate-ordering steps.

## Decisions and constraints

- Target Ubuntu 24.04 and Nginx; use `/opt/vid64`, service account `vidbot`, and the existing `.venv`/bot entry point as documented defaults.
- Keep the checked-in Nginx site config as the Certbot bootstrap HTTP configuration. Certbot adds HTTPS and the HTTP-to-HTTPS redirect after DNS is pointed at the VPS.
- Cache Vite fingerprinted `/assets/` files as immutable; avoid long caching for `index.html`. Compress text-based responses.
- Use `vidbot` for the bot process. Keep the project tree readable/traversable by Nginx, `.env` private to the bot group, and `leads.csv` owned by `vidbot` with mode `0600`.
- Build `dist/` in the workspace as requested; it remains ignored and is not committed.

## Deliverables and validation

- Root files: `nginx.conf`, `vid-bot.service`, and `deploy.md`.
- Run `npm run build`, inspect the generated `dist/`, run focused tests for the deployment files if practical, and check the final diff without disturbing the pre-existing `.vscode/` changes.
