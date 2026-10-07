<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('app');
});

Route::view('/login', 'app')->name('login');
Route::view('/register', 'app')->name('register');
Route::view('/teacher-login', 'app')->name('teacher-login');

Route::prefix('auth')->group(function () {
    Route::get('/csrf', [AuthController::class, 'csrfToken']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::put('/profile', [AuthController::class, 'updateProfile'])->middleware('auth');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');
});
