<?php

use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Catalogo\Controllers\BodegaController;
use App\Modules\Catalogo\Controllers\MateriaPrimaController;
use App\Modules\Catalogo\Controllers\PresentacionController;
use App\Modules\Catalogo\Controllers\ProductoTerminadoController;
use App\Modules\Permisos\Controllers\PermissionController;
use App\Modules\Recepciones\Controllers\RecepcionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes v1
|--------------------------------------------------------------------------
| Rutas públicas:    sin autenticación
| Rutas privadas:    requieren token Sanctum válido (auth:sanctum)
| Rutas de admin:    requieren además el rol 'administrador' (role:administrador)
| Rutas operativas:  requieren permiso dinámico (permission:recurso.accion)
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
// MÓDULO PERMISOS — Solo administrador (gestión de la matriz RBAC)
// -------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'role:administrador'])->group(function () {
    Route::get('/permisos',                                         [PermissionController::class, 'index']);
    Route::get('/roles/{roleId}/permisos',                         [PermissionController::class, 'byRole']);
    Route::post('/roles/{roleId}/permisos',                        [PermissionController::class, 'attach']);
    Route::delete('/roles/{roleId}/permisos/{permissionId}',       [PermissionController::class, 'detach']);
});

// -------------------------------------------------------------------------
// MÓDULO CATÁLOGO — Lectura (todos los roles con permiso de lectura)
// -------------------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {
    // Unidades de medida — lectura libre para autenticados
    Route::get('/unidades-medida', fn() => response()->json([
        'success' => true,
        'data'    => \App\Models\UnidadMedida::orderBy('nombre')->get(),
    ]));
});

Route::middleware(['auth:sanctum', 'permission:materias_primas.leer'])->group(function () {
    Route::get('/materias-primas',      [MateriaPrimaController::class, 'index']);
    Route::get('/materias-primas/{id}', [MateriaPrimaController::class, 'show']);
});

Route::middleware(['auth:sanctum', 'permission:productos_terminados.leer'])->group(function () {
    Route::get('/productos-terminados',                                       [ProductoTerminadoController::class, 'index']);
    Route::get('/productos-terminados/{id}',                                  [ProductoTerminadoController::class, 'show']);
    Route::get('/productos-terminados/{id}/materias-primas',                  [ProductoTerminadoController::class, 'listarMateriasPrimas']);
    Route::get('/productos-terminados/{id}/presentaciones',                   [PresentacionController::class, 'index']);
});

Route::middleware(['auth:sanctum', 'permission:bodegas.leer'])->group(function () {
    Route::get('/bodegas',      [BodegaController::class, 'index']);
    Route::get('/bodegas/{id}', [BodegaController::class, 'show']);
});

// -------------------------------------------------------------------------
// MÓDULO CATÁLOGO — Escritura (permiso dinámico por recurso)
// -------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'permission:materias_primas.escribir'])->group(function () {
    Route::post('/materias-primas',          [MateriaPrimaController::class, 'store']);
    Route::patch('/materias-primas/{id}',    [MateriaPrimaController::class, 'update']);
    Route::delete('/materias-primas/{id}',   [MateriaPrimaController::class, 'destroy']);
    Route::post('/materias-primas/importar', [MateriaPrimaController::class, 'importar']);
});

Route::middleware(['auth:sanctum', 'permission:productos_terminados.escribir'])->group(function () {
    Route::post('/productos-terminados',                                       [ProductoTerminadoController::class, 'store']);
    Route::patch('/productos-terminados/{id}',                                 [ProductoTerminadoController::class, 'update']);
    Route::delete('/productos-terminados/{id}',                                [ProductoTerminadoController::class, 'destroy']);
    Route::post('/productos-terminados/{id}/materias-primas',                  [ProductoTerminadoController::class, 'asociarMateriaPrima']);
    Route::patch('/productos-terminados/{id}/materias-primas/{mp_id}',         [ProductoTerminadoController::class, 'actualizarRelacion']);
    Route::delete('/productos-terminados/{id}/materias-primas/{mp_id}',        [ProductoTerminadoController::class, 'desasociarMateriaPrima']);
    Route::post('/productos-terminados/{id}/presentaciones',                   [PresentacionController::class, 'store']);
});

Route::middleware(['auth:sanctum', 'permission:bodegas.escribir'])->group(function () {
    Route::post('/bodegas',       [BodegaController::class, 'store']);
    Route::patch('/bodegas/{id}', [BodegaController::class, 'update']);

    Route::patch('/presentaciones/{id}',  [PresentacionController::class, 'update']);
    Route::delete('/presentaciones/{id}', [PresentacionController::class, 'destroy']);
});

// -------------------------------------------------------------------------
// MÓDULO RECEPCIONES — Órdenes de pedido y entrada de materias primas (RFREC)
// -------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'permission:recepciones.leer'])->group(function () {
    // Rutas específicas ANTES que las de parámetro wildcard para evitar colisiones
    Route::get('/recepciones/ordenes',                       [RecepcionController::class, 'listarOrdenes']);
    Route::get('/recepciones/ordenes/{id}',                  [RecepcionController::class, 'verOrden']);
    Route::get('/recepciones',                               [RecepcionController::class, 'listarRecepciones']);
    Route::get('/recepciones/{id}',                          [RecepcionController::class, 'verRecepcion']);
});

Route::middleware(['auth:sanctum', 'permission:recepciones.escribir'])->group(function () {
    Route::post('/recepciones/ordenes',                      [RecepcionController::class, 'crearOrden']);
    Route::patch('/recepciones/ordenes/{id}',                [RecepcionController::class, 'actualizarOrden']);
    Route::post('/recepciones/ordenes/{id}/recepciones',     [RecepcionController::class, 'registrarRecepcion']);
});
