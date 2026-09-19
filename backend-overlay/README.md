# Laravel backend overlay
Create Laravel 12 in `backend`, run `php artisan install:api`, then copy this overlay over it. Add `role` nullable string to users table or expose student as default. Add to `config/services.php`:
`'saqr_labs' => ['url' => env('LAB_API_BASE_URL'), 'key' => env('LAB_API_KEY')],`
Use MySQL/MariaDB for the JSON queries in EntityController.
