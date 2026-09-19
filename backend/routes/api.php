<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EntityController;
use App\Http\Controllers\LabController;

Route::get('/public-settings', fn () => [
    'id' => 'saqr',
    'public_settings' => ['name' => 'Saqr']
]);

// Authentication
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

// Google OAuth
Route::get('/auth/oauth/google', [AuthController::class, 'googleRedirect']);
Route::get('/auth/oauth/google/callback', [AuthController::class, 'googleCallback']);

// Public certificate verification
Route::post('/functions/verifyCertificate', [LabController::class, 'verifyCertificate']);

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/me', [AuthController::class, 'update']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Entities
    Route::get('/entities/{entity}', [EntityController::class, 'index']);
    Route::post('/entities/{entity}/filter', [EntityController::class, 'filter']);
    Route::post('/entities/{entity}/bulk', [EntityController::class, 'bulk']);
    Route::post('/entities/{entity}/delete-many', [EntityController::class, 'deleteMany']);
    Route::get('/entities/{entity}/{id}', [EntityController::class, 'show']);
    Route::post('/entities/{entity}', [EntityController::class, 'store']);
    Route::put('/entities/{entity}/{id}', [EntityController::class, 'update']);
    Route::delete('/entities/{entity}/{id}', [EntityController::class, 'destroy']);

    // Saqr Labs
    Route::post('/functions/{name}', [LabController::class, 'invoke']);
});
