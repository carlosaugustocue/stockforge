<?php

use App\Models\Bodega;
use App\Models\Despacho;
use App\Models\LoteMateriaPrima;
use App\Models\LoteProductoTerminado;
use App\Models\MateriaPrima;
use App\Models\MovimientoInventario;
use App\Models\OrdenPedido;
use App\Models\OrdenProduccion;
use App\Models\ProductoTerminado;
use App\Models\Recepcion;
use App\Models\Role;
use App\Models\UnidadMedida;
use Database\Seeders\BodegaSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\UnidadMedidaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->seed(PermissionSeeder::class);
    $this->seed(UnidadMedidaSeeder::class);
    $this->seed(BodegaSeeder::class);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function crearUsuarioReporte(string $rol): array
{
    $role = Role::where('nombre', $rol)->first();
    $user = \App\Models\User::factory()->create(['role_id' => $role->id, 'activo' => true]);
    return ['user' => $user, 'token' => $user->createToken('api-token')->plainTextToken];
}

function crearLoteMpRpt(float $cantidad = 50.0): LoteMateriaPrima
{
    $unidadKg = UnidadMedida::where('nombre', 'kg')->first();
    $mp       = MateriaPrima::create(['nombre' => 'Harina ' . uniqid(), 'unidad_medida_id' => $unidadKg->id, 'punto_reorden' => 5, 'activa' => true]);
    $orden    = OrdenPedido::create(['proveedor' => 'Test', 'estado' => 'cerrada']);
    $rec      = Recepcion::create(['orden_pedido_id' => $orden->id]);
    $bodega   = Bodega::where('tipo', 'principal')->first();

    return LoteMateriaPrima::create([
        'recepcion_id'     => $rec->id,
        'materia_prima_id' => $mp->id,
        'bodega_id'        => $bodega->id,
        'cantidad_inicial' => $cantidad,
        'cantidad_actual'  => $cantidad,
        'fecha_ingreso'    => now(),
    ]);
}

function crearLotePtVentasReporte(float $cantidad = 10.0): LoteProductoTerminado
{
    $unidadUnd = UnidadMedida::where('nombre', 'unidad')->first();
    $pt        = ProductoTerminado::create(['nombre' => 'Pan ' . uniqid(), 'unidad_medida_id' => $unidadUnd->id, 'activo' => true]);
    $orden     = OrdenProduccion::create(['producto_terminado_id' => $pt->id, 'cantidad_planificada' => $cantidad, 'estado' => 'completada', 'fecha_planificada' => now()->toDateString()]);
    $bodega    = Bodega::where('tipo', 'ventas')->first();

    return LoteProductoTerminado::create([
        'orden_produccion_id'   => $orden->id,
        'producto_terminado_id' => $pt->id,
        'bodega_id'             => $bodega->id,
        'cantidad_inicial'      => $cantidad,
        'cantidad_actual'       => $cantidad,
        'fecha_produccion'      => now()->toDateString(),
    ]);
}

function crearDespachoDirecto(LoteProductoTerminado $lote, float $cantidad, int $userId): Despacho
{
    $lote->decrement('cantidad_actual', $cantidad);
    $mov = MovimientoInventario::create([
        'tipo'         => MovimientoInventario::TIPO_DESPACHO_SALIDA,
        'entidad_tipo' => MovimientoInventario::ENTIDAD_PRODUCTO_TERMINADO,
        'entidad_id'   => $lote->id,
        'bodega_id'    => $lote->bodega_id,
        'cantidad'     => $cantidad,
        'user_id'      => $userId,
    ]);
    return Despacho::create([
        'lote_pt_id'         => $lote->id,
        'user_id'            => $userId,
        'cantidad'           => $cantidad,
        'referencia_cliente' => 'Cliente Test',
        'movimiento_id'      => $mov->id,
    ]);
}

// ── Test 1: Sin token retorna 401 ─────────────────────────────────────────────
test('test_sin_token_no_puede_ver_reportes', function () {
    $this->getJson('/api/v1/reportes/kpis')->assertStatus(401);
});

// ── Test 2: Administrador no tiene acceso a reportes — RNFSEC-04 ──────────────
test('test_administrador_no_puede_ver_reportes', function () {
    ['token' => $token] = crearUsuarioReporte(Role::ADMINISTRADOR);
    $this->withToken($token)->getJson('/api/v1/reportes/kpis')->assertStatus(403);
});

