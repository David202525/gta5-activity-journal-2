#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  GTA5 Activity Journal — автоустановка на Debian 12
#  Использование:  bash install.sh
# ═══════════════════════════════════════════════════════════════
set -e

# ─── Цвета ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }

echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   GTA5 ACTIVITY JOURNAL  ·  INSTALLER   ║"
echo "  ║   Debian 12  ·  Node 20  ·  Nginx       ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Проверка root ────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  error "Запустите скрипт от root: sudo bash install.sh"
fi

# ─── Параметры (можно задать через ENV) ──────────────────────
APP_DIR="${APP_DIR:-/var/www/gta5journal}"
DOMAIN="${DOMAIN:-}"
DB_NAME="${DB_NAME:-gta5journal}"
DB_USER="${DB_USER:-gta5user}"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"
NODE_VERSION="20"

info "Директория приложения: $APP_DIR"
info "PostgreSQL: $DB_NAME / $DB_USER"

# ─── 1. Обновление системы ────────────────────────────────────
info "Обновление пакетов..."
apt-get update -qq
apt-get install -y -qq curl git nginx postgresql openssl ufw ca-certificates gnupg

# ─── 2. Node.js 20 ───────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -v)" != v${NODE_VERSION}* ]]; then
  info "Установка Node.js $NODE_VERSION..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y -qq nodejs
  success "Node.js $(node -v) установлен"
else
  success "Node.js $(node -v) уже установлен"
fi

# bun (быстрый пакетный менеджер)
if ! command -v bun &>/dev/null; then
  info "Установка bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
  success "bun установлен"
fi

# ─── 3. PostgreSQL — создание БД ─────────────────────────────
info "Настройка PostgreSQL..."
PG_VERSION=$(psql --version | awk '{print $3}' | cut -d. -f1)

systemctl enable postgresql --now

su -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'\" | grep -q 1 || \
  psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASS'\"" postgres

su -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='$DB_NAME'\" | grep -q 1 || \
  psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER\"" postgres

# Применяем схему БД
info "Создание таблиц..."
su -c "psql -d $DB_NAME" postgres <<'SQL'
-- Пользователи
CREATE TABLE IF NOT EXISTS users (
    id               SERIAL PRIMARY KEY,
    username         VARCHAR(64)  NOT NULL UNIQUE,
    password_hash    VARCHAR(256) NOT NULL,
    role             VARCHAR(32)  NOT NULL DEFAULT 'user',
    title            VARCHAR(64)  NOT NULL DEFAULT 'Новобранец',
    rank             VARCHAR(16)  NOT NULL DEFAULT '1',
    level            INTEGER      NOT NULL DEFAULT 1,
    xp               INTEGER      NOT NULL DEFAULT 0,
    xp_max           INTEGER      NOT NULL DEFAULT 1000,
    reputation       INTEGER      NOT NULL DEFAULT 0,
    online_today     INTEGER      NOT NULL DEFAULT 0,
    online_week      INTEGER      NOT NULL DEFAULT 0,
    warnings         INTEGER      NOT NULL DEFAULT 0,
    status           VARCHAR(16)  NOT NULL DEFAULT 'offline',
    last_seen        TIMESTAMP    DEFAULT NOW(),
    created_at       TIMESTAMP    DEFAULT NOW(),
    created_by       VARCHAR(64),
    last_online_date DATE,
    session_start    TIMESTAMP,
    week_activity    INTEGER[]    DEFAULT ARRAY[0,0,0,0,0,0,0],
    penalties        JSONB        NOT NULL DEFAULT '[]',
    curator_type     VARCHAR(32)
);

-- Организации
CREATE TABLE IF NOT EXISTS organizations (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(64)  NOT NULL,
    tag          VARCHAR(16)  NOT NULL,
    description  TEXT         NOT NULL DEFAULT '',
    leader_id    INTEGER,
    leader_name  VARCHAR(64)  NOT NULL DEFAULT 'none',
    member_ids   INTEGER[]    NOT NULL DEFAULT '{}',
    org_ranks    JSONB        NOT NULL DEFAULT '[]',
    member_ranks JSONB        NOT NULL DEFAULT '{}',
    created_at   DATE         NOT NULL DEFAULT CURRENT_DATE
);

