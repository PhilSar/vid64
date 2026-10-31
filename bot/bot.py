import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


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

    application = Application.builder().token(token).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("id", chat_id))
    application.add_handler(MessageHandler(filters.ALL & ~filters.COMMAND, handle_message))
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()