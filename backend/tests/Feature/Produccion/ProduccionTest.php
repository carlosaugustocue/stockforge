<?php

use App\Models\Bodega;
use App\Models\LoteMateriaPrima;
use App\Models\LoteProductoTerminado;
use App\Models\MateriaPrima;
use App\Models\MovimientoInventario;
use App\Models\OrdenPedido;
use App\Models\OrdenProduccion;
use App\Models\ProductoTerminado;
use App\Models\Recepcion;
use App\Models\RelacionMpPt;
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

function crearUsuarioProd(string $rol): array
{
    $role = Role::where('nombre', $rol)->first();
    $user = \App\Models\User::factory()->create(['role_id' => $role->id, 'activo' => true]);
    return ['user' => $user, 'token' => $user->createToken('api-token')->plainTextToken];
}

function crearPtConMp(float $cantidadPorUnidad = 0.5): array
{
    $unidadKg  = UnidadMedida::where('nombre', 'kg')->first();
    $unidadUnd = UnidadMedida::where('nombre', 'unidad')->first();

    $mp = MateriaPrima::create([
        'nombre' => 'Harina Test', 'unidad_medida_id' => $unidadKg->id,
        'punto_reorden' => 5, 'activa' => true,
    ]);
    $pt = ProductoTerminado::create([
        'nombre' => 'Pan Test', 'unidad_medida_id' => $unidadUnd->id, 'activo' => true,
    ]);
    RelacionMpPt::create([
        'materia_prima_id' => $mp->id, 'producto_terminado_id' => $pt->id,
        'cantidad_requerida' => $cantidadPorUnidad, 'unidad_medida_id' => $unidadKg->id,
    ]);
    return ['mp' => $mp, 'pt' => $pt];
}

function crearLoteProd(int $mpId, float $cantidad): LoteMateriaPrima
{
    $orden  = OrdenPedido::create(['proveedor' => 'Test', 'estado' => 'cerrada']);
    $rec    = Recepcion::create(['orden_pedido_id' => $orden->id]);
    $bodega = Bodega::where('tipo', 'principal')->first();
    return LoteMateriaPrima::create([
        'recepcion_id' => $rec->id, 'materia_prima_id' => $mpId,
        'bodega_id' => $bodega->id, 'cantidad_inicial' => $cantidad,
        'cantidad_actual' => $cantidad, 'fecha_ingreso' => now(),
    ]);
}

