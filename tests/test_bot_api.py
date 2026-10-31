import json
import unittest

from aiohttp.test_utils import TestClient, TestServer
from telegram.error import TelegramError

from bot.bot import create_order_app


VALID_ORDER = {
    "name": "Алина",
    "contact": "+7 900 123-45-67",
    "service": "Изделия на заказ",
    "details": "Нержавейка + гибка",
}

EXPECTED_MESSAGE = "\n".join(
    (
        "Новая заявка с сайта ООО «ВиД»",
        "Имя: Алина",
        "Контакт: +7 900 123-45-67",
        "Направление: Изделия на заказ",
        "О заказе: Нержавейка + гибка",
    )
)


class FakeBot:
    def __init__(self, error=None):
        self.messages = []
        self.error = error

    async def send_message(self, *, chat_id, text):
        if self.error:
            raise self.error
        self.messages.append((chat_id, text))


class OrderApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.bot = FakeBot()
        self.client = TestClient(
            TestServer(create_order_app(self.bot, "-1001234567890"))
        )
        await self.client.start_server()

    async def asyncTearDown(self):
        await self.client.close()

    async def test_valid_order_is_sent_and_acknowledged(self):
        response = await self.client.post("/api/order", json=VALID_ORDER)

        self.assertEqual(response.status, 200)
        self.assertEqual(await response.json(), {"ok": True})
        self.assertEqual(
            self.bot.messages,
            [("-1001234567890", EXPECTED_MESSAGE)],
        )

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

    async def test_missing_admin_chat_returns_service_error(self):
        client = TestClient(TestServer(create_order_app(self.bot, "")))
        await client.start_server()
        try:
            response = await client.post("/api/order", json=VALID_ORDER)
            self.assertEqual(response.status, 503)
            self.assertEqual(await response.json(), {"error": "Order service unavailable"})
            self.assertEqual(self.bot.messages, [])
        finally:
            await client.close()

    async def test_telegram_failure_returns_generic_error(self):
        failing_bot = FakeBot(TelegramError("private upstream details"))
        client = TestClient(TestServer(create_order_app(failing_bot, "-1001234567890")))
        await client.start_server()
        try:
            response = await client.post("/api/order", json=VALID_ORDER)
            response_body = await response.text()

            self.assertEqual(response.status, 502)
            self.assertEqual(
                json.loads(response_body),
                {"error": "Could not deliver order"},
            )
            self.assertNotIn("private upstream details", response_body)
            self.assertEqual(failing_bot.messages, [])
        finally:
            await client.close()


if __name__ == "__main__":
    unittest.main()
