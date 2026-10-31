import csv
import json
import stat
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

from aiohttp.test_utils import TestClient, TestServer
from telegram.constants import ParseMode
from telegram.error import TelegramError

from bot.bot import create_order_app


VALID_ORDER = {
    "name": "Алина",
    "contact": "+7 (900) 123-45-67",
    "service": "Изделия на заказ",
    "details": "Нержавейка + гибка",
}


class FakeBot:
    def __init__(self, error=None, leads_path=None):
        self.messages = []
        self.error = error
        self.leads_path = leads_path
        self.leads_at_send = None

    async def send_message(self, *, chat_id, text, parse_mode=None):
        if self.leads_path is not None and self.leads_path.exists():
            self.leads_at_send = self.leads_path.read_text(encoding="utf-8")
        if self.error:
            raise self.error
        self.messages.append((chat_id, text, parse_mode))


class OrderApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.leads_path = Path(self.tempdir.name) / "leads.csv"
        self.leads_path_patch = patch(
            "bot.bot.LEADS_PATH",
            self.leads_path,
            create=True,
        )
        self.leads_path_patch.start()
        self.bot = FakeBot(leads_path=self.leads_path)
        self.client = TestClient(
            TestServer(create_order_app(self.bot, "-1001234567890"))
        )
        await self.client.start_server()

    async def asyncTearDown(self):
        await self.client.close()
        self.leads_path_patch.stop()
        self.tempdir.cleanup()

    async def test_valid_order_is_persisted_before_telegram_delivery(self):
        response = await self.client.post("/api/order", json=VALID_ORDER)

        self.assertEqual(response.status, 200)
        self.assertEqual(await response.json(), {"ok": True})
        self.assertEqual(len(self.bot.messages), 1)
        chat_id, message, parse_mode = self.bot.messages[0]
        self.assertEqual(chat_id, "-1001234567890")
        self.assertEqual(parse_mode, ParseMode.HTML)
        self.assertIsNotNone(self.bot.leads_at_send)
        self.assertEqual(self.bot.leads_at_send, self.leads_path.read_text(encoding="utf-8"))

        with self.leads_path.open(encoding="utf-8", newline="") as leads_file:
            rows = list(csv.DictReader(leads_file))
        self.assertEqual(len(rows), 1)
        self.assertEqual(
            {key: rows[0][key] for key in ("name", "contact", "service", "details")},
            VALID_ORDER,
        )
        received_at = datetime.fromisoformat(rows[0]["received_at_msk"])
        self.assertEqual(received_at.utcoffset(), timedelta(hours=3))
        self.assertEqual(stat.S_IMODE(self.leads_path.stat().st_mode), 0o600)
        self.assertIn("🔥 <b>Новая заявка vid64.ru</b>", message)
        self.assertIn(
            '<a href="tel:+79001234567">+7 (900) 123-45-67</a>',
            message,
        )
        self.assertIn("<b>Имя:</b> Алина", message)
        self.assertIn("<b>Направление:</b> Изделия на заказ", message)
        self.assertIn("<b>Комментарий:</b> Нержавейка + гибка", message)
        self.assertRegex(message, r"\d{2}\.\d{2}\.\d{4} \d{2}:\d{2} МСК")

    async def test_user_supplied_html_is_escaped_in_telegram_message(self):
        order = VALID_ORDER | {
            "name": 'Алина <a href="https://evil.example">клик</a>',
            "details": "Лист & <script>alert(1)</script>",
        }

        response = await self.client.post("/api/order", json=order)

        self.assertEqual(response.status, 200)
        message = self.bot.messages[0][1]
        self.assertIn(
            "Алина &lt;a href=&quot;https://evil.example&quot;&gt;клик&lt;/a&gt;",
            message,
        )
        self.assertIn(
            "Лист &amp; &lt;script&gt;alert(1)&lt;/script&gt;",
            message,
        )
        self.assertNotIn("<script>", message)

    async def test_missing_blank_non_string_and_overlong_fields_are_rejected(self):
        invalid_orders = []
        missing_name = VALID_ORDER.copy()
        del missing_name["name"]
        invalid_orders.append(missing_name)

        for field, value in (
            ("name", "  "),
            ("contact", 123),
            ("service", "x" * 101),
            ("details", "x" * 3001),
        ):
            invalid_order = VALID_ORDER.copy()
            invalid_order[field] = value
            invalid_orders.append(invalid_order)

        for invalid_order in invalid_orders:
            with self.subTest(order=invalid_order):
                response = await self.client.post("/api/order", json=invalid_order)
                self.assertEqual(response.status, 400)
                self.assertEqual(await response.json(), {"error": "Invalid order"})

        self.assertEqual(self.bot.messages, [])

    async def test_noncanonical_phone_numbers_are_rejected_before_persistence(self):
        for contact in (
            "+7 900 123-45-67",
            "+7 (900) 123-45-6",
            "+7 (900) 123-45-678",
        ):
            with self.subTest(contact=contact):
                response = await self.client.post(
                    "/api/order",
                    json=VALID_ORDER | {"contact": contact},
                )
                self.assertEqual(response.status, 400)
                self.assertEqual(await response.json(), {"error": "Invalid order"})

        self.assertFalse(self.leads_path.exists())
        self.assertEqual(self.bot.messages, [])

    async def test_malformed_and_non_json_requests_are_rejected(self):
        malformed = await self.client.post(
            "/api/order",
            data="{broken",
            headers={"Content-Type": "application/json"},
        )
        non_json = await self.client.post(
            "/api/order",
            data=json.dumps(VALID_ORDER),
            headers={"Content-Type": "text/plain"},
        )

        self.assertEqual(malformed.status, 400)
        self.assertEqual(non_json.status, 400)
        self.assertEqual(self.bot.messages, [])

    async def test_oversized_request_body_is_rejected(self):
        oversized_order = VALID_ORDER | {"details": "x" * 17_000}
        response = await self.client.post("/api/order", json=oversized_order)

        self.assertEqual(response.status, 413)
        self.assertEqual(self.bot.messages, [])

    async def test_rate_limits_valid_orders_from_the_same_client(self):
        responses = [
            await self.client.post(
                "/api/order",
                json=VALID_ORDER,
                headers={"X-Real-IP": "198.51.100.10"},
            )
            for _ in range(6)
        ]
        other_client = await self.client.post(
            "/api/order",
            json=VALID_ORDER,
            headers={"X-Real-IP": "198.51.100.11"},
        )

        self.assertEqual([response.status for response in responses], [200] * 5 + [429])
        self.assertEqual(
            await responses[-1].json(),
            {"error": "Too many requests"},
        )
        self.assertEqual(other_client.status, 200)
        self.assertEqual(len(self.bot.messages), 6)
        with self.leads_path.open(encoding="utf-8", newline="") as leads_file:
            self.assertEqual(len(list(csv.DictReader(leads_file))), 6)

    async def test_missing_admin_chat_keeps_lead_and_returns_accepted_notice(self):
        bot = FakeBot(leads_path=self.leads_path)
        client = TestClient(TestServer(create_order_app(bot, "")))
        await client.start_server()
        try:
            response = await client.post("/api/order", json=VALID_ORDER)
            self.assertEqual(response.status, 202)
            self.assertEqual(
                await response.json(),
                {
                    "ok": True,
                    "telegram_delivered": False,
                    "message": "Заявка сохранена, но уведомление менеджеру задерживается.",
                },
            )
            self.assertEqual(bot.messages, [])
            with self.leads_path.open(encoding="utf-8", newline="") as leads_file:
                self.assertEqual(len(list(csv.DictReader(leads_file))), 1)
        finally:
            await client.close()

    async def test_telegram_failure_keeps_lead_and_returns_accepted_notice(self):
        failing_bot = FakeBot(
            TelegramError("private upstream details"),
            leads_path=self.leads_path,
        )
        client = TestClient(TestServer(create_order_app(failing_bot, "-1001234567890")))
        await client.start_server()
        try:
            response = await client.post("/api/order", json=VALID_ORDER)
            response_body = await response.json()

            self.assertEqual(response.status, 202)
            self.assertEqual(
                response_body,
                {
                    "ok": True,
                    "telegram_delivered": False,
                    "message": "Заявка сохранена, но уведомление менеджеру задерживается.",
                },
            )
            self.assertNotIn("private upstream details", json.dumps(response_body))
            self.assertEqual(failing_bot.messages, [])
            with self.leads_path.open(encoding="utf-8", newline="") as leads_file:
                self.assertEqual(len(list(csv.DictReader(leads_file))), 1)
        finally:
            await client.close()

    async def test_persistence_failure_does_not_attempt_telegram_delivery(self):
        with patch(
            "bot.bot._append_lead",
            side_effect=OSError("disk unavailable"),
            create=True,
        ):
            response = await self.client.post("/api/order", json=VALID_ORDER)

        self.assertEqual(response.status, 500)
        self.assertEqual(await response.json(), {"error": "Could not save order"})
        self.assertEqual(self.bot.messages, [])

    async def test_csv_quotes_newline_and_comma_fields_as_one_order(self):
        order = VALID_ORDER | {"details": 'Pipe, "custom"\nsecond line'}

        response = await self.client.post("/api/order", json=order)

        self.assertEqual(response.status, 200)
        with self.leads_path.open(encoding="utf-8", newline="") as leads_file:
            rows = list(csv.DictReader(leads_file))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["details"], order["details"])

if __name__ == "__main__":
    unittest.main()
