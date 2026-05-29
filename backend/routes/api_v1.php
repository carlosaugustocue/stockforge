<?php

use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Catalogo\Controllers\BodegaController;
use App\Modules\Catalogo\Controllers\MateriaPrimaController;
use App\Modules\Catalogo\Controllers\PresentacionController;
use App\Modules\Catalogo\Controllers\ProductoTerminadoController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes v1
|--------------------------------------------------------------------------
| Rutas públicas:  sin autenticación
| Rutas privadas:  requieren token Sanctum válido (auth:sanctum)
| Rutas de admin:  requieren además el rol 'administrador'
| Rutas de catálogo: requieren rol 'gerencia' o 'encargado_inventarios' para escritura
*/

// -------------------------------------------------------------------------
// MÓDULO AUTH — Rutas PÚBLICAS
// -------------------------------------------------------------------------
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// -------------------------------------------------------------------------
// MÓDULO AUTH — Rutas PRIVADAS
// -------------------------------------------------------------------------
Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    Route::middleware('role:administrador')->group(function () {
        Route::post('/usuarios',         [AuthController::class, 'crearUsuario']);
        Route::get('/usuarios',          [AuthController::class, 'listarUsuarios']);
        Route::patch('/usuarios/{id}',   [AuthController::class, 'actualizarUsuario']);
    });
});

Route::middleware(['auth:sanctum', 'role:administrador'])->group(function () {
    Route::get('/roles', [AuthController::class, 'listarRoles']);
});

// -------------------------------------------------------------------------
// MÓDULO CATÁLOGO — Lectura (todos los roles autenticados)
// -------------------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/unidades-medida',   fn() => response()->json(['success' => true, 'data' => \App\Models\UnidadMedida::orderBy('nombre')->get()]));

    Route::get('/materias-primas',          [MateriaPrimaController::class, 'index']);
    Route::get('/materias-primas/{id}',     [MateriaPrimaController::class, 'show']);

    Route::get('/productos-terminados',         [ProductoTerminadoController::class, 'index']);
    Route::get('/productos-terminados/{id}',    [ProductoTerminadoController::class, 'show']);
    Route::get('/productos-terminados/{id}/materias-primas',  [ProductoTerminadoController::class, 'listarMateriasPrimas']);
    Route::get('/productos-terminados/{id}/presentaciones',   [PresentacionController::class, 'index']);

    Route::get('/bodegas',       [BodegaController::class, 'index']);
    Route::get('/bodegas/{id}',  [BodegaController::class, 'show']);
});

// -------------------------------------------------------------------------
// MÓDULO CATÁLOGO — Escritura (gerencia + encargado_inventarios)
// -------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'role:gerencia,encargado_inventarios'])->group(function () {
    // Materias primas
    Route::post('/materias-primas',              [MateriaPrimaController::class, 'store']);
    Route::patch('/materias-primas/{id}',        [MateriaPrimaController::class, 'update']);
    Route::delete('/materias-primas/{id}',       [MateriaPrimaController::class, 'destroy']);
    Route::post('/materias-primas/importar',     [MateriaPrimaController::class, 'importar']);

    // Productos terminados
    Route::post('/productos-terminados',                                        [ProductoTerminadoController::class, 'store']);
    Route::patch('/productos-terminados/{id}',                                  [ProductoTerminadoController::class, 'update']);
    Route::delete('/productos-terminados/{id}',                                 [ProductoTerminadoController::class, 'destroy']);
    Route::post('/productos-terminados/{id}/materias-primas',                   [ProductoTerminadoController::class, 'asociarMateriaPrima']);
    Route::patch('/productos-terminados/{id}/materias-primas/{mp_id}',          [ProductoTerminadoController::class, 'actualizarRelacion']);
    Route::delete('/productos-terminados/{id}/materias-primas/{mp_id}',         [ProductoTerminadoController::class, 'desasociarMateriaPrima']);
    Route::post('/productos-terminados/{id}/presentaciones',                    [PresentacionController::class, 'store']);

    // Bodegas
    Route::post('/bodegas',          [BodegaController::class, 'store']);
    Route::patch('/bodegas/{id}',    [BodegaController::class, 'update']);

    // Presentaciones
    Route::patch('/presentaciones/{id}',    [PresentacionController::class, 'update']);
    Route::delete('/presentaciones/{id}',   [PresentacionController::class, 'destroy']);
});
