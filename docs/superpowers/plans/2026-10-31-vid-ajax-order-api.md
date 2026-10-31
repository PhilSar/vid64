# AJAX Order API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send the website's order form directly to the configured Telegram administrator through an aiohttp API, without navigating away from the page.

**Architecture:** Run aiohttp in the existing polling bot process and bind it to `127.0.0.1:8080`. The browser posts to same-origin `/api/order`; Vite proxies this path in development and the production web server must proxy it to the private aiohttp listener.

**Tech Stack:** Python 3.14, python-telegram-bot 22.x, aiohttp 3.x, React 19, Vite 6, Node's built-in test runner, Python unittest.

**Spec:** `docs/superpowers/specs/2026-10-31-vid-ajax-order-api-design.md`

## Global Constraints

- Add `POST /api/order` using aiohttp on `127.0.0.1:8080`.
- Send validated JSON form fields to `TELEGRAM_ADMIN_CHAT_ID` using the existing bot token.
- Use same-origin `fetch('/api/order')`; Vite proxies `/api/` to port 8080 during development.
- Show «Спасибо, заявка принята!» only after Telegram accepts the message; show a useful error otherwise.
- Validate required fields and lengths, cap request-body size, and do not expose credentials or Telegram internals.
- Limit each client IP to five valid submissions per ten-minute window; production proxy must overwrite `X-Real-IP` with the originating address.
- Keep the API private behind the same-origin reverse proxy; do not read, print, or commit `.env` values.
- Production DNS, TLS, and reverse-proxy configuration are deployment prerequisites outside this repository.

## Review Focus

- Malformed/non-JSON and oversized request bodies must return client errors and must not call Telegram. Test in Task 1.
- Missing, blank, non-string, or overlong form fields must be rejected; valid field values must be formatted and delivered. Test in Task 1.
- Missing `TELEGRAM_ADMIN_CHAT_ID` must return an explicit service error without claiming delivery. Test in Task 1.
- Telegram send failure must return an error and must not expose upstream exception details. Test in Task 1.
- More than five valid submissions from one client IP in ten minutes must be rejected with HTTP 429; a different IP remains eligible. Test in Task 1.
- Fetch/network/server failures must not show the success message, while a confirmed success does; test the request helper and verify the visible states in Task 2.

---

### Task 1: Add aiohttp order endpoint to the Telegram bot

**Files:**
- Modify: `bot/requirements.txt`
- Modify: `bot/bot.py`
- Create: `tests/test_bot_api.py`

**Interfaces:**
- Produces `create_order_app(telegram_bot, admin_chat_id)` in `bot/bot.py`, returning an aiohttp application with `POST /api/order`.
- The request JSON shape is `{ "name": string, "contact": string, "service": string, "details": string }`.
- Valid submissions send a plain-text message with the existing labels and company heading to the configured chat. The route returns `{"ok": true}` only after Telegram succeeds.

- [ ] **Step 1: Write failing aiohttp endpoint tests**

Add `unittest.IsolatedAsyncioTestCase` tests using `aiohttp.test_utils` and a fake bot for:
- valid request sends the expected message to the configured chat and returns HTTP 200 with `{"ok": true}`;
- missing, blank, non-string, and overlong fields return HTTP 400 without sending;
- malformed JSON and non-JSON content return HTTP 400 without sending;
- a body over the configured size limit is rejected without sending;
- missing admin chat configuration returns HTTP 503 without sending;
- Telegram delivery failure returns HTTP 502 with a generic error body and does not include exception details.
- six valid requests from one `X-Real-IP` return five HTTP 200 responses followed by HTTP 429, while a second IP can still submit.

- [ ] **Step 2: Run the tests and verify the expected failures**

Run: `.venv/bin/python -m unittest tests.test_bot_api -v`
Expected: FAIL because the aiohttp application factory and endpoint do not exist.

- [ ] **Step 3: Add aiohttp and implement the endpoint**

