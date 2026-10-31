# ViD Form Delivery Status Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tell website visitors when a lead is safely saved but Telegram delivery is delayed, without encouraging duplicate submissions.

**Architecture:** Preserve the same-origin order API and parsed response from `submitOrder`. Map confirmed Telegram delivery and durable-but-undelivered HTTP 202 to distinct Russian messages; treat both as accepted outcomes and reset the existing form after four seconds.

**Tech Stack:** React, Vite, JavaScript ES modules, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-31-vid-bot-reliability-design.md`

## Global Constraints

- Keep the existing order form and `POST /api/order` payload unchanged.
- HTTP 200 with `{"ok": true}` means Telegram delivered the notification.
- HTTP 202 with `{"ok": true, "telegram_delivered": false, "message": "<Russian notice>"}` means the lead is saved but the manager is not yet notified.
- Never display the delivery-confirmed success copy for a saved-but-undelivered response.
- Do not invite another submission while either accepted outcome is being displayed; clear the form and status after four seconds.
- Keep retryable error behavior for network failures and non-success HTTP responses.

## Review Focus

- HTTP 202 is `response.ok`; the exact `telegram_delivered` flag must select the delayed notice rather than the ordinary success copy. Test the mapping.
- Missing, malformed, or unconfirmed response bodies must retain existing safe error handling. Preserve existing order API tests.
- Either persisted outcome must not permit an immediate duplicate click and must return the form to its initial state after four seconds. Verify in browser after implementation.
- A 4xx/5xx/network error must not be presented as a persisted lead. Preserve existing failure tests.
- The displayed outage notice must not contain raw HTML or expose internal server details. Use plain text from the API contract and preserve safe error mapping.

---

### Task 1: Display delayed Telegram delivery accurately

**Files:**
- Modify: `src/order-api.js`
- Modify: `src/order-api.test.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Keep `submitOrder(values, fetchImpl = fetch)` returning the parsed JSON body.
- Add `getOrderStatusMessage(result) -> string` in `src/order-api.js`: for `telegram_delivered === false`, return `result.message`; otherwise return `Спасибо, заявка принята!`.
- In `App.jsx`, treat HTTP 200 and 202 as accepted/persisted outcomes; block resubmission while the status message is visible, and clear all fields plus status after four seconds.

- [ ] **Step 1: Write failing response-mapping tests**

In `src/order-api.test.js`, assert `{ ok: true }` maps to `Спасибо, заявка принята!`, and `{ ok: true, telegram_delivered: false, message: 'Заявка сохранена, но уведомление менеджеру задерживается.' }` maps to that exact server notice.

- [ ] **Step 2: Run the focused Node test and verify it fails**

Run: `node --test src/order-api.test.js`

Expected: new assertions fail because `getOrderStatusMessage` is not implemented.

- [ ] **Step 3: Implement response messaging and wire it to the form**

Implement `getOrderStatusMessage` in `src/order-api.js`. In `App.jsx`, display the mapped status for both accepted responses, disable repeat submission during either status, and schedule the existing four-second reset. Preserve the existing retryable error path for network and HTTP errors.

- [ ] **Step 4: Run the full Node test suite**

Run: `npm test`

Expected: all order API, phone-mask, site-content, and asset tests pass.

- [ ] **Step 5: Build and verify the form behavior**

Run: `npm run build`

Expected: Vite build exits successfully. In the browser, stub a 202 API response and verify the delayed notice, blocked duplicate submission, and four-second form reset; verify the existing 200 response still displays the delivered confirmation.

- [ ] **Step 6: Commit this plan's implementation**

```bash
git add src/order-api.js src/order-api.test.js src/App.jsx
git commit -m "feat: explain delayed Telegram lead delivery"
```
