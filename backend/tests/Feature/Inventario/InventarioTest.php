<?php

use App\Models\Bodega;
use App\Models\LoteMateriaPrima;
use App\Models\MateriaPrima;
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

function crearUsuarioInv(string $rol): array
{
    $role = \App\Models\Role::where('nombre', $rol)->first();
    $user = \App\Models\User::factory()->create(['role_id' => $role->id, 'activo' => true]);
    return ['user' => $user, 'token' => $user->createToken('api-token')->plainTextToken];
}

function crearLoteMp(int $mpId, float $cantidad, ?string $fechaVencimiento = null, ?int $bodegaId = null): LoteMateriaPrima
{
    $orden     = OrdenPedido::create(['proveedor' => 'Test', 'estado' => 'cerrada']);
    $recepcion = Recepcion::create(['orden_pedido_id' => $orden->id]);
    $bodega    = $bodegaId ?? Bodega::where('tipo', 'principal')->first()->id;

    return LoteMateriaPrima::create([
        'recepcion_id'      => $recepcion->id,
        'materia_prima_id'  => $mpId,
        'bodega_id'         => $bodega,
        'cantidad_inicial'  => $cantidad,
        'cantidad_actual'   => $cantidad,
        'fecha_vencimiento' => $fechaVencimiento,
        'fecha_ingreso'     => now(),
    ]);
}

function crearMpInv(string $nombre, float $puntoReorden = 10.0): MateriaPrima
{
    return MateriaPrima::create([
        'nombre'           => $nombre,
        'unidad_medida_id' => UnidadMedida::where('nombre', 'kg')->first()->id,
        'punto_reorden'    => $puntoReorden,
        'activa'           => true,
    ]);
}

// ── Test 1: Encargado puede consultar stock de MP — RFINV01 ───────────────────
test('test_encargado_puede_consultar_stock_mp', function () {
    ['token' => $token] = crearUsuarioInv(Role::ENCARGADO_INVENTARIOS);
    $mp = crearMpInv('Harina de trigo');
    crearLoteMp($mp->id, 50.0);

    $response = $this->withToken($token)
        ->getJson('/api/v1/inventario/stock/mp')
        ->assertStatus(200)
        ->assertJson(['success' => true]);

    $data = $response->json('data');
    expect($data)->toHaveCount(1);
    expect($data[0]['nombre'])->toBe('Harina de trigo');
    expect((float) $data[0]['stock_total'])->toBe(50.0);
    expect($data[0]['bajo_reorden'])->toBeFalse();
});

// ── Test 2: Sin token retorna 401 ─────────────────────────────────────────────
test('test_sin_token_no_puede_consultar_stock', function () {
    $this->getJson('/api/v1/inventario/stock/mp')->assertStatus(401);
});

// ── Test 3: Jefe de producción puede consultar stock — HU-002 ─────────────────
test('test_jefe_puede_consultar_stock_mp', function () {
    ['token' => $token] = crearUsuarioInv(Role::JEFE_PRODUCCION);

    $this->withToken($token)
        ->getJson('/api/v1/inventario/stock/mp')
        ->assertStatus(200);
});

// ── Test 4: Administrador NO puede consultar stock — 403 — RNFSEC-04 ──────────
test('test_administrador_no_puede_consultar_stock', function () {
    ['token' => $token] = crearUsuarioInv(Role::ADMINISTRADOR);

    $this->withToken($token)
        ->getJson('/api/v1/inventario/stock/mp')
        ->assertStatus(403);
});

