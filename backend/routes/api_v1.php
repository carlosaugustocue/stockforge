<?php

use App\Modules\Auth\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes v1 — Módulo de Autenticación
|--------------------------------------------------------------------------
|
| Rutas de la versión 1 de la API.
| Todas las rutas retornan JSON y siguen el estándar REST.
|
| Rutas públicas:  sin autenticación (login)
| Rutas privadas:  requieren token Sanctum válido (auth:sanctum)
| Rutas de admin:  requieren además el rol 'administrador'
|
*/

// -------------------------------------------------------------------------
// Rutas PÚBLICAS — No requieren autenticación
// -------------------------------------------------------------------------
Route::prefix('auth')->group(function () {
    // POST /api/v1/auth/login
    Route::post('/login', [AuthController::class, 'login']);
});

// -------------------------------------------------------------------------
// Rutas PRIVADAS — Requieren token Sanctum válido
// -------------------------------------------------------------------------
Route::middleware('auth:sanctum')->prefix('auth')->group(function () {

    // POST /api/v1/auth/logout
    Route::post('/logout', [AuthController::class, 'logout']);

    // GET /api/v1/auth/me
    Route::get('/me', [AuthController::class, 'me']);

    // Rutas exclusivas del ADMINISTRADOR (RFAUT02 - RBAC)
    Route::middleware('role:administrador')->group(function () {
        // POST  /api/v1/auth/usuarios        → crear usuario
        Route::post('/usuarios', [AuthController::class, 'crearUsuario']);

        // GET   /api/v1/auth/usuarios        → listar usuarios
        Route::get('/usuarios', [AuthController::class, 'listarUsuarios']);

        // PATCH /api/v1/auth/usuarios/{id}   → actualizar usuario
        Route::patch('/usuarios/{id}', [AuthController::class, 'actualizarUsuario']);

    });
});

// -------------------------------------------------------------------------
// Rutas de ROLES — fuera del prefijo /auth para URL limpia /api/v1/roles
// -------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'role:administrador'])->group(function () {
    // GET /api/v1/roles → listar roles disponibles (para selector en frontend)
    Route::get('/roles', [AuthController::class, 'listarRoles']);
});
