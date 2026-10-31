# Vercel Telegram Order API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send website orders to Telegram using a Vercel Serverless Function while preserving the existing local `npm run dev` workflow.

**Architecture:** Add a dependency-free Node.js function at `api/order.js` that validates the form payload, formats an escaped Telegram HTML message, and returns success only after Telegram confirms delivery. Keep Vite's local `/api/order` proxy pointed at the existing Python bot.

**Tech Stack:** Vercel Node.js Functions, built-in `fetch`, Node.js built-in test runner, Vite.

**Spec:** `docs/superpowers/specs/2026-11-01-vercel-telegram-api-design.md`

## Global Constraints

- Production endpoint is `POST /api/order` in root `api/order.js`.
- Success is HTTP 200 with `{ ok: true, telegram_delivered: true }`, matching the existing frontend contract.
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_CHAT_ID` are server-only environment variables.
- Validate the current four form fields and exact ASCII Russian phone format before Telegram delivery.
- Escape all user-controlled HTML; generate `tel:` only from the validated phone digits.
- Telegram or network errors must not return success or expose upstream error details.
- No local lead-file persistence, external database, Vercel CLI, new dependency, or real Telegram request.
- Local Vite `/api/order` continues to proxy to `http://127.0.0.1:8080`.

## Review Focus

- Malformed or non-object JSON: return a client error without contacting Telegram.
- Oversized or noncanonical fields, including Unicode numerals in phone: reject before sending.
- User-controlled markup and quotes in all fields: escape in message text and keep the `tel:` URL derived only from validated ASCII digits.
- Missing environment values or Telegram rejection/network failure: return a generic server error without exposing token or upstream response.
- Local development routing: `/api/order` remains proxied to the Python bot, not intercepted by the Vite SPA fallback.

---

### Task 1: Implement the Vercel order function

**Files:**
- Create: `api/order.js`
- Create: `api/order.test.js`
- Modify: `vite.config.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: the existing order object `{ name, contact, service, details }` and frontend's `POST /api/order` contract.
- Produces: a default-exported Vercel handler `(req, res)`, HTTP 200 delivery confirmation, and a local Vite proxy route for `/api/order`.

- [x] **Step 1: Write failing tests**

  Use Node's built-in `node:test` and invoke the real handler with small request/response objects and a stubbed global `fetch`. Assert:
  - Non-POST requests return 405 and do not call `fetch`.
  - Invalid JSON/object, missing/blank/over-limit fields, and non-ASCII or incomplete phone numbers return 400 without Telegram calls.
  - A valid request POSTs to the Telegram `sendMessage` endpoint using the configured token, configured chat ID, `parse_mode: "HTML"`, Moscow timestamp, escaped user fields, and a digits-only `tel:` link.
  - Telegram `{ ok: true }` yields exactly HTTP 200 `{ ok: true, telegram_delivered: true }`.
  - Missing secrets, Telegram API rejection, malformed Telegram JSON, and network error return generic errors without exposing response details.
  - The Vite config still maps `/api/order` to `http://127.0.0.1:8080`.

- [x] **Step 2: Run tests and verify the missing handler causes expected failures**

  Run: `node --test api/order.test.js`
  Expected: FAIL because `api/order.js` does not yet exist.

- [x] **Step 3: Implement `api/order.js`**

  Use the Vercel Node.js default handler shape, built-in `fetch`, current field length limits (`name: 100`, `contact: 120`, `service: 100`, `details: 3000`), and exact phone format `+7 (XXX) XXX-XX-XX` with ASCII digits. Use `Europe/Moscow` for the timestamp. Return generic JSON errors and never include Telegram's response body or token in a client response.

- [x] **Step 4: Make the local Vite proxy explicit**

  Configure the `/api/order` Vite proxy target as `http://127.0.0.1:8080`, preserving the existing Python bot local backend.

- [x] **Step 5: Document Vercel configuration**

  Add a concise README section explaining that Vercel deploys `api/order.js` and requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_CHAT_ID` in the project's server-side environment settings. State that requests are not durably stored when Telegram delivery fails. Do not include real credentials.

- [x] **Step 6: Run focused tests**

  Run: `node --test api/order.test.js`
  Expected: all new handler and proxy tests pass.

- [x] **Step 7: Run full verification**

  Run: `npm test && npm run build && git diff --check`
  Expected: all Node tests pass, Vite build exits successfully, and diff check exits zero.

- [x] **Step 8: Commit the implementation**

  Stage only `api/order.js`, `api/order.test.js`, `vite.config.js`, `README.md`, and this plan/spec. Do not stage `.env`, `leads.csv`, `dist/`, or `.vscode/`.
