<?php

use App\Models\Bodega;
use App\Models\LoteMateriaPrima;
use App\Models\MateriaPrima;
use App\Models\MovimientoInventario;
use App\Models\OrdenPedido;
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

function crearUsuarioTraslado(string $rol): array
{
    $role = Role::where('nombre', $rol)->first();
    $user = \App\Models\User::factory()->create(['role_id' => $role->id, 'activo' => true]);
    return ['user' => $user, 'token' => $user->createToken('api-token')->plainTextToken];
}

function crearLoteEnPrincipal(float $cantidad = 50.0, ?string $fechaVencimiento = null): LoteMateriaPrima
{
    $unidadKg = UnidadMedida::where('nombre', 'kg')->first();
    $mp       = MateriaPrima::create(['nombre' => 'Harina ' . uniqid(), 'unidad_medida_id' => $unidadKg->id, 'punto_reorden' => 5, 'activa' => true]);
    $orden    = OrdenPedido::create(['proveedor' => 'Proveedor Test', 'estado' => 'cerrada']);
    $rec      = Recepcion::create(['orden_pedido_id' => $orden->id]);
    $bodega   = Bodega::where('tipo', 'principal')->first();

    return LoteMateriaPrima::create([
        'recepcion_id'     => $rec->id,
        'materia_prima_id' => $mp->id,
        'bodega_id'        => $bodega->id,
        'cantidad_inicial' => $cantidad,
        'cantidad_actual'  => $cantidad,
        'fecha_ingreso'    => now(),
        'fecha_vencimiento'=> $fechaVencimiento,
    ]);
}

// ── Test 1: Sin token retorna 401 ─────────────────────────────────────────────
test('test_sin_token_no_puede_trasladar', function () {
    $this->postJson('/api/v1/inventario/traslados', [])->assertStatus(401);
});

// ── Test 2: Gerencia NO puede trasladar (solo lee) — RNFSEC-04 ───────────────
test('test_gerencia_no_puede_trasladar_mp', function () {
    ['token' => $token] = crearUsuarioTraslado(Role::GERENCIA);
    $lote = crearLoteEnPrincipal(20.0);
    $bodegaOrigen  = Bodega::where('tipo', 'principal')->first();
    $bodegaDestino = Bodega::where('tipo', 'produccion')->first();

    $this->withToken($token)
        ->postJson('/api/v1/inventario/traslados', [
            'materia_prima_id' => $lote->materia_prima_id,
            'bodega_origen_id' => $bodegaOrigen->id,
            'bodega_destino_id'=> $bodegaDestino->id,
            'cantidad'         => 10,
        ])
        ->assertStatus(403);
});