// ── Test 5: Stock desglosado por bodega ───────────────────────────────────────
test('test_stock_mp_muestra_desglose_por_bodega', function () {
    ['token' => $token] = crearUsuarioInv(Role::ENCARGADO_INVENTARIOS);
    $mp = crearMpInv('Azúcar');
    $bodegaPrincipal = Bodega::where('tipo', 'principal')->first();
    $bodegaPlanta    = Bodega::where('tipo', 'produccion')->first();

    crearLoteMp($mp->id, 30.0, null, $bodegaPrincipal->id);
    crearLoteMp($mp->id, 20.0, null, $bodegaPlanta->id);

    $response = $this->withToken($token)
        ->getJson('/api/v1/inventario/stock/mp')
        ->assertStatus(200);

    $mpData = collect($response->json('data'))->firstWhere('nombre', 'Azúcar');
    expect((float) $mpData['stock_total'])->toBe(50.0);
    expect($mpData['por_bodega'])->toHaveCount(2);
});

// ── Test 6: Consultar stock de una MP específica — RFINV01 ────────────────────
test('test_puede_consultar_stock_mp_especifica', function () {
    ['token' => $token] = crearUsuarioInv(Role::ENCARGADO_INVENTARIOS);
    $mp = crearMpInv('Sal');
    crearLoteMp($mp->id, 15.0);

    $this->withToken($token)
        ->getJson("/api/v1/inventario/stock/mp/{$mp->id}")
        ->assertStatus(200)
        ->assertJsonPath('data.nombre', 'Sal')
        ->assertJsonPath('data.stock_total', 15);
});

// ── Test 7: MP inexistente retorna 404 ────────────────────────────────────────
test('test_stock_mp_inexistente_retorna_404', function () {
    ['token' => $token] = crearUsuarioInv(Role::ENCARGADO_INVENTARIOS);

    $this->withToken($token)
        ->getJson('/api/v1/inventario/stock/mp/99999')
        ->assertStatus(404);
});

// ── Test 8: Alertas — MP bajo punto de reorden — RFINV01 ─────────────────────
test('test_alerta_mp_bajo_reorden', function () {
    ['token' => $token] = crearUsuarioInv(Role::ENCARGADO_INVENTARIOS);

    $mpBaja   = crearMpInv('Mantequilla', 20.0);  // punto_reorden = 20
    $mpOk     = crearMpInv('Harina', 10.0);        // punto_reorden = 10

    crearLoteMp($mpBaja->id, 5.0);   // 5 < 20 → alerta
    crearLoteMp($mpOk->id, 50.0);    // 50 > 10 → sin alerta

    $response = $this->withToken($token)
        ->getJson('/api/v1/inventario/alertas')
        ->assertStatus(200)
        ->assertJson(['success' => true]);

    $alertas = $response->json('data');
    expect($alertas)->toHaveCount(1);
    expect($alertas[0]['nombre'])->toBe('Mantequilla');
    expect($alertas[0]['bajo_reorden'])->toBeTrue();
    expect((float) $alertas[0]['faltante'])->toBe(15.0);
});

// ── Test 9: Sin stock activo la MP no aparece en alertas pero sí con stock=0 ──
test('test_mp_sin_stock_aparece_en_alertas', function () {
    ['token' => $token] = crearUsuarioInv(Role::ENCARGADO_INVENTARIOS);
    crearMpInv('Levadura', 5.0);  // sin lotes → stock = 0 < 5

    $response = $this->withToken($token)
        ->getJson('/api/v1/inventario/alertas')
        ->assertStatus(200);

    expect($response->json('data'))->toHaveCount(1);
});

// ── Test 10: Stock no incluye lotes con cantidad_actual = 0 ──────────────────
test('test_stock_no_incluye_lotes_agotados', function () {
    ['token' => $token] = crearUsuarioInv(Role::ENCARGADO_INVENTARIOS);
    $mp   = crearMpInv('Cacao', 5.0);
    $lote = crearLoteMp($mp->id, 10.0);
    $lote->update(['cantidad_actual' => 0]); // simular lote agotado

    $response = $this->withToken($token)
        ->getJson("/api/v1/inventario/stock/mp/{$mp->id}")
        ->assertStatus(200);

    expect((float) $response->json('data.stock_total'))->toBe(0.0);
    expect($response->json('data.por_bodega'))->toHaveCount(0);
});
