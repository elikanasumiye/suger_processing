<?php

use App\Http\Controllers\SimulationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->group(function (): void {
	Route::get('/dashboard', [SimulationController::class, 'dashboard']);
	Route::get('/experiments', [SimulationController::class, 'experiments']);
	Route::get('/safety-rules', [SimulationController::class, 'safetyRules']);
	Route::post('/simulations/lane-eynon', [SimulationController::class, 'laneEynon']);
	Route::post('/simulations/ash', [SimulationController::class, 'ash']);
	Route::get('/sessions', [SimulationController::class, 'sessions']);
	Route::get('/teacher/sessions', [SimulationController::class, 'teacherSessions']);
});