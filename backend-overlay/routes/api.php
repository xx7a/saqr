<?php
use Illuminate\Support\Facades\Route; use App\Http\Controllers\AuthController; use App\Http\Controllers\EntityController; use App\Http\Controllers\LabController;
Route::get('/public-settings',fn()=>['id'=>'saqr','public_settings'=>['name'=>'Saqr']]);
Route::post('/auth/register',[AuthController::class,'register']); Route::post('/auth/login',[AuthController::class,'login']);
Route::middleware('auth:sanctum')->group(function(){
 Route::get('/auth/me',[AuthController::class,'me']); Route::put('/auth/me',[AuthController::class,'update']); Route::post('/auth/logout',[AuthController::class,'logout']);
 Route::get('/entities/{entity}',[EntityController::class,'index']); Route::post('/entities/{entity}/filter',[EntityController::class,'filter']); Route::post('/entities/{entity}/bulk',[EntityController::class,'bulk']); Route::post('/entities/{entity}/delete-many',[EntityController::class,'deleteMany']); Route::get('/entities/{entity}/{id}',[EntityController::class,'show']); Route::post('/entities/{entity}',[EntityController::class,'store']); Route::put('/entities/{entity}/{id}',[EntityController::class,'update']); Route::delete('/entities/{entity}/{id}',[EntityController::class,'destroy']);
 Route::post('/functions/{name}',[LabController::class,'invoke']);
});
