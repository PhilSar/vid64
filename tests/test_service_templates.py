import plistlib
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class ServiceTemplateTests(unittest.TestCase):
    def test_launch_agent_template_launches_project_bot_without_credentials(self):
        plist_path = ROOT / "bot.plist"
        self.assertTrue(plist_path.is_file(), "bot.plist template must exist")
        with plist_path.open("rb") as plist_file:
            config = plistlib.load(plist_file)

        self.assertEqual(config["Label"], "ru.vid64.bot")
        self.assertTrue(config["RunAtLoad"])
        self.assertTrue(config["KeepAlive"])
        self.assertEqual(
            config["WorkingDirectory"],
            "/Users/REPLACE_WITH_USER/REPLACE_WITH_PROJECT_PATH",
        )
        self.assertEqual(
            config["ProgramArguments"],
            [
                "/Users/REPLACE_WITH_USER/REPLACE_WITH_PROJECT_PATH/.venv/bin/python",
                "/Users/REPLACE_WITH_USER/REPLACE_WITH_PROJECT_PATH/bot/bot.py",
            ],
        )
        self.assertEqual(
            config["StandardOutPath"],
            "/Users/REPLACE_WITH_USER/Library/Logs/vid-bot.log",
        )
        self.assertEqual(
            config["StandardErrorPath"],
            "/Users/REPLACE_WITH_USER/Library/Logs/vid-bot-error.log",
        )
        self.assertNotIn("EnvironmentVariables", config)
        plist_text = plist_path.read_text(encoding="utf-8")
        self.assertNotIn("TELEGRAM_BOT_TOKEN", plist_text)
        self.assertNotIn("TELEGRAM_ADMIN_CHAT_ID", plist_text)

    def test_systemd_template_runs_as_configured_user_and_restarts(self):
        service_path = ROOT / "bot.service"
        self.assertTrue(service_path.is_file(), "bot.service template must exist")
        service = service_path.read_text(encoding="utf-8")

        for directive in (
            "User=REPLACE_WITH_SERVICE_USER",
            "WorkingDirectory=/opt/REPLACE_WITH_PROJECT_PATH",
            "EnvironmentFile=/opt/REPLACE_WITH_PROJECT_PATH/.env",
            "ExecStart=/opt/REPLACE_WITH_PROJECT_PATH/.venv/bin/python /opt/REPLACE_WITH_PROJECT_PATH/bot/bot.py",
            "Restart=on-failure",
        ):
            with self.subTest(directive=directive):
                self.assertIn(directive, service)

        self.assertNotIn("TELEGRAM_BOT_TOKEN=", service)
        self.assertNotIn("TELEGRAM_ADMIN_CHAT_ID=", service)


if __name__ == "__main__":
    unittest.main()
