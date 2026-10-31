# Design: AJAX order submissions for ООО «ВиД»

## Intent

Let visitors submit the website order form without leaving the page. A successful response means the aiohttp endpoint accepted the request and Telegram confirmed delivery to the configured administrator chat.

## Goals

- Add `POST /api/order` to the existing Telegram bot process using aiohttp on `127.0.0.1:8080`.
- Send validated JSON form fields to `TELEGRAM_ADMIN_CHAT_ID` using the existing bot token.
- Replace the Telegram deep link with same-origin `fetch('/api/order')` and show «Спасибо, заявка принята!» only after a successful server response; show a useful error otherwise.
- Keep the API private behind the site server's same-origin `/api/` reverse proxy. Configure Vite's development proxy to forward `/api/` to port 8080.
- Validate required fields and lengths, cap request-body size, and return explicit JSON status codes without exposing credentials or Telegram internals.
- Limit each client IP to five valid submissions per ten-minute window; require the production proxy to overwrite `X-Real-IP` with the originating address.
- Document local startup and the production reverse-proxy requirement; add focused backend and frontend tests.

## Non-goals

- Configure DNS, TLS, or the production web server for `vid64.ru`; those deployment files and hosting access are not present in this repository.
- Change the Telegram bot's existing polling-based customer conversation behavior.
- Store submitted orders in a database or add a new external service.

## Approaches

1. **Same-origin reverse proxy (selected).** The browser posts to `/api/order`; the production web server forwards `/api/` to aiohttp on loopback port 8080, and Vite proxies the same route during local development. This avoids browser CORS configuration and keeps the Telegram token server-side. Production proxy setup remains a deployment prerequisite.
2. **Separate API hostname.** Configure an API URL and CORS allowlist for a separate HTTPS host. This adds DNS/TLS and cross-origin configuration, so it is unnecessary when the site host can proxy requests.

## Constraints and implementation calls

- Preserve the current form fields and message format: name, contact, service, and details.
- Start and stop aiohttp as part of the bot application's lifecycle so polling and HTTP requests share the existing bot instance and token.
- Bind the API to loopback; the reverse proxy is the only intended network entry point.
- Accept only JSON, reject missing/blank/oversized fields and oversized bodies, and send plain-text Telegram messages.
- Apply a bounded, process-local rate limit of five valid submissions per client IP per ten minutes; use the validated `X-Real-IP` supplied by the trusted local reverse proxy, falling back to the transport address.
- Do not read, print, or commit `.env` values. Required deployment variables remain `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_CHAT_ID`.
- An HTTP success is returned only after Telegram accepts `sendMessage`; upstream failures return an error and are logged server-side.

## Acceptance

- Backend tests cover valid delivery, invalid/missing fields, malformed JSON, missing configuration, and Telegram delivery failure without making real Telegram requests.
- Frontend tests or browser verification confirm valid submissions use same-origin fetch, success shows «Спасибо, заявка принята!», and failed requests never show a success state.
- `npm test`, the focused Python test suite, and `npm run build` pass.
- README explains starting the bot and configuring the production `/api/` reverse proxy to `127.0.0.1:8080`.
