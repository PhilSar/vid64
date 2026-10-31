from collections import OrderedDict, deque
import csv
from datetime import datetime
import html
from ipaddress import ip_address
import json
import logging
import os
from pathlib import Path
import re
from time import monotonic
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from aiohttp import web
from telegram import Bot, Update
from telegram.constants import ParseMode
from telegram.error import TelegramError
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

LEADS_PATH = Path(__file__).resolve().parents[1] / "leads.csv"
MOSCOW_TIMEZONE = ZoneInfo("Europe/Moscow")
RUSSIAN_PHONE_PATTERN = re.compile(r"\+7 \([0-9]{3}\) [0-9]{3}-[0-9]{2}-[0-9]{2}")
LEAD_SAVE_ERROR = {"error": "Could not save order"}
TELEGRAM_DELIVERY_DELAYED = {
    "ok": True,
    "telegram_delivered": False,
    "message": "Заявка сохранена, но уведомление менеджеру задерживается.",
}
ORDER_BODY_LIMIT = 16 * 1024
ORDER_RATE_LIMIT = 5
ORDER_RATE_WINDOW_SECONDS = 10 * 60
ORDER_RATE_CLIENT_LIMIT = 4096
ORDER_FIELD_LIMITS = {
    "name": 100,
    "contact": 120,
    "service": 100,
    "details": 3000,
}
TELEGRAM_BOT_KEY = web.AppKey("telegram_bot", Bot)
ADMIN_CHAT_ID_KEY = web.AppKey("admin_chat_id", str)
ORDER_ATTEMPTS_KEY = web.AppKey("order_attempts", OrderedDict)

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


def create_order_app(telegram_bot: Bot, admin_chat_id: str | None) -> web.Application:
    app = web.Application(client_max_size=ORDER_BODY_LIMIT)
    app[TELEGRAM_BOT_KEY] = telegram_bot
    app[ADMIN_CHAT_ID_KEY] = (admin_chat_id or "").strip()
    app[ORDER_ATTEMPTS_KEY] = OrderedDict()
    app.router.add_post("/api/order", handle_order)
    return app


def _client_ip(request: web.Request) -> str:
    forwarded_ip = request.headers.get("X-Real-IP", "").strip()
    if forwarded_ip:
        try:
            return str(ip_address(forwarded_ip))
        except ValueError:
            pass
    return request.remote or "unknown"


def _is_rate_limited(request: web.Request) -> bool:
    now = monotonic()
    client_ip = _client_ip(request)
    attempts_by_ip = request.app[ORDER_ATTEMPTS_KEY]
    attempts = attempts_by_ip.get(client_ip)

    if attempts is None:
        if len(attempts_by_ip) >= ORDER_RATE_CLIENT_LIMIT:
            attempts_by_ip.popitem(last=False)
        attempts = deque()
        attempts_by_ip[client_ip] = attempts
    else:
        attempts_by_ip.move_to_end(client_ip)
        cutoff = now - ORDER_RATE_WINDOW_SECONDS
        while attempts and attempts[0] <= cutoff:
            attempts.popleft()

    if len(attempts) >= ORDER_RATE_LIMIT:
        return True

    attempts.append(now)
    return False


def _append_lead(order: dict[str, str], received_at: datetime | None = None) -> None:
    received_at = received_at or datetime.now(MOSCOW_TIMEZONE)
    if received_at.tzinfo is None:
        received_at = received_at.replace(tzinfo=MOSCOW_TIMEZONE)
    received_at = received_at.astimezone(MOSCOW_TIMEZONE)

    try:
        descriptor = os.open(
            LEADS_PATH,
            os.O_APPEND | os.O_CREAT | os.O_EXCL | os.O_WRONLY,
            0o600,
        )
        created = True
    except FileExistsError:
        descriptor = os.open(LEADS_PATH, os.O_APPEND | os.O_WRONLY)
        created = False

    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "a", encoding="utf-8", newline="") as leads_file:
            descriptor = -1
            writer = csv.DictWriter(
                leads_file,
                fieldnames=(
                    "received_at_msk",
                    "name",
                    "contact",
                    "service",
                    "details",
                ),
            )
            if os.fstat(leads_file.fileno()).st_size == 0:
                writer.writeheader()
            writer.writerow(
                {
                    "received_at_msk": received_at.isoformat(timespec="seconds"),
                    **order,
                }
            )
            leads_file.flush()
            os.fsync(leads_file.fileno())
    finally:
        if descriptor >= 0:
            os.close(descriptor)

    if created:
        directory_descriptor = os.open(
            LEADS_PATH.parent,
            os.O_RDONLY | getattr(os, "O_DIRECTORY", 0),
        )
        try:
            os.fsync(directory_descriptor)
        finally:
            os.close(directory_descriptor)


def _format_order_message(
    order: dict[str, str],
    received_at: datetime,
) -> str:
    contact_digits = re.sub(r"\D", "", order["contact"])
    moscow_time = received_at.astimezone(MOSCOW_TIMEZONE)
    return "\n".join(
        (
            "🔥 <b>Новая заявка vid64.ru</b>",
            "",
            f"<b>Имя:</b> {html.escape(order['name'], quote=True)}",
            (
                f'<b>Телефон:</b> <a href="tel:+{contact_digits}">'
                f"{html.escape(order['contact'], quote=True)}</a>"
            ),
            f"<b>Направление:</b> {html.escape(order['service'], quote=True)}",
            f"<b>Комментарий:</b> {html.escape(order['details'], quote=True)}",
            f"<b>Дата:</b> {moscow_time.strftime('%d.%m.%Y %H:%M')} МСК",
        )
    )


