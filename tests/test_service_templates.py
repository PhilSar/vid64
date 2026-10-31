import plistlib
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class ServiceTemplateTests(unittest.TestCase):
    def test_nginx_site_serves_the_app_and_proxies_api_without_stale_shell_cache(self):
        nginx_path = ROOT / "nginx.conf"
        self.assertTrue(nginx_path.is_file(), "nginx.conf must exist")
        nginx = nginx_path.read_text(encoding="utf-8")

        self.assertIn("server_name vid64.ru;", nginx)
        self.assertIn("root /opt/vid64/dist;", nginx)
        self.assertIn("try_files $uri $uri/ /index.html;", nginx)
        self.assertIn("gzip on;", nginx)

        assets = nginx.split("location ^~ /assets/", 1)[1].split("}", 1)[0]
        self.assertIn("immutable", assets)

        index_html = nginx.split("location = /index.html", 1)[1].split("}", 1)[0]
        self.assertRegex(index_html, r"no-cache|no-store")
        self.assertNotIn("immutable", index_html)

        api = nginx.split("location /api/", 1)[1].split("}", 1)[0]
        self.assertIn("proxy_pass http://127.0.0.1:8080;", api)
        self.assertIn("proxy_set_header X-Real-IP $remote_addr;", api)
        self.assertIn(
            "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
            api,
        )
        self.assertIn("proxy_set_header X-Forwarded-Proto $scheme;", api)

    def test_production_systemd_unit_runs_the_bot_with_always_restart(self):
        service_path = ROOT / "vid-bot.service"
        self.assertTrue(service_path.is_file(), "vid-bot.service must exist")
        service = service_path.read_text(encoding="utf-8")

        for directive in (
            "User=vidbot",
            "Group=vidbot",
            "WorkingDirectory=/opt/vid64",
            "EnvironmentFile=/opt/vid64/.env",
            "ExecStart=/opt/vid64/.venv/bin/python /opt/vid64/bot/bot.py",
            "Restart=always",
            "RestartSec=5s",
        ):
            with self.subTest(directive=directive):
                self.assertIn(directive, service)

    def test_readme_covers_lead_file_access_and_persistent_service_disable(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")

        self.assertIn(
            "sudo setfacl -m u:REPLACE_WITH_SERVICE_USER:rwx "
            "/opt/REPLACE_WITH_PROJECT_PATH",
            readme,
        )
        self.assertIn(
            'launchctl disable "gui/$(id -u)/ru.vid64.bot"',
            readme,
        )
        self.assertIn(
            'launchctl enable "gui/$(id -u)/ru.vid64.bot"',
            readme,
        )

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
