#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
APP=/var/www/saqr
apt-get update
apt-get install -y nginx mariadb-server php php-cli php-fpm php-mysql php-mbstring php-xml php-curl php-zip php-bcmath unzip git curl composer nodejs npm
cd "$APP"
if [ ! -f backend/artisan ]; then
  rm -rf backend
  composer create-project laravel/laravel backend --no-interaction
  cd backend
  php artisan install:api --no-interaction
  cd "$APP"
fi
cp -a backend-overlay/. backend/
cd backend
# Add Saqr Labs config once.
  php -r '$p="config/services.php"; $s=file_get_contents($p); if(strpos($s,"saqr_labs")===false){ $insert="    'saqr_labs' => ['url' => env('LAB_API_BASE_URL'), 'key' => env('LAB_API_KEY')],\n"; $s=preg_replace("/\];\s*$/", $insert."];\n", $s); file_put_contents($p,$s); }'
# Add role column migration.
cat > database/migrations/2026_09_19_000002_add_role_to_users.php <<'PHP'
<?php
use Illuminate\Database\Migrations\Migration; use Illuminate\Database\Schema\Blueprint; use Illuminate\Support\Facades\Schema;
return new class extends Migration { public function up():void{Schema::table('users',fn(Blueprint $t)=>$t->string('role')->default('student')->after('password'));} public function down():void{Schema::table('users',fn(Blueprint $t)=>$t->dropColumn('role'));} };
PHP
if [ ! -f .env ]; then cp .env.example .env; fi
php artisan key:generate --force
cd "$APP"
npm install
npm run build
chown -R www-data:www-data "$APP/backend/storage" "$APP/backend/bootstrap/cache"
chmod -R ug+rwX "$APP/backend/storage" "$APP/backend/bootstrap/cache"
echo
printf '%s\n' 'Saqr code prepared. Database credentials and LAB_API_* must now be set in backend/.env before migrations.'