-- Уведомления
CREATE TABLE IF NOT EXISTS notifications (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    text       TEXT NOT NULL,
    type       VARCHAR(16) NOT NULL DEFAULT 'info',
    timestamp  TIMESTAMP NOT NULL DEFAULT NOW(),
    read       BOOLEAN NOT NULL DEFAULT FALSE
);

-- Приказы
CREATE TABLE IF NOT EXISTS orders (
    id               SERIAL PRIMARY KEY,
    number           VARCHAR(16)  NOT NULL,
    target_name      VARCHAR(64)  NOT NULL,
    comment          TEXT         NOT NULL DEFAULT '',
    issued_by        VARCHAR(64)  NOT NULL,
    issued_by_role   VARCHAR(32)  NOT NULL DEFAULT 'leader',
    issued_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    valid            BOOLEAN      NOT NULL DEFAULT TRUE,
    validation_error TEXT
);

-- Таблицы (Excel-стиль)
CREATE TABLE IF NOT EXISTS table_sheets (
    id         SERIAL PRIMARY KEY,
    scope      VARCHAR(16) NOT NULL,
    org_id     INTEGER,
    name       VARCHAR(64) NOT NULL DEFAULT 'Таблица',
    columns    JSONB NOT NULL DEFAULT '[]',
    rows       JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
SQL

success "База данных '$DB_NAME' создана, таблицы готовы"

# Показываем пароль БД
echo ""
warn "Сохраните данные подключения к БД:"
echo -e "  DB_NAME: ${BOLD}$DB_NAME${NC}"
echo -e "  DB_USER: ${BOLD}$DB_USER${NC}"
echo -e "  DB_PASS: ${BOLD}$DB_PASS${NC}"
echo -e "  DATABASE_URL: ${BOLD}postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME${NC}"
echo ""

# ─── 4. Клонирование / обновление кода ───────────────────────
if [ -d "$APP_DIR/.git" ]; then
  info "Обновление репозитория..."
  git -C "$APP_DIR" pull --ff-only
else
  info "Укажите путь до исходников (или нажмите Enter если уже скопированы в $APP_DIR):"
  read -r REPO_URL
  if [ -n "$REPO_URL" ]; then
    git clone "$REPO_URL" "$APP_DIR"
  else
    mkdir -p "$APP_DIR"
    warn "Скопируйте исходники в $APP_DIR и перезапустите скрипт"
  fi
fi

# ─── 5. Сборка фронтенда ─────────────────────────────────────
if [ -f "$APP_DIR/package.json" ]; then
  info "Установка зависимостей и сборка..."
  cd "$APP_DIR"
  if command -v bun &>/dev/null; then
    bun install --frozen-lockfile 2>/dev/null || bun install
    bun run build
  else
    npm ci --silent
    npm run build
  fi
  success "Фронтенд собран в $APP_DIR/dist"
fi

# ─── 6. Nginx ─────────────────────────────────────────────────
info "Настройка Nginx..."

SERVER_NAME=${DOMAIN:-_}

cat > /etc/nginx/sites-available/gta5journal <<NGINX
server {
    listen 80;
    server_name $SERVER_NAME;

    root $APP_DIR/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # Кэш статики
    location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/gta5journal /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl enable nginx --now && systemctl reload nginx
success "Nginx настроен"

# ─── 7. SSL (если указан домен) ──────────────────────────────
if [ -n "$DOMAIN" ]; then
  info "Установка Certbot для SSL..."
  apt-get install -y -qq certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || \
    warn "SSL не настроен автоматически. Запустите: certbot --nginx -d $DOMAIN"
fi

# ─── 8. Firewall ──────────────────────────────────────────────
info "Настройка UFW..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
success "Firewall активирован (SSH + HTTP/HTTPS)"

# ─── Финал ────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Установка завершена успешно!             ${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  Сайт:   ${BOLD}http://${DOMAIN:-<ваш IP>}${NC}"
echo -e "  Корень: ${BOLD}$APP_DIR/dist${NC}"
echo -e "  Nginx:  ${BOLD}systemctl status nginx${NC}"
echo ""
echo -e "${YELLOW}Не забудьте:${NC}"
echo "  1. Добавить DATABASE_URL в настройки облачных функций"
echo "  2. Создать первого куратора через бэкенд (action: add_user, role: curator)"
if [ -n "$DOMAIN" ]; then
echo "  3. SSL обновляется автоматически через systemctl cron"
fi
echo ""
