# ViD Website Lead Persistence and Telegram Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist every accepted website lead before delivery and safely send a clear Telegram HTML notification with Moscow time.

**Architecture:** Keep `POST /api/order` in the existing aiohttp process. Validate a canonical Russian phone number, append the lead to a private root `leads.csv` and fsync before sending a Telegram message; return HTTP 202 if the lead is stored but Telegram is unavailable.

**Tech Stack:** Python 3.14 project environment, aiohttp, python-telegram-bot, standard-library `csv`, `html`, `zoneinfo`, and `unittest`.

**Spec:** `docs/superpowers/specs/2026-10-31-vid-bot-reliability-design.md`

## Global Constraints

- Preserve the required `POST /api/order` fields `name`, `contact`, `service`, and `details`, with maximum lengths 100, 120, 100, and 3000.
- Require contact to match `+7 (XXX) XXX-XX-XX`.
- Append to root `leads.csv`, recording Moscow receipt time and all four order fields; create with mode `0600`, flush and `fsync` before contacting Telegram.
- Add `leads.csv` to `.gitignore`; do not stage real lead data, `.env`, or credentials.
- A `200 {"ok": true}` means Telegram delivered the notification. A `202 {"ok": true, "telegram_delivered": false, "message": "Заявка сохранена, но уведомление менеджеру задерживается."}` means the lead is saved but the manager has not been notified.
- Persistence failure returns HTTP 500 with a generic user-safe error and must not call Telegram. Invalid-request and rate-limit statuses remain unchanged.
- Keep the limit of five valid orders per client IP per ten minutes; rate-limited orders are not persisted.
- Telegram HTML includes `🔥 Новая заявка vid64.ru`, escaped client name, linked phone, direction, comment, and a `Europe/Moscow` timestamp.
- Only one bot process may own a given CSV.

## Review Focus

- Incomplete, noncanonical, or extra-digit phone numbers must fail before persistence or Telegram. Test this in the API suite.
- Markup-like text in every user-controlled Telegram field must remain escaped. Test with hostile values.
- CSV data containing commas, quotes, and newlines must read back as one correct row, and the rate-limited sixth request must not be persisted. Test using `csv.DictReader`.
- A missing/unwritable lead file must not return success or call Telegram; a newly created file must have mode `0600`. Test both conditions.
- A Telegram outage or missing admin ID must preserve the row and return 202 without exposing private Telegram error details. Test both outcomes.

---

### Task 1: Persist and safely deliver website leads

**Files:**
- Modify: `bot/bot.py`
- Modify: `.gitignore`
- Test: `tests/test_bot_api.py`

**Interfaces:**
- Preserve `create_order_app(telegram_bot, admin_chat_id)` and the existing endpoint/payload.
- Add `LEADS_PATH` and private helpers `_append_lead(order, received_at=None) -> None` and `_format_order_message(order, received_at) -> str` in `bot/bot.py`.
- `_append_lead` writes UTF-8 CSV columns `received_at_msk,name,contact,service,details`, using `ZoneInfo("Europe/Moscow")`, restrictive creation permissions, `flush`, and `os.fsync`. Resolve `LEADS_PATH` at call time so tests can patch it to a temporary path.
- `_format_order_message` returns safe Telegram HTML and is sent with `parse_mode=ParseMode.HTML`.

- [ ] **Step 1: Write failing API tests**

Update the shared valid fixture to use `+7 (900) 123-45-67`. Verify row fields/time and mode `0600`; verify the fake Telegram client observes the row before `send_message`; assert exact heading, linked `tel:+79001234567`, Moscow timestamp, labels, and escaped malicious name/comment; assert Telegram failure and missing admin return 202 with `Заявка сохранена, но уведомление менеджеру задерживается.` while retaining the row; assert persistence failure returns 500 without Telegram; reject incomplete/noncanonical/extra-digit phones before persistence; and verify CSV quoting with commas, quotes, and newlines. Preserve existing malformed JSON, body-size, field-size, and rate-limit assertions, including that the sixth rate-limited request does not add a CSV row.

- [ ] **Step 2: Run tests and verify the expected failures**

Run: `.venv/bin/python -m unittest tests.test_bot_api -v`

Expected: new persistence, phone-validation, formatting, and 202 assertions fail because the endpoint does not yet write CSV or produce the requested message/response.

- [ ] **Step 3: Implement CSV persistence and Telegram formatting**

In `bot/bot.py`, validate the canonical contact; append each valid, rate-allowed lead before Telegram delivery; create the file with mode `0600`, flush and fsync; format and send the escaped HTML message; return HTTP 202 for a blank admin ID or `TelegramError`; and return HTTP 500 on persistence `OSError` without attempting Telegram. Add explicit logging and ignore `leads.csv`.

- [ ] **Step 4: Run API tests**

Run: `.venv/bin/python -m unittest tests.test_bot_api -v`

Expected: all API tests pass, including the original validation and rate-limit tests.

- [ ] **Step 5: Run the Python regression suite**

Run: `.venv/bin/python -m unittest discover -s tests -v`

Expected: API and image-generation tests pass.

- [ ] **Step 6: Commit this plan's implementation**

```bash
git add bot/bot.py tests/test_bot_api.py .gitignore
git commit -m "feat: persist and format website leads"
```