async def handle_order(request: web.Request) -> web.Response:
    admin_chat_id = request.app[ADMIN_CHAT_ID_KEY]

    if request.content_type != "application/json":
        return web.json_response({"error": "Expected JSON"}, status=400)

    try:
        payload = await request.json()
    except web.HTTPRequestEntityTooLarge:
        return web.json_response({"error": "Request too large"}, status=413)
    except (json.JSONDecodeError, UnicodeDecodeError, web.HTTPBadRequest):
        return web.json_response({"error": "Invalid JSON"}, status=400)

    if not isinstance(payload, dict):
        return web.json_response({"error": "Invalid order"}, status=400)

    order = {}
    for field, max_length in ORDER_FIELD_LIMITS.items():
        value = payload.get(field)
        if not isinstance(value, str) or not value.strip():
            return web.json_response({"error": "Invalid order"}, status=400)
        normalized = value.strip()
        if len(normalized) > max_length:
            return web.json_response({"error": "Invalid order"}, status=400)
        order[field] = normalized

    if not RUSSIAN_PHONE_PATTERN.fullmatch(order["contact"]):
        return web.json_response({"error": "Invalid order"}, status=400)

    if _is_rate_limited(request):
        return web.json_response(
            {"error": "Too many requests"},
            status=429,
        )

    received_at = datetime.now(MOSCOW_TIMEZONE)
    try:
        _append_lead(order, received_at)
    except OSError:
        logger.exception("Could not save website order")
        return web.json_response(LEAD_SAVE_ERROR, status=500)

    message = _format_order_message(order, received_at)
    if not admin_chat_id:
        logger.error("TELEGRAM_ADMIN_CHAT_ID is not configured; order saved locally")
        return web.json_response(TELEGRAM_DELIVERY_DELAYED, status=202)

    try:
        await request.app[TELEGRAM_BOT_KEY].send_message(
            chat_id=admin_chat_id,
            text=message,
            parse_mode=ParseMode.HTML,
        )
    except TelegramError:
        logger.exception("Could not deliver website order to Telegram")
        return web.json_response(
            TELEGRAM_DELIVERY_DELAYED,
            status=202,
        )

    return web.json_response({"ok": True, "telegram_delivered": True})


async def start_order_api(application: Application) -> None:
    order_app = create_order_app(
        application.bot,
        os.getenv("TELEGRAM_ADMIN_CHAT_ID", "").strip(),
    )
    runner = web.AppRunner(order_app)
    await runner.setup()
    try:
        site = web.TCPSite(runner, "127.0.0.1", 8080)
        await site.start()
    except OSError:
        await runner.cleanup()
        raise
    application.bot_data["order_api_runner"] = runner
    logger.info("Order API listening on 127.0.0.1:8080")


async def stop_order_api(application: Application) -> None:
    runner = application.bot_data.pop("order_api_runner", None)
    if runner is not None:
        await runner.cleanup()


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    admin_chat_id = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "").strip()
    user = update.effective_user
    chat_id = update.effective_chat.id

    if admin_chat_id and str(chat_id) == admin_chat_id:
        await update.effective_message.reply_text(
            "Бот для связи с клиентами запущен. Ответьте на сообщение клиента, "
            "чтобы отправить ему ответ."
        )
        return

    await update.effective_message.reply_text(
        f"Здравствуйте, {user.first_name}! Напишите нам сообщение, и команда ответит вам здесь."
    )


async def chat_id(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        f"ID этого чата: {update.effective_chat.id}"
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    chat = update.effective_chat
    admin_chat_id = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "").strip()

    if not admin_chat_id:
        await message.reply_text("Связь пока настраивается. Попробуйте написать нам позже.")
        logger.error("TELEGRAM_ADMIN_CHAT_ID is not configured")
        return

    if str(chat.id) == admin_chat_id:
        replied = message.reply_to_message
        customer_id = context.application.bot_data.get("customer_by_message", {}).get(
            replied.message_id if replied else None
        )
        if customer_id is None:
            await message.reply_text("Ответьте именно на пересланное сообщение клиента.")
            return
        try:
            await context.bot.copy_message(
                chat_id=customer_id,
                from_chat_id=chat.id,
                message_id=message.message_id,
            )
            await message.reply_text("Ответ отправлен клиенту.")
        except Exception:
            logger.exception("Could not deliver a reply to customer %s", customer_id)
            await message.reply_text("Не удалось доставить ответ. Проверьте, что клиент не заблокировал бота.")
        return

    try:
        copied = await context.bot.copy_message(
            chat_id=int(admin_chat_id),
            from_chat_id=chat.id,
            message_id=message.message_id,
        )
        context.application.bot_data.setdefault("customer_by_message", {})[
            copied.message_id
        ] = chat.id
        user = update.effective_user
        username = f"@{user.username}" if user.username else "без username"
        await context.bot.send_message(
            chat_id=int(admin_chat_id),
            text=f"Клиент: {user.full_name} ({username})\nID: {chat.id}\nОтветьте на сообщение выше.",
        )
        await message.reply_text("Спасибо! Сообщение передано команде. Скоро ответим.")
    except Exception:
        logger.exception("Could not forward a message from customer %s", chat.id)
        await message.reply_text("Не получилось отправить сообщение. Попробуйте ещё раз позже.")


def main() -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token or token == "replace_with_bot_token":
        raise SystemExit("Укажите TELEGRAM_BOT_TOKEN в корневом файле .env")

    application = (
        Application.builder()
        .token(token)
        .post_init(start_order_api)
        .post_shutdown(stop_order_api)
        .build()
    )
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("id", chat_id))
    application.add_handler(MessageHandler(filters.ALL & ~filters.COMMAND, handle_message))
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()