Add `aiohttp>=3.9,<4.0` to `bot/requirements.txt`. Implement the app factory and JSON handler in `bot/bot.py`, with a 16 KiB request-body cap, trimmed string validation (name 100, contact 120, service 100, details 3000 characters), a bounded process-local limit of five valid submissions per client IP in ten minutes, explicit JSON errors, and a generic delivery-failure response. Read `X-Real-IP` only as a validated IP address; the production proxy must overwrite this header with the originating client IP. Start `AppRunner`/`TCPSite` during the Telegram application's `post_init` lifecycle and clean it up during `post_shutdown`; bind to `127.0.0.1:8080` so only the reverse proxy can reach it.

- [ ] **Step 4: Install bot dependencies and verify backend tests**

Run: `.venv/bin/python -m pip install -r bot/requirements.txt`
Run: `.venv/bin/python -m unittest tests.test_bot_api -v`
Expected: all endpoint tests pass without any real Telegram API call.

---

### Task 2: Submit the form with same-origin fetch

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/site-content.js`
- Modify: `vite.config.js`
- Create: `src/order-api.js`
- Create: `src/order-api.test.js`

**Interfaces:**
- `submitOrder(values, fetchImpl = fetch)` in `src/order-api.js` posts the four form fields as JSON to `/api/order`, parses the response, and throws a user-safe error for non-2xx or network failures.
- `App.jsx` retains the current required fields and displays server-confirmed success/error through the existing `role="status"` region.

- [ ] **Step 1: Write failing tests for the fetch helper**

Test that `submitOrder` makes a same-origin `POST /api/order` with `Content-Type: application/json` and the four fields; resolves only on HTTP success; and rejects on server errors, malformed success responses, and network failures.

- [ ] **Step 2: Run tests and verify the expected failures**

Run: `node --test src/order-api.test.js`
Expected: FAIL because `src/order-api.js` does not exist.

- [ ] **Step 3: Implement the fetch helper and replace Telegram navigation**

Implement `submitOrder`; update `App.jsx` to use it, remove `VITE_TELEGRAM_BOT_USERNAME`, `telegramUrl`, `window.open`, and the fallback link, and prevent duplicate submits while awaiting the response. Show «Спасибо, заявка принята!» only after confirmed API success; preserve an explicit failure status and allow retry. Update the contact description/button/confirmation copy in `src/site-content.js` for direct website submission.

- [ ] **Step 4: Add the Vite development proxy**

Configure Vite to proxy `/api/` to `http://127.0.0.1:8080`, preserving the `/api/order` path.

- [ ] **Step 5: Verify the helper, app behavior, and build**

Run: `node --test src/order-api.test.js`
Run: `npm test`
Run: `npm run build`
Expected: tests pass and the production bundle builds. In a browser, verify the success text appears only for a successful API response, failures remain retryable, and submission does not navigate away.

---

### Task 3: Document setup and production routing

**Files:**
- Modify: `README.md`

**Interfaces:**
- README setup uses the existing root `.env` keys `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_CHAT_ID`; it no longer requires a public bot username for form submissions.

- [ ] **Step 1: Update Telegram setup instructions**

Document installing `bot/requirements.txt`, configuring the token and administrator chat ID without publishing secrets, running the bot/API process, and local Vite proxy behavior.

- [ ] **Step 2: Document the production reverse-proxy prerequisite**

State that the production web server for `https://vid64.ru` must forward same-origin `/api/` requests to `http://127.0.0.1:8080`, overwrite `X-Real-IP` with the originating address, keep port 8080 private, and provide HTTPS to visitors; this repository does not contain the production web-server configuration.

- [ ] **Step 3: Run final validation**

Run: `.venv/bin/python -m unittest tests.test_bot_api -v`
Run: `npm test`
Run: `npm run build`
Run: `git diff --check`
Expected: all tests and the build pass, and the diff has no whitespace errors.
