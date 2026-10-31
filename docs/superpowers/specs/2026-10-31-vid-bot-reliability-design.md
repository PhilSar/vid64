# ViD bot reliability and startup services

## Intent

Keep every valid, rate-limited local website lead before attempting Telegram delivery and format Telegram notifications safely and clearly.

## Goals

- Send Telegram HTML containing the requested heading, escaped customer fields, a safe `tel:` link, and a timestamp in the `Europe/Moscow` timezone.
- Append each valid accepted lead to a root-level `leads.csv` before calling Telegram. Flush and `fsync` the file before proceeding, create it with owner-only permissions, and do not add it to Git.
- If Telegram is unavailable or the admin chat is not configured after persistence, respond with HTTP 202 and an explicit response flag/message saying the lead is saved but the manager has not yet been notified. The browser form must display that distinction.
- If local persistence fails, do not attempt Telegram delivery and do not return a success-shaped response.

## Non-goals

- Automatically retrying or replaying Telegram notifications, building an admin dashboard, or introducing a database.
- Saving malformed or rate-limited requests as leads.
- Changing Telegram polling or the website's existing rate limit.

## Constraints and decisions

- The bot already runs one aiohttp API and Telegram polling process. Keep that lifecycle and use Python's standard-library CSV and `zoneinfo` modules.
- Preserve `POST /api/order` and its four required string fields (`name`, `contact`, `service`, `details`), with current maximum lengths 100, 120, 100, and 3000. Additionally require the canonical Russian phone format `+7 (XXX) XXX-XX-XX` to safely create the requested `tel:` link.
- Preserve the JSON response contract: `200 {"ok": true}` means Telegram delivered the notification. `202 {"ok": true, "telegram_delivered": false, "message": "<Russian notice>"}` means the lead is durably stored but no manager notification was sent. Persistence failures return HTTP 500 with a generic user-safe error; invalid requests remain 400/413 and rate-limited requests remain 429.
- Chosen storage: append-only root-level `leads.csv`; columns are Moscow receipt time and the four validated order fields. A new file is created with mode `0600`; data is flushed and synchronized before a Telegram request. Add the file to `.gitignore`.
- `TELEGRAM_ADMIN_CHAT_ID` remains the admin destination. Missing or blank values are treated as unavailable delivery, not as a reason to reject the request before persistence.
- Escape all dynamic fields for Telegram HTML. Format the heading `🔥 Новая заявка vid64.ru`, customer name, clickable `tel:` contact, selected direction, comment, and a `Europe/Moscow` timestamp.
- On a Telegram `TelegramError` or missing admin chat, retain the saved lead and return the 202 response described above, with the Russian notice `Заявка сохранена, но уведомление менеджеру задерживается.` The browser displays this notice rather than claiming delivery or encouraging a duplicate submission.
- On persistence failure, log the exception and return a non-success HTTP error; never call Telegram.
- The bot is one process per project deployment, consistent with the existing polling setup. Append, flush, and fsync happen synchronously without yielding the event loop, so handlers in that process cannot interleave CSV writes. Multiple bot instances sharing one CSV are unsupported and must be stated in the deployment notes.

## Approaches considered

1. **Append-only CSV (chosen):** simple to inspect and matches the request. `flush`/`fsync` before network delivery protects saved rows from process/network failures. Delivery retries and database-like status tracking remain out of scope.
2. **SQLite:** transactional storage and room for delivery status/retries, but adds schema and operational complexity beyond the requested local CSV/JSON backup.
3. **Rewrite a JSON array:** human-readable, but rewriting the whole file per lead creates a larger corruption window and is less suitable for append-only writes.

## Builder calls

- Use `leads.csv` in the repository root, not JSON Lines or a database.
- Only validated, non-rate-limited submissions are accepted leads and persisted.
- Return HTTP 202 after successful persistence even when Telegram is unavailable; explain that delivery is pending rather than encouraging duplicate form submissions.
- Keep the existing five-valid-orders-per-IP-per-ten-minutes limiter. Rate-limited submissions are not appended.

## Verification

- Add API tests proving HTML escaping and Moscow timestamp formatting, persistence before Telegram, retention on Telegram failure or missing admin chat, and a clear non-success response with no Telegram call when file persistence fails.
- Add frontend tests for displaying the saved-but-not-delivered notice.
- Run the Python and Node test suites, `npm run build`, and `git diff --check`.
