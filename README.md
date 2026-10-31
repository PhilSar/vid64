# Север — студия дизайна

## Сайт

```sh
npm install
npm run dev
```

Сайт откроется по адресу, который выведет Vite (обычно `http://localhost:5173`). Для production-сборки используйте `npm run build`.

## Telegram-бот

1. Создайте бота через [@BotFather](https://t.me/BotFather) и укажите токен в `TELEGRAM_BOT_TOKEN` в корневом `.env`.
2. Укажите username бота без `@` в `VITE_TELEGRAM_BOT_USERNAME`.
3. Создайте окружение и установите зависимости: `python3 -m venv .venv && .venv/bin/python -m pip install -r bot/requirements.txt`.
4. Запустите `.venv/bin/python bot/bot.py` и отправьте боту команду `/id` в чате, куда должны приходить заявки.
5. Скопируйте ID из ответа в `TELEGRAM_ADMIN_CHAT_ID` и перезапустите бота. Перезапустите Vite, чтобы он подхватил username.

Клиентские сообщения появятся в указанном чате. Чтобы ответить клиенту, ответьте в Telegram непосредственно на скопированное сообщение клиента.