// ── Test 3: Encargado puede realizar traslado parcial — RFINV04 ───────────────
test('test_encargado_puede_trasladar_parcial', function () {
    ['token' => $token] = crearUsuarioTraslado(Role::ENCARGADO_INVENTARIOS);
    $lote          = crearLoteEnPrincipal(50.0);
    $bodegaOrigen  = Bodega::where('tipo', 'principal')->first();
    $bodegaDestino = Bodega::where('tipo', 'produccion')->first();

    $response = $this->withToken($token)
        ->postJson('/api/v1/inventario/traslados', [
            'materia_prima_id' => $lote->materia_prima_id,
            'bodega_origen_id' => $bodegaOrigen->id,
            'bodega_destino_id'=> $bodegaDestino->id,
            'cantidad'         => 20,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.traslado_total', false);

    expect((float) $response->json('data.cantidad'))->toBe(20.0);

    // Origen reducido: 50 - 20 = 30
    expect((float) $lote->fresh()->cantidad_actual)->toBe(30.0);

    // Nuevo lote creado en destino con 20
    $loteDestino = LoteMateriaPrima::where('bodega_id', $bodegaDestino->id)->first();
    expect($loteDestino)->not->toBeNull();
    expect((float) $loteDestino->cantidad_actual)->toBe(20.0);
});

// ── Test 4: Jefe puede realizar traslado total — RFINV04 ──────────────────────
test('test_jefe_puede_trasladar_total', function () {
    ['token' => $token] = crearUsuarioTraslado(Role::JEFE_PRODUCCION);
    $lote          = crearLoteEnPrincipal(30.0);
    $bodegaOrigen  = Bodega::where('tipo', 'principal')->first();
    $bodegaDestino = Bodega::where('tipo', 'produccion')->first();

    $this->withToken($token)
        ->postJson('/api/v1/inventario/traslados', [
            'materia_prima_id' => $lote->materia_prima_id,
            'bodega_origen_id' => $bodegaOrigen->id,
            'bodega_destino_id'=> $bodegaDestino->id,
            'cantidad'         => 30,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.traslado_total', true);

    // El lote original se mueve a la bodega destino
    expect($lote->fresh()->bodega_id)->toBe($bodegaDestino->id);
    expect((float) $lote->fresh()->cantidad_actual)->toBe(30.0);
});

// ── Test 5: Traslado genera movimientos SALIDA y ENTRADA — HU-027 ─────────────
test('test_traslado_genera_movimientos_inmutables', function () {
    ['token' => $token] = crearUsuarioTraslado(Role::ENCARGADO_INVENTARIOS);
    $lote          = crearLoteEnPrincipal(40.0);
    $bodegaOrigen  = Bodega::where('tipo', 'principal')->first();
    $bodegaDestino = Bodega::where('tipo', 'produccion')->first();

    $this->withToken($token)
        ->postJson('/api/v1/inventario/traslados', [
            'materia_prima_id' => $lote->materia_prima_id,
            'bodega_origen_id' => $bodegaOrigen->id,
            'bodega_destino_id'=> $bodegaDestino->id,
            'cantidad'         => 15,
        ])
        ->assertStatus(201);

    expect(MovimientoInventario::where('tipo', MovimientoInventario::TIPO_TRASLADO_SALIDA)->exists())->toBeTrue();
    expect(MovimientoInventario::where('tipo', MovimientoInventario::TIPO_TRASLADO_ENTRADA)->exists())->toBeTrue();
});

// ── Test 6: Stock insuficiente retorna 422 ────────────────────────────────────
test('test_traslado_con_cantidad_mayor_al_stock_retorna_422', function () {
    ['token' => $token] = crearUsuarioTraslado(Role::ENCARGADO_INVENTARIOS);
    $lote          = crearLoteEnPrincipal(10.0);
    $bodegaOrigen  = Bodega::where('tipo', 'principal')->first();
    $bodegaDestino = Bodega::where('tipo', 'produccion')->first();

    $this->withToken($token)
        ->postJson('/api/v1/inventario/traslados', [
            'materia_prima_id' => $lote->materia_prima_id,
            'bodega_origen_id' => $bodegaOrigen->id,
            'bodega_destino_id'=> $bodegaDestino->id,
            'cantidad'         => 50,
        ])
        ->assertStatus(422);
});

// ── Test 7: Bodega destino igual a origen retorna 422 ────────────────────────
test('test_traslado_misma_bodega_retorna_422', function () {
    ['token' => $token] = crearUsuarioTraslado(Role::ENCARGADO_INVENTARIOS);
    $lote        = crearLoteEnPrincipal(20.0);
    $bodegaOrigen = Bodega::where('tipo', 'principal')->first();

    $this->withToken($token)
        ->postJson('/api/v1/inventario/traslados', [
            'materia_prima_id' => $lote->materia_prima_id,
            'bodega_origen_id' => $bodegaOrigen->id,
            'bodega_destino_id'=> $bodegaOrigen->id,
            'cantidad'         => 10,
        ])
        ->assertStatus(422);
});

// ── Test 8: Traslado parcial hereda fecha_vencimiento del lote origen — RFINV03
test('test_traslado_parcial_hereda_fecha_vencimiento', function () {
    ['token' => $token] = crearUsuarioTraslado(Role::ENCARGADO_INVENTARIOS);
    $vencimiento   = now()->addMonths(3)->toDateString();
    $lote          = crearLoteEnPrincipal(30.0, $vencimiento);
    $bodegaOrigen  = Bodega::where('tipo', 'principal')->first();
    $bodegaDestino = Bodega::where('tipo', 'produccion')->first();

    $this->withToken($token)
        ->postJson('/api/v1/inventario/traslados', [
            'materia_prima_id' => $lote->materia_prima_id,
            'bodega_origen_id' => $bodegaOrigen->id,
            'bodega_destino_id'=> $bodegaDestino->id,
            'cantidad'         => 10,
        ])
        ->assertStatus(201);

    $loteDestino = LoteMateriaPrima::where('bodega_id', $bodegaDestino->id)->first();
    expect($loteDestino->fecha_vencimiento->toDateString())->toBe($vencimiento);
});

// ── Test 9: MP inexistente retorna 422 de validación ─────────────────────────
test('test_traslado_mp_inexistente_retorna_422', function () {
    ['token' => $token] = crearUsuarioTraslado(Role::ENCARGADO_INVENTARIOS);
    $bodegaOrigen  = Bodega::where('tipo', 'principal')->first();
    $bodegaDestino = Bodega::where('tipo', 'produccion')->first();

    $this->withToken($token)
        ->postJson('/api/v1/inventario/traslados', [
            'materia_prima_id' => 9999,
            'bodega_origen_id' => $bodegaOrigen->id,
            'bodega_destino_id'=> $bodegaDestino->id,
            'cantidad'         => 10,
        ])
        ->assertStatus(422);
});
