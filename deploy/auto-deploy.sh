#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/saqr"
LOG_FILE="/var/log/saqr-deploy.log"
LOCK_FILE="/var/lock/saqr-deploy.lock"

exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

cd "$APP_DIR"

git fetch origin main --quiet
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"

[ "$LOCAL" = "$REMOTE" ] && exit 0

echo "[$(date -Is)] Deploying $REMOTE" >> "$LOG_FILE"

git pull --ff-only origin main

npm ci
npm run build

cd backend
export HOME=/root
export COMPOSER_HOME=/root/.composer
export COMPOSER_ALLOW_SUPERUSER=1

composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear

chown -R www-data:www-data storage bootstrap/cache database
chmod -R 775 storage bootstrap/cache database
[ -f database/database.sqlite ] && chmod 664 database/database.sqlite

echo "[$(date -Is)] Deploy complete $REMOTE" >> "$LOG_FILE"