// ── Test 1: Encargado puede crear una orden de producción — RFPROD01 ──────────
test('test_encargado_puede_crear_orden_produccion', function () {
    ['token' => $token] = crearUsuarioProd(Role::ENCARGADO_INVENTARIOS);
    ['mp' => $mp, 'pt' => $pt] = crearPtConMp(0.5);
    crearLoteProd($mp->id, 100.0);

    $this->withToken($token)
        ->postJson('/api/v1/produccion/ordenes', [
            'producto_terminado_id' => $pt->id,
            'cantidad_planificada'  => 10,
            'fecha_planificada'     => now()->toDateString(),
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.estado', 'pendiente')
        ->assertJsonPath('data.cantidad_planificada', '10.000');
});

// ── Test 2: Sin token retorna 401 ─────────────────────────────────────────────
test('test_sin_token_no_puede_crear_orden', function () {
    $this->postJson('/api/v1/produccion/ordenes', [])->assertStatus(401);
});

// ── Test 3: Gerencia NO puede crear orden — solo lee — RNFSEC-04 ──────────────
test('test_gerencia_no_puede_crear_orden_produccion', function () {
    ['token' => $token] = crearUsuarioProd(Role::GERENCIA);
    ['pt' => $pt] = crearPtConMp();

    $this->withToken($token)
        ->postJson('/api/v1/produccion/ordenes', [
            'producto_terminado_id' => $pt->id,
            'cantidad_planificada'  => 10,
            'fecha_planificada'     => now()->toDateString(),
        ])
        ->assertStatus(403);
});

// ── Test 4: Stock insuficiente al crear orden retorna 422 — RFPROD05 ──────────
test('test_crear_orden_sin_stock_suficiente_retorna_422', function () {
    ['token' => $token] = crearUsuarioProd(Role::ENCARGADO_INVENTARIOS);
    ['mp' => $mp, 'pt' => $pt] = crearPtConMp(0.5);
    crearLoteProd($mp->id, 2.0); // 2 kg disponibles, necesita 0.5×10 = 5 kg

    $this->withToken($token)
        ->postJson('/api/v1/produccion/ordenes', [
            'producto_terminado_id' => $pt->id,
            'cantidad_planificada'  => 10,
            'fecha_planificada'     => now()->toDateString(),
        ])
        ->assertStatus(422);
});

// ── Test 5: Ejecutar producción consume MP y crea lote PT — RFPROD01-03 ───────
test('test_ejecutar_produccion_consume_mp_y_crea_lote_pt', function () {
    ['token' => $token] = crearUsuarioProd(Role::ENCARGADO_INVENTARIOS);
    ['mp' => $mp, 'pt' => $pt] = crearPtConMp(0.5);
    crearLoteProd($mp->id, 100.0);

    // Crear orden
    $response = $this->withToken($token)
        ->postJson('/api/v1/produccion/ordenes', [
            'producto_terminado_id' => $pt->id,
            'cantidad_planificada'  => 10,
            'fecha_planificada'     => now()->toDateString(),
        ])->assertStatus(201);

    $ordenId = $response->json('data.id');
    auth()->forgetGuards();

    // Ejecutar producción
    $this->withToken($token)
        ->postJson("/api/v1/produccion/ordenes/{$ordenId}/ejecutar", [
            'cantidad_producida' => 10,
        ])
        ->assertStatus(200)
        ->assertJsonPath('data.estado', 'producido');

    // MP descontada: 100 - (0.5 × 10) = 95
    expect((float) \App\Models\LoteMateriaPrima::where('materia_prima_id', $mp->id)->first()->cantidad_actual)
        ->toBe(95.0);

    // Lote PT creado en Planta de Producción
    $bodegaPlanta = Bodega::where('tipo', 'produccion')->first();
    $lotePt = LoteProductoTerminado::where('producto_terminado_id', $pt->id)->first();
    expect($lotePt)->not->toBeNull();
    expect((float) $lotePt->cantidad_actual)->toBe(10.0);
    expect($lotePt->bodega_id)->toBe($bodegaPlanta->id);

    // Movimientos generados
    expect(MovimientoInventario::where('tipo', MovimientoInventario::TIPO_CONSUMO_MP)->exists())->toBeTrue();
    expect(MovimientoInventario::where('tipo', MovimientoInventario::TIPO_PRODUCCION_ENTRADA)->exists())->toBeTrue();
});

// ── Test 6: No se puede ejecutar una orden ya producida ───────────────────────
test('test_no_se_puede_ejecutar_orden_producida', function () {
    ['token' => $token] = crearUsuarioProd(Role::ENCARGADO_INVENTARIOS);
    ['mp' => $mp, 'pt' => $pt] = crearPtConMp(0.5);
    crearLoteProd($mp->id, 100.0);

    $r = $this->withToken($token)->postJson('/api/v1/produccion/ordenes', [
        'producto_terminado_id' => $pt->id, 'cantidad_planificada' => 5,
        'fecha_planificada' => now()->toDateString(),
    ])->assertStatus(201);
    $id = $r->json('data.id');
    auth()->forgetGuards();

    $this->withToken($token)->postJson("/api/v1/produccion/ordenes/{$id}/ejecutar", ['cantidad_producida' => 5])->assertStatus(200);
    auth()->forgetGuards();
    $this->withToken($token)->postJson("/api/v1/produccion/ordenes/{$id}/ejecutar", ['cantidad_producida' => 5])->assertStatus(422);
});

// ── Test 7: FEFO — consume el lote más próximo a vencer primero — RFINV03 ─────
test('test_fefo_consume_lote_mas_proximo_a_vencer', function () {
    ['token' => $token] = crearUsuarioProd(Role::ENCARGADO_INVENTARIOS);
    ['mp' => $mp, 'pt' => $pt] = crearPtConMp(1.0);

    $bodega = Bodega::where('tipo', 'principal')->first();
    $orden  = OrdenPedido::create(['proveedor' => 'T', 'estado' => 'cerrada']);
    $rec    = Recepcion::create(['orden_pedido_id' => $orden->id]);

    // Lote con vencimiento lejano (debe consumirse segundo)
    $loteLejano = LoteMateriaPrima::create([
        'recepcion_id' => $rec->id, 'materia_prima_id' => $mp->id,
        'bodega_id' => $bodega->id, 'cantidad_inicial' => 10.0,
        'cantidad_actual' => 10.0, 'fecha_vencimiento' => now()->addMonths(6)->toDateString(),
        'fecha_ingreso' => now(),
    ]);
    // Lote con vencimiento próximo (debe consumirse primero)
    $loteProximo = LoteMateriaPrima::create([
        'recepcion_id' => $rec->id, 'materia_prima_id' => $mp->id,
        'bodega_id' => $bodega->id, 'cantidad_inicial' => 10.0,
        'cantidad_actual' => 10.0, 'fecha_vencimiento' => now()->addDays(10)->toDateString(),
        'fecha_ingreso' => now(),
    ]);

    $r = $this->withToken($token)->postJson('/api/v1/produccion/ordenes', [
        'producto_terminado_id' => $pt->id, 'cantidad_planificada' => 5,
        'fecha_planificada' => now()->toDateString(),
    ])->assertStatus(201);
    $id = $r->json('data.id');
    auth()->forgetGuards();

    $this->withToken($token)->postJson("/api/v1/produccion/ordenes/{$id}/ejecutar", ['cantidad_producida' => 5])->assertStatus(200);

    // El lote próximo a vencer debe haber reducido su stock (FEFO)
    expect((float) $loteProximo->fresh()->cantidad_actual)->toBe(5.0);
    // El lote lejano no debe haberse tocado
    expect((float) $loteLejano->fresh()->cantidad_actual)->toBe(10.0);
});

// ── Test 8: Trasladar PT a Ventas — disponible para despacho — RFPROD03 ───────
test('test_trasladar_pt_a_ventas_lo_hace_disponible_para_despacho', function () {
    ['token' => $token] = crearUsuarioProd(Role::ENCARGADO_INVENTARIOS);
    ['mp' => $mp, 'pt' => $pt] = crearPtConMp(0.5);
    crearLoteProd($mp->id, 100.0);

    $r = $this->withToken($token)->postJson('/api/v1/produccion/ordenes', [
        'producto_terminado_id' => $pt->id, 'cantidad_planificada' => 4,
        'fecha_planificada' => now()->toDateString(),
    ])->assertStatus(201);
    $id = $r->json('data.id');
    auth()->forgetGuards();

    $this->withToken($token)->postJson("/api/v1/produccion/ordenes/{$id}/ejecutar", ['cantidad_producida' => 4])->assertStatus(200);
    auth()->forgetGuards();

    $this->withToken($token)
        ->postJson("/api/v1/produccion/ordenes/{$id}/traslado-pt")
        ->assertStatus(200)
        ->assertJsonPath('data.estado', 'completada');

    $bodegaVentas = Bodega::where('tipo', 'ventas')->first();
    $lotePt = LoteProductoTerminado::where('producto_terminado_id', $pt->id)->first();
    expect($lotePt->bodega_id)->toBe($bodegaVentas->id);
    expect($lotePt->estaDisponibleParaDespacho())->toBeTrue();
});

// ── Test 9: No se puede trasladar PT si no está producida ─────────────────────
test('test_no_se_puede_trasladar_pt_sin_ejecutar', function () {
    ['token' => $token] = crearUsuarioProd(Role::ENCARGADO_INVENTARIOS);
    ['mp' => $mp, 'pt' => $pt] = crearPtConMp(0.5);
    crearLoteProd($mp->id, 100.0);

    $r = $this->withToken($token)->postJson('/api/v1/produccion/ordenes', [
        'producto_terminado_id' => $pt->id, 'cantidad_planificada' => 4,
        'fecha_planificada' => now()->toDateString(),
    ])->assertStatus(201);
    auth()->forgetGuards();

    $this->withToken($token)
        ->postJson("/api/v1/produccion/ordenes/{$r->json('data.id')}/traslado-pt")
        ->assertStatus(422);
});

// ── Test 10: Anular orden pendiente — RFPROD01 ────────────────────────────────
test('test_encargado_puede_anular_orden_pendiente', function () {
    ['token' => $token] = crearUsuarioProd(Role::ENCARGADO_INVENTARIOS);
    ['mp' => $mp, 'pt' => $pt] = crearPtConMp(0.5);
    crearLoteProd($mp->id, 100.0);

    $r = $this->withToken($token)->postJson('/api/v1/produccion/ordenes', [
        'producto_terminado_id' => $pt->id, 'cantidad_planificada' => 4,
        'fecha_planificada' => now()->toDateString(),
    ])->assertStatus(201);
    auth()->forgetGuards();

    $this->withToken($token)
        ->patchJson("/api/v1/produccion/ordenes/{$r->json('data.id')}/anular")
        ->assertStatus(200)
        ->assertJsonPath('data.estado', 'anulada');
});
