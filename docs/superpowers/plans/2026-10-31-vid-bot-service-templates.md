# ViD Bot Service Templates Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide safe, documented Linux systemd and macOS LaunchAgent templates to run the existing Telegram bot and its order API at startup.

**Architecture:** Both templates launch the existing project virtualenv's Python executable from the project root. The application loads the root `.env`; templates contain replaceable project/user paths only, no credentials. Documentation describes installation, lifecycle commands, logs, and the single-process CSV constraint.

**Tech Stack:** systemd unit, macOS LaunchAgent plist, Python `plistlib` and `unittest`.

**Spec:** `docs/superpowers/specs/2026-10-31-vid-bot-reliability-design.md`

## Global Constraints

- Create root files `bot.service` and `bot.plist`.
- Use placeholders for project and user paths; do not embed machine-specific details or credentials.
- Invoke the existing `<project>/.venv/bin/python <project>/bot/bot.py` with the project root as working directory.
- Rely on `bot.py` loading the root `.env`; do not put secrets in either template.
- Document that only one bot process can own a given `leads.csv`.
- Document HTTP 202 as “saved, manager notification delayed,” not as Telegram delivery confirmation.

## Review Focus

- Unreplaced paths/users must be obvious and documented before installation. Test placeholders in both templates.
- The plist must be syntactically valid and configured to launch at login and restart after exit. Parse and assert its keys.
- Neither template may include a bot token or admin chat ID. Assert no secret values or credential keys appear.
- systemd must run as a configured user from the project root with `.env` available and restart on failure. Assert the required directives.
- Deployment instructions must provide a safe stop/disable path and log access. Review README command coverage.

---

### Task 1: Add daemon templates and deployment instructions

**Files:**
- Create: `bot.service`
- Create: `bot.plist`
- Create: `tests/test_service_templates.py`
- Modify: `README.md`

**Interfaces:**
- `bot.service` is a replace-before-install systemd unit with `User`, `WorkingDirectory`, `EnvironmentFile`, `ExecStart`, and `Restart=on-failure`.
- `bot.plist` is a replace-before-install per-user LaunchAgent with a valid label, project `WorkingDirectory`, `ProgramArguments` for the project virtualenv and `bot/bot.py`, `RunAtLoad`, `KeepAlive`, root `.env` loading through the application's `load_dotenv`, and absolute stdout/stderr paths under `/Users/REPLACE_WITH_USER/Library/Logs`.
- README documents placeholder replacement, Linux install/enable/disable/status/log commands, macOS install/bootstrap/bootout/log commands, `.env` handling, HTTP 202 semantics, and the single-process/single-CSV constraint.

- [ ] **Step 1: Write failing template tests**

Create Python `unittest` cases that parse `bot.plist` using `plistlib`, verify `RunAtLoad`, `KeepAlive`, working directory, executable and script arguments, and assert there are no credential fields or token-like values. Assert the service unit includes required directives and explicit replaceable project/user placeholders.

- [ ] **Step 2: Run template tests and verify they fail**

Run: `.venv/bin/python -m unittest tests.test_service_templates -v`

Expected: assertions fail because `bot.service` and `bot.plist` do not yet exist.

- [ ] **Step 3: Create templates and document installation**

Add templates with replaceable paths and no secrets. Update the bot documentation with platform-specific setup, start/stop, restart-at-login, and log instructions. State that multiple instances must not share a `leads.csv`, and distinguish HTTP 202 from a delivered Telegram message.

- [ ] **Step 4: Run template tests**

Run: `.venv/bin/python -m unittest tests.test_service_templates -v`

Expected: plist parsing and unit/plist structural assertions pass.

- [ ] **Step 5: Run final regression checks**

Run: `.venv/bin/python -m unittest discover -s tests -v && npm test && npm run build && git diff --check`

Expected: Python and Node tests pass, Vite builds successfully, and `git diff --check` reports no errors.

- [ ] **Step 6: Commit this plan's implementation**

```bash
git add bot.service bot.plist tests/test_service_templates.py README.md
git commit -m "docs: add bot daemon service templates"
```
