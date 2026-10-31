# Vercel Telegram order API — short design

## Intent

Allow the existing Vite site to submit orders on Vercel without requiring a persistent Python server. A Vercel Node.js Serverless Function will validate the same order payload and send a Telegram message using server-side environment variables.

## Goals and boundaries

- Add a root `api/order.js` Vercel function for `POST /api/order`.
- Keep the form's same-origin `/api/order` request and preserve its established success shape: HTTP 200 with `{ ok: true, telegram_delivered: true }`.
- Reject invalid method, JSON, missing/oversized fields, and non-canonical Russian phone numbers before calling Telegram.
- Escape all user-provided Telegram HTML and create the `tel:` link from validated ASCII digits.
- Read `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_CHAT_ID` only on the server; never expose or log them or Telegram's private response body.
- Preserve local development through Vite's existing `/api` proxy to the Python bot on `127.0.0.1:8080`.
- Do not write to local disk or promise backup: this selected Telegram-only serverless design cannot durably persist leads when Telegram is unavailable.
- No Vercel CLI, new package, live Telegram request, or VPS deployment in this change.

## Approaches

1. **Vercel function in production; existing Python proxy locally (selected).** Add only the Node handler and keep Vite's current local proxy. This preserves the current `npm run dev` setup with no new dependency, but local requests are served by Python while production requests are served by the function.
2. **Use `vercel dev` locally and in production.** This exercises the same function locally but changes the developer startup workflow and requires Vercel CLI configuration/dependency.

## Decisions and constraints

- Use the platform's Node.js Serverless Function convention: default-exported `api/order.js` handler receiving `req` and `res`; use built-in `fetch`, no new dependencies.
- Accept only a JSON object with nonempty string fields `name`, `contact`, `service`, and `details`, using the existing field size limits and phone format.
- Return HTTP 400 for invalid input, 405 for a non-POST method, a generic non-success status for missing config/Telegram failures, and the established HTTP 200 success contract only after Telegram confirms delivery.
- Build Telegram HTML with `🔥 Новая заявка vid64.ru`, escaped client fields, the validated `tel:` phone URL, and a Moscow timestamp.
- Production deployment must configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_CHAT_ID` in Vercel project environment settings for production/preview as appropriate; never add secrets to the repository.

## Validation

- Add Node built-in tests for method/input rejection, Telegram request formatting and escaping, delivery success, missing configuration, and Telegram/network failure without sending real messages.
- Verify the Vite config still routes `/api/order` to the local bot.
- Run `npm test` and `npm run build`.
