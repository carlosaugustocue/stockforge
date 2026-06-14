<?php

use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Catalogo\Controllers\BodegaController;
use App\Modules\Catalogo\Controllers\MateriaPrimaController;
use App\Modules\Catalogo\Controllers\ProveedorController;
use App\Modules\Catalogo\Controllers\PresentacionController;
use App\Modules\Catalogo\Controllers\ProductoTerminadoController;
use App\Modules\Permisos\Controllers\PermissionController;
use App\Modules\Inventario\Controllers\InventarioController;
use App\Modules\Produccion\Controllers\ProduccionController;
use App\Modules\Recepciones\Controllers\RecepcionController;
use App\Modules\Despacho\Controllers\DespachoController;
use App\Modules\Reportes\Controllers\ReportesController;
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

Route::middleware(['auth:sanctum', 'permission:materias_primas.leer'])->group(function () {
    Route::get('/proveedores',       [ProveedorController::class, 'index']);
    Route::get('/proveedores/{id}',  [ProveedorController::class, 'show']);
});

// -------------------------------------------------------------------------
// MÓDULO CATÁLOGO — Escritura (permiso dinámico por recurso)
// -------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'permission:materias_primas.escribir'])->group(function () {
    Route::post('/materias-primas',          [MateriaPrimaController::class, 'store']);
    Route::patch('/materias-primas/{id}',    [MateriaPrimaController::class, 'update']);
    Route::delete('/materias-primas/{id}',   [MateriaPrimaController::class, 'destroy']);
    Route::post('/materias-primas/importar', [MateriaPrimaController::class, 'importar']);

    Route::post('/proveedores',          [ProveedorController::class, 'store']);
    Route::patch('/proveedores/{id}',    [ProveedorController::class, 'update']);
    Route::delete('/proveedores/{id}',   [ProveedorController::class, 'destroy']);
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
// MÓDULO INVENTARIO — Consultas de stock (RFINV01 / HU-002)
// -------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'permission:inventario.leer'])->group(function () {
    Route::get('/inventario/stock/mp',      [InventarioController::class, 'stockMp']);
    Route::get('/inventario/stock/mp/{id}', [InventarioController::class, 'stockMpPorId']);
});

// -------------------------------------------------------------------------
// MÓDULO ALERTAS — Alertas de stock bajo reorden y vencimientos (alertas.leer)
// -------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'permission:alertas.leer'])->group(function () {
    Route::get('/inventario/alertas', [InventarioController::class, 'alertas']);
});

Route::middleware(['auth:sanctum', 'permission:inventario.escribir'])->group(function () {
    Route::post('/inventario/traslados', [InventarioController::class, 'trasladar']);
});

// -------------------------------------------------------------------------
// MÓDULO PRODUCCIÓN — Ciclo productivo completo (RFPROD01-05)
// -------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'permission:produccion.leer'])->group(function () {
    Route::get('/produccion/ordenes',        [ProduccionController::class, 'listarOrdenes']);
    Route::get('/produccion/ordenes/{id}',   [ProduccionController::class, 'verOrden']);
});

Route::middleware(['auth:sanctum', 'permission:produccion.escribir'])->group(function () {
    Route::post('/produccion/ordenes',                          [ProduccionController::class, 'crearOrden']);
    Route::post('/produccion/ordenes/{id}/ejecutar',            [ProduccionController::class, 'ejecutar']);
    Route::post('/produccion/ordenes/{id}/traslado-pt',         [ProduccionController::class, 'trasladarPt']);
    Route::patch('/produccion/ordenes/{id}/anular',             [ProduccionController::class, 'anular']);
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

// -------------------------------------------------------------------------
// MÓDULO DESPACHO — Salida de PT hacia clientes (RFPROD03 / HU-027)
// -------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'permission:despachos.leer'])->group(function () {
    Route::get('/despachos',      [DespachoController::class, 'listarDespachos']);
    Route::get('/despachos/{id}', [DespachoController::class, 'verDespacho']);
});

Route::middleware(['auth:sanctum', 'permission:despachos.escribir'])->group(function () {
    Route::post('/despachos', [DespachoController::class, 'registrar']);
});

// -------------------------------------------------------------------------
// MÓDULO REPORTES — KPIs y reportes de gestión (reportes.leer)
// -------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'permission:reportes.leer'])->group(function () {
    Route::get('/reportes/kpis',        [ReportesController::class, 'kpis']);
    Route::get('/reportes/produccion',  [ReportesController::class, 'produccion']);
    Route::get('/reportes/despachos',   [ReportesController::class, 'despachos']);
    Route::get('/reportes/movimientos', [ReportesController::class, 'movimientos']);
    Route::get('/reportes/stock-pt',    [ReportesController::class, 'stockPt']);
});

// -------------------------------------------------------------------------
// MÓDULO BITÁCORA — Auditoría de accesos (solo administrador)
// -------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'role:administrador'])->group(function () {
    Route::get('/bitacora', [\App\Modules\Bitacora\Controllers\BitacoraController::class, 'index']);
});
