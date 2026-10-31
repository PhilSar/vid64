# Vid64 Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the production build and Ubuntu 24.04 deployment files for `vid64.ru`.

**Architecture:** Build the existing Vite application into ignored `dist/`; serve it through an Nginx HTTP bootstrap site that proxies `/api/` to the loopback aiohttp service, then use Certbot's Nginx plugin for HTTPS. Run the existing bot process under systemd as `vidbot`.

**Tech Stack:** Vite/npm, Nginx, systemd, Python virtualenv, Certbot.

**Spec:** `docs/superpowers/specs/2026-11-01-vid64-deployment-design.md`

## Global Constraints

- Target Ubuntu 24.04 and domain `vid64.ru`.
- Project path is `/opt/vid64`; systemd service account is `vidbot`.
- Backend API listens only on `127.0.0.1:8080`; Nginx must proxy `/api/` and set `X-Real-IP` from `$remote_addr`.
- Do not publish `.env` or lead data; `.env` is readable only by the bot account/group and `leads.csv` is owned by `vidbot` with mode `0600`.
- Cache `/assets/` fingerprinted build files as immutable; do not long-cache `index.html`.
- Use HTTP as the initial Certbot bootstrap config; Certbot's Nginx plugin configures TLS and redirect.
- Do not track `dist/`; keep existing unrelated `.vscode/` changes untouched.

## File Structure

- Create `nginx.conf`: site-level Nginx config for static `dist`, SPA fallback, compression, cache, and API proxy.
- Create `vid-bot.service`: systemd unit launching `/opt/vid64/.venv/bin/python /opt/vid64/bot/bot.py` with `Restart=always`.
- Create `deploy.md`: concise Russian Ubuntu 24.04 instructions for source transfer, permissions, build, service, Nginx, Certbot, and operations.
- Modify `README.md`: link the existing production API guidance to `deploy.md` and remove its now-stale statement that no production web-server config exists.
- Modify `tests/test_service_templates.py`: add assertions for the new unit and Nginx routing/cache/compression directives without changing existing service-template coverage.
- Generate ignored `dist/` with the production Vite build.

## Review Focus

- Unknown VPS address or unavailable source transfer: the deployment steps use explicit placeholders and explain how to transfer the project without assuming a Git remote.
- DNS not yet pointed to the VPS: document that DNS and inbound ports 80/443 must be ready before Certbot runs.
- Missing `.env` or incorrect permissions: setup instructions create it for the bot group with no world access; systemd must fail visibly if it is absent.
- Missing or unwritable `leads.csv`: pre-create the file owned by `vidbot`, mode `0600`, so service startup can persist leads.
- Nginx cache accidentally retaining stale app shell or API traffic: test that index has no long cache, only assets are immutable, and API is proxied with real client IP.

---

### Task 1: Preparing the production deployment bundle

**Files:**
- Create: `nginx.conf`
- Create: `vid-bot.service`
- Create: `deploy.md`
- Modify: `tests/test_service_templates.py`
- Generate (ignored): `dist/`

**Interfaces:**
- Consumes: the existing `bot/bot.py`, `.venv`, and API at `127.0.0.1:8080`.
- Produces: site root `/opt/vid64/dist`, systemd unit `vid-bot.service`, and step-by-step Ubuntu 24.04 deployment instructions.

- [ ] **Step 1: Add failing deployment-file tests**

  Extend the existing unittest module with tests that assert:
  - Nginx uses `server_name vid64.ru`, `root /opt/vid64/dist`, `try_files` SPA fallback, gzip, and immutable caching for `/assets/` without long caching `index.html`.
  - Nginx proxies `/api/` to `http://127.0.0.1:8080` and sets `X-Real-IP` to `$remote_addr`.
  - `vid-bot.service` runs the existing venv bot as `vidbot`, uses `/opt/vid64`, loads `.env`, and contains `Restart=always`.
  Review `deploy.md` manually for source transfer, DNS/ports, `.env` and `leads.csv` permissions, Certbot, and journal logs; do not make human-readable instructions brittle by asserting prose fragments in a unit test.

- [ ] **Step 2: Run the focused tests and verify they fail for missing deployment files**

  Run: `.venv/bin/python -m unittest discover -s tests -p test_service_templates.py -v`
  Expected: FAIL because the new config/service/docs are not present yet.

- [ ] **Step 3: Create `nginx.conf` and `vid-bot.service`**

  Use the exact paths and values from Global Constraints. Nginx is the HTTP bootstrap site for Certbot; include `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` proxy headers. Keep API and app-shell caching separate. The systemd unit should use `Type=simple`, `Restart=always`, and `RestartSec=5s`, and include `NoNewPrivileges=true`, `PrivateTmp=true`, and `UMask=0077`.

- [ ] **Step 4: Write `deploy.md`**

  Provide ordered commands for Ubuntu 24.04 setup, creating `vidbot`, transferring source without a Git remote, installing Python and Node dependencies, creating `.env` with restricted permissions, creating `leads.csv` with mode `0600`, building the site, installing/enabling the service and Nginx site, running `nginx -t`, obtaining the certificate with `certbot --nginx -d vid64.ru`, opening only SSH/HTTP/HTTPS, and checking/stopping service logs.

- [ ] **Step 5: Run the focused tests**

  Run: `.venv/bin/python -m unittest discover -s tests -p test_service_templates.py -v`
  Expected: PASS for all service-template and new deployment assertions.

- [ ] **Step 6: Build and inspect the production output**

  Run: `npm run build`
  Expected: Vite exits successfully and generates `dist/index.html` plus fingerprinted files under `dist/assets/`; verify with `find dist -maxdepth 2 -type f`.

- [ ] **Step 7: Run project verification**

  Run: `.venv/bin/python -m unittest discover -s tests -q && npm test && npm run build && git diff --check`
  Expected: all tests pass, Vite builds, and whitespace validation exits successfully.

- [ ] **Step 8: Commit the deployment bundle**

  Stage only `nginx.conf`, `vid-bot.service`, `deploy.md`, `README.md`, `tests/test_service_templates.py`, and this plan/spec if not already committed. Do not stage `dist/`, `.env`, `leads.csv`, or `.vscode/`.