// ── Test 3: Gerencia puede ver KPIs ──────────────────────────────────────────
test('test_gerencia_puede_ver_kpis', function () {
    ['token' => $token] = crearUsuarioReporte(Role::GERENCIA);

    $this->withToken($token)
        ->getJson('/api/v1/reportes/kpis')
        ->assertStatus(200)
        ->assertJsonStructure(['data' => [
            'ordenes_produccion' => ['pendientes', 'producidas', 'completadas', 'anuladas', 'total'],
            'despachos_mes',
            'mp_recibida_mes',
            'alertas_reorden',
            'periodo',
        ]]);
});

// ── Test 4: KPIs refleja órdenes existentes ───────────────────────────────────
test('test_kpis_contiene_conteo_correcto_de_ordenes', function () {
    ['token' => $token, 'user' => $user] = crearUsuarioReporte(Role::ENCARGADO_INVENTARIOS);

    $unidadUnd = UnidadMedida::where('nombre', 'unidad')->first();
    $pt        = ProductoTerminado::create(['nombre' => 'Producto KPI', 'unidad_medida_id' => $unidadUnd->id, 'activo' => true]);

    OrdenProduccion::create(['producto_terminado_id' => $pt->id, 'cantidad_planificada' => 10, 'estado' => 'pendiente',  'fecha_planificada' => now()->toDateString()]);
    OrdenProduccion::create(['producto_terminado_id' => $pt->id, 'cantidad_planificada' => 10, 'estado' => 'completada', 'fecha_planificada' => now()->toDateString()]);

    $r = $this->withToken($token)->getJson('/api/v1/reportes/kpis')->assertStatus(200);

    expect($r->json('data.ordenes_produccion.pendientes'))->toBe(1);
    expect($r->json('data.ordenes_produccion.completadas'))->toBe(1);
    expect($r->json('data.ordenes_produccion.total'))->toBe(2);
});

// ── Test 5: Reporte de producción retorna estructura correcta ─────────────────
test('test_reporte_produccion_retorna_estructura', function () {
    ['token' => $token] = crearUsuarioReporte(Role::JEFE_PRODUCCION);

    $this->withToken($token)
        ->getJson('/api/v1/reportes/produccion')
        ->assertStatus(200)
        ->assertJsonStructure(['data' => ['periodo', 'total_ordenes', 'total_planificado', 'total_producido', 'detalle']]);
});

// ── Test 6: Reporte producción filtra por período ─────────────────────────────
test('test_reporte_produccion_filtra_por_periodo', function () {
    ['token' => $token] = crearUsuarioReporte(Role::ENCARGADO_INVENTARIOS);

    $unidadUnd = UnidadMedida::where('nombre', 'unidad')->first();
    $pt        = ProductoTerminado::create(['nombre' => 'Pan Filtro', 'unidad_medida_id' => $unidadUnd->id, 'activo' => true]);

    // Orden hoy
    OrdenProduccion::create(['producto_terminado_id' => $pt->id, 'cantidad_planificada' => 5, 'estado' => 'pendiente', 'fecha_planificada' => now()->toDateString()]);
    // Orden hace 60 días (fuera del rango)
    OrdenProduccion::create(['producto_terminado_id' => $pt->id, 'cantidad_planificada' => 5, 'estado' => 'pendiente', 'fecha_planificada' => now()->subDays(60)->toDateString()]);

    $desde = now()->subDays(7)->toDateString();
    $hasta = now()->toDateString();

    $r = $this->withToken($token)
        ->getJson("/api/v1/reportes/produccion?fecha_desde={$desde}&fecha_hasta={$hasta}")
        ->assertStatus(200);

    expect($r->json('data.total_ordenes'))->toBe(1);
});

// ── Test 7: Reporte de despachos retorna estructura correcta ──────────────────
test('test_reporte_despachos_retorna_estructura', function () {
    ['token' => $token, 'user' => $user] = crearUsuarioReporte(Role::ENCARGADO_INVENTARIOS);
    $lote = crearLotePtVentasReporte(10.0);
    crearDespachoDirecto($lote, 3.0, $user->id);

    $r = $this->withToken($token)
        ->getJson('/api/v1/reportes/despachos')
        ->assertStatus(200)
        ->assertJsonStructure(['data' => ['periodo', 'total_despachos', 'total_unidades', 'por_producto', 'detalle']]);

    expect($r->json('data.total_despachos'))->toBe(1);
    expect((float) $r->json('data.total_unidades'))->toBe(3.0);
});

