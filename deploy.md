# Развёртывание vid64.ru на Ubuntu 24.04

Инструкция устанавливает сайт и Telegram-бота на новый VPS. Пример использует `/opt/vid64`, пользователя службы `vidbot` и домен `vid64.ru`. Замените `SSH_USER` и `VPS_IP` своими значениями. Репозиторий не имеет Git remote, поэтому исходники передаются с компьютера вручную.

## 1. DNS, доступ и пакеты

Создайте DNS-запись `A` для `vid64.ru` на IPv4-адрес VPS. Добавляйте `AAAA` только если на сервере действительно настроен IPv6. В панели хостинга разрешите входящие TCP-порты `22`, `80` и `443`; порт `8080` наружу не открывайте.

Подключитесь по SSH и установите системные пакеты:

```sh
sudo apt update
sudo apt install -y nginx python3 python3-venv python3-pip nodejs npm rsync certbot python3-certbot-nginx ufw
sudo systemctl enable --now nginx
node --version
```

Для сборки нужен Node.js 18 или новее. Настройте локальный firewall, предварительно сохранив доступ по SSH:

```sh
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 2. Передача исходников на VPS

Выполните на своём компьютере из корня проекта. Команда не передаёт зависимости, build-артефакты, секреты и локальные файлы помощников:

```sh
rsync -av \
  --exclude='.git/' \
  --exclude='.vscode/' \
  --exclude='.superpowers/' \
  --exclude='.worktrees/' \
  --exclude='node_modules/' \
  --exclude='.venv/' \
  --exclude='dist/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='leads.csv' \
  --exclude='__pycache__/' \
  ./ SSH_USER@VPS_IP:/tmp/vid64/
```

На VPS создайте пользователя службы и установите файлы проекта:

```sh
sudo install -d -o root -g root -m 0755 /opt/vid64
sudo adduser --system --group --home /opt/vid64 --no-create-home --shell /usr/sbin/nologin vidbot
sudo rsync -a /tmp/vid64/ /opt/vid64/
sudo chown -R root:root /opt/vid64
sudo chmod 0755 /opt/vid64
```

Корень проекта и собранная статика доступны Nginx на чтение; бот работает от `vidbot`. Если обновляете уже установленный сайт, не перезаписывайте конфигурацию Nginx из репозитория после настройки Certbot: Certbot добавит в активный файл HTTPS-блоки и перенаправление.

## 3. Python, секреты и файл заявок

Создайте окружение и установите зависимости бота:

```sh
sudo python3 -m venv /opt/vid64/.venv
sudo /opt/vid64/.venv/bin/python -m pip install --upgrade pip
sudo /opt/vid64/.venv/bin/python -m pip install -r /opt/vid64/bot/requirements.txt
```

Создайте `.env`, доступный только root и группе бота, и внесите значения, полученные у BotFather и командой `/id`:

```sh
sudo install -o root -g vidbot -m 0640 /dev/null /opt/vid64/.env
sudoedit /opt/vid64/.env
```

В `.env` должны быть строки `TELEGRAM_BOT_TOKEN=...` и `TELEGRAM_ADMIN_CHAT_ID=...`. Не передавайте токен в командной строке и не публикуйте `.env`.

Создайте файл для резервного сохранения заявок. Он содержит персональные данные:

```sh
sudo install -o vidbot -g vidbot -m 0600 /dev/null /opt/vid64/leads.csv
```

Храните резервные копии `leads.csv` с такими же ограничениями доступа. Одновременно должен работать только один экземпляр бота, использующий этот CSV-файл.

## 4. Сборка сайта

```sh
sudo npm ci --prefix /opt/vid64
sudo npm --prefix /opt/vid64 run build
test -s /opt/vid64/dist/index.html
find /opt/vid64/dist -maxdepth 2 -type f -print
```

Сборка создаёт `dist/`; Nginx будет раздавать эту папку. API продолжает работать только локально на `127.0.0.1:8080`.

## 5. Запуск systemd-службы

Установите unit из проекта и включите автозапуск:

```sh
sudo install -o root -g root -m 0644 /opt/vid64/vid-bot.service /etc/systemd/system/vid-bot.service
sudo systemctl daemon-reload
sudo systemctl enable --now vid-bot.service
sudo systemctl status vid-bot.service
sudo journalctl -u vid-bot.service -n 50 --no-pager
```

В `vid-bot.service` настроен `Restart=always`. Для остановки и отключения автозапуска:

```sh
sudo systemctl disable --now vid-bot.service
```

## 6. Nginx и HTTPS

Установите HTTP-конфигурацию сайта, проверьте её и перечитайте Nginx:

```sh
sudo install -o root -g root -m 0644 /opt/vid64/nginx.conf /etc/nginx/sites-available/vid64.ru
sudo ln -sfn /etc/nginx/sites-available/vid64.ru /etc/nginx/sites-enabled/vid64.ru
sudo nginx -t
sudo systemctl reload nginx
```

После того как DNS `vid64.ru` указывает на этот VPS и HTTP-порт доступен, получите сертификат. Certbot добавит HTTPS и перенаправление HTTP на HTTPS:

```sh
sudo certbot --nginx --redirect -d vid64.ru
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Проверьте `https://vid64.ru`, логи сайта (`/var/log/nginx/access.log`, `/var/log/nginx/error.log`) и логи бота:

```sh
sudo journalctl -u vid-bot.service -f
```

При обновлении приложения передайте новые исходники и повторите сборку из шага 4, затем выполните `sudo systemctl restart vid-bot.service`. Перезагрузите Nginx только если меняли его конфигурацию. Не перезаписывайте TLS-конфигурацию, изменённую Certbot, исходным `nginx.conf`.
