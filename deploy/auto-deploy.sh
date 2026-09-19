#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/saqr"
LOG_FILE="/var/log/saqr-deploy.log"
LOCK_FILE="/var/lock/saqr-deploy.lock"

exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

cd "$APP_DIR"

# Keep the deploy script executable across pulls/resets.
chmod +x "$APP_DIR/deploy/auto-deploy.sh" 2>/dev/null || true

git fetch origin main --quiet
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"

DIST_MARKER="$APP_DIR/dist/.saqr-deployed-commit"
DEPLOYED="$(cat "$DIST_MARKER" 2>/dev/null || true)"

# Deploy whenever the working tree is behind OR the built frontend does not
# correspond to the current commit. This makes failed builds retryable.
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "[$(date -Is)] Pulling $REMOTE" >> "$LOG_FILE"
  git pull --ff-only origin main
  LOCAL="$(git rev-parse HEAD)"
fi

[ "$DEPLOYED" = "$LOCAL" ] && exit 0

echo "[$(date -Is)] Building $LOCAL" >> "$LOG_FILE"

npm ci
npm run build

mkdir -p "$APP_DIR/dist"
printf '%s\n' "$LOCAL" > "$DIST_MARKER"

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

echo "[$(date -Is)] Deploy complete $LOCAL" >> "$LOG_FILE"