// ── Test 8: Reporte de movimientos es filtrable por tipo ──────────────────────
test('test_reporte_movimientos_filtra_por_tipo', function () {
    ['token' => $token, 'user' => $user] = crearUsuarioReporte(Role::ENCARGADO_INVENTARIOS);

    $lote = crearLoteMpRpt(50.0);

    // Movimiento RECEPCION_ENTRADA
    MovimientoInventario::create([
        'tipo' => MovimientoInventario::TIPO_RECEPCION_ENTRADA, 'entidad_tipo' => 'materia_prima',
        'entidad_id' => $lote->id, 'bodega_id' => $lote->bodega_id, 'cantidad' => 50, 'user_id' => $user->id,
    ]);
    // Movimiento CONSUMO_MP
    MovimientoInventario::create([
        'tipo' => MovimientoInventario::TIPO_CONSUMO_MP, 'entidad_tipo' => 'materia_prima',
        'entidad_id' => $lote->id, 'bodega_id' => $lote->bodega_id, 'cantidad' => 10, 'user_id' => $user->id,
    ]);

    $r = $this->withToken($token)
        ->getJson('/api/v1/reportes/movimientos?tipo=CONSUMO_MP')
        ->assertStatus(200);

    expect($r->json('data.total'))->toBe(1);
    expect($r->json('data.detalle.0.tipo'))->toBe('CONSUMO_MP');
});

// ── Test 9: Stock PT solo muestra lotes en bodega ventas con stock ────────────
test('test_stock_pt_solo_muestra_lotes_en_ventas_con_stock', function () {
    ['token' => $token] = crearUsuarioReporte(Role::GERENCIA);

    // Lote en ventas con stock
    crearLotePtVentasReporte(8.0);

    // Lote en producción (no debe aparecer)
    $unidadUnd   = UnidadMedida::where('nombre', 'unidad')->first();
    $pt2         = ProductoTerminado::create(['nombre' => 'Pan Planta', 'unidad_medida_id' => $unidadUnd->id, 'activo' => true]);
    $orden2      = OrdenProduccion::create(['producto_terminado_id' => $pt2->id, 'cantidad_planificada' => 5, 'estado' => 'producido', 'fecha_planificada' => now()->toDateString()]);
    $bodegaProd  = Bodega::where('tipo', 'produccion')->first();
    LoteProductoTerminado::create(['orden_produccion_id' => $orden2->id, 'producto_terminado_id' => $pt2->id, 'bodega_id' => $bodegaProd->id, 'cantidad_inicial' => 5, 'cantidad_actual' => 5, 'fecha_produccion' => now()->toDateString()]);

    $r = $this->withToken($token)
        ->getJson('/api/v1/reportes/stock-pt')
        ->assertStatus(200)
        ->assertJsonStructure(['data' => ['total_lotes', 'por_producto', 'detalle']]);

    expect($r->json('data.total_lotes'))->toBe(1);
    expect((float) $r->json('data.detalle.0.cantidad_actual'))->toBe(8.0);
});

// ── Test 10: KPIs detecta alertas de reorden ─────────────────────────────────
test('test_kpis_detecta_alertas_bajo_reorden', function () {
    ['token' => $token] = crearUsuarioReporte(Role::GERENCIA);

    // MP con stock 2 kg, punto_reorden 10 kg → debe generar alerta
    $unidadKg = UnidadMedida::where('nombre', 'kg')->first();
    $mp       = MateriaPrima::create(['nombre' => 'MP Alerta', 'unidad_medida_id' => $unidadKg->id, 'punto_reorden' => 10, 'activa' => true]);
    $orden    = OrdenPedido::create(['proveedor' => 'P', 'estado' => 'cerrada']);
    $rec      = Recepcion::create(['orden_pedido_id' => $orden->id]);
    $bodega   = Bodega::where('tipo', 'principal')->first();
    LoteMateriaPrima::create(['recepcion_id' => $rec->id, 'materia_prima_id' => $mp->id, 'bodega_id' => $bodega->id, 'cantidad_inicial' => 2, 'cantidad_actual' => 2, 'fecha_ingreso' => now()]);

    $r = $this->withToken($token)->getJson('/api/v1/reportes/kpis')->assertStatus(200);

    expect($r->json('data.alertas_reorden'))->toBeGreaterThanOrEqual(1);
});
