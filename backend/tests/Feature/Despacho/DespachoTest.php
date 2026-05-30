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

function crearUsuarioDespacho(string $rol): array
{
    $role = Role::where('nombre', $rol)->first();
    $user = \App\Models\User::factory()->create(['role_id' => $role->id, 'activo' => true]);
    return ['user' => $user, 'token' => $user->createToken('api-token')->plainTextToken];
}

/**
 * Crea una OrdenProduccion mínima para satisfacer la FK NOT NULL de lotes_producto_terminado.
 */
function crearOrdenProduccionStub(int $ptId): OrdenProduccion
{
    return OrdenProduccion::create([
        'producto_terminado_id' => $ptId,
        'cantidad_planificada'  => 10,
        'estado'                => 'completada',
        'fecha_planificada'     => now()->toDateString(),
    ]);
}

/**
 * Crea un lote de PT directamente en la bodega de ventas (simula ciclo completo ya ejecutado).
 * Permite testear el despacho sin depender del módulo de producción.
 */
function crearLotePtEnVentas(float $cantidad = 10.0): LoteProductoTerminado
{
    $unidadUnd    = UnidadMedida::where('nombre', 'unidad')->first();
    $pt           = ProductoTerminado::create(['nombre' => 'Pan Test ' . uniqid(), 'unidad_medida_id' => $unidadUnd->id, 'activo' => true]);
    $orden        = crearOrdenProduccionStub($pt->id);
    $bodegaVentas = Bodega::where('tipo', 'ventas')->first();

    return LoteProductoTerminado::create([
        'orden_produccion_id'   => $orden->id,
        'producto_terminado_id' => $pt->id,
        'bodega_id'             => $bodegaVentas->id,
        'cantidad_inicial'      => $cantidad,
        'cantidad_actual'       => $cantidad,
        'fecha_produccion'      => now()->toDateString(),
    ]);
}

/**
 * Crea un lote de PT en bodega de producción (NO disponible para despacho aún).
 */
function crearLotePtEnProduccion(float $cantidad = 10.0): LoteProductoTerminado
{
    $unidadUnd    = UnidadMedida::where('nombre', 'unidad')->first();
    $pt           = ProductoTerminado::create(['nombre' => 'Pan Planta ' . uniqid(), 'unidad_medida_id' => $unidadUnd->id, 'activo' => true]);
    $orden        = crearOrdenProduccionStub($pt->id);
    $bodegaPlanta = Bodega::where('tipo', 'produccion')->first();

    return LoteProductoTerminado::create([
        'orden_produccion_id'   => $orden->id,
        'producto_terminado_id' => $pt->id,
        'bodega_id'             => $bodegaPlanta->id,
        'cantidad_inicial'      => $cantidad,
        'cantidad_actual'       => $cantidad,
        'fecha_produccion'      => now()->toDateString(),
    ]);
}

// ── Test 1: Encargado puede registrar un despacho — RFPROD03 ─────────────────
test('test_encargado_puede_registrar_despacho', function () {
    ['token' => $token] = crearUsuarioDespacho(Role::ENCARGADO_INVENTARIOS);
    $lote = crearLotePtEnVentas(10.0);

    $this->withToken($token)
        ->postJson('/api/v1/despachos', [
            'lote_pt_id'         => $lote->id,
            'cantidad'           => 4,
            'referencia_cliente' => 'Tienda Centro',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.cantidad', '4.000')
        ->assertJsonPath('data.referencia_cliente', 'Tienda Centro');
});

// ── Test 2: Sin token retorna 401 ─────────────────────────────────────────────
test('test_sin_token_no_puede_despachar', function () {
    $this->postJson('/api/v1/despachos', [])->assertStatus(401);
});

// ── Test 3: Gerencia NO puede crear despacho (solo lee) — RNFSEC-04 ──────────
test('test_gerencia_no_puede_crear_despacho', function () {
    ['token' => $token] = crearUsuarioDespacho(Role::GERENCIA);
    $lote = crearLotePtEnVentas(10.0);

    $this->withToken($token)
        ->postJson('/api/v1/despachos', [
            'lote_pt_id' => $lote->id,
            'cantidad'   => 4,
        ])
        ->assertStatus(403);
});

// ── Test 4: Despacho descuenta stock del lote PT — RFPROD03 ──────────────────
test('test_despacho_descuenta_stock_del_lote_pt', function () {
    ['token' => $token] = crearUsuarioDespacho(Role::ENCARGADO_INVENTARIOS);
    $lote = crearLotePtEnVentas(10.0);

    $this->withToken($token)
        ->postJson('/api/v1/despachos', ['lote_pt_id' => $lote->id, 'cantidad' => 4])
        ->assertStatus(201);

    // Stock debe haber bajado: 10 - 4 = 6
    expect((float) $lote->fresh()->cantidad_actual)->toBe(6.0);
});

// ── Test 5: Despacho genera movimiento DESPACHO_SALIDA — HU-027 ──────────────
test('test_despacho_genera_movimiento_inmutable', function () {
    ['token' => $token] = crearUsuarioDespacho(Role::ENCARGADO_INVENTARIOS);
    $lote = crearLotePtEnVentas(10.0);

    $this->withToken($token)
        ->postJson('/api/v1/despachos', ['lote_pt_id' => $lote->id, 'cantidad' => 3])
        ->assertStatus(201);

    expect(MovimientoInventario::where('tipo', MovimientoInventario::TIPO_DESPACHO_SALIDA)->exists())->toBeTrue();
});

// ── Test 6: No se puede despachar desde bodega que no sea ventas — RFPROD03 ──
test('test_no_puede_despachar_lote_en_bodega_produccion', function () {
    ['token' => $token] = crearUsuarioDespacho(Role::ENCARGADO_INVENTARIOS);
    $lote = crearLotePtEnProduccion(10.0);

    $this->withToken($token)
        ->postJson('/api/v1/despachos', ['lote_pt_id' => $lote->id, 'cantidad' => 5])
        ->assertStatus(422);
});

// ── Test 7: Stock insuficiente retorna 422 ────────────────────────────────────
test('test_despacho_con_cantidad_mayor_al_stock_retorna_422', function () {
    ['token' => $token] = crearUsuarioDespacho(Role::ENCARGADO_INVENTARIOS);
    $lote = crearLotePtEnVentas(5.0);

    $this->withToken($token)
        ->postJson('/api/v1/despachos', ['lote_pt_id' => $lote->id, 'cantidad' => 10])
        ->assertStatus(422);
});

// ── Test 8: Despachos múltiples reducen el stock acumulativamente ─────────────
test('test_multiples_despachos_del_mismo_lote', function () {
    ['token' => $token] = crearUsuarioDespacho(Role::ENCARGADO_INVENTARIOS);
    $lote = crearLotePtEnVentas(12.0);

    $this->withToken($token)
        ->postJson('/api/v1/despachos', ['lote_pt_id' => $lote->id, 'cantidad' => 5])
        ->assertStatus(201);
    auth()->forgetGuards();

    $this->withToken($token)
        ->postJson('/api/v1/despachos', ['lote_pt_id' => $lote->id, 'cantidad' => 4])
        ->assertStatus(201);

    // 12 - 5 - 4 = 3
    expect((float) $lote->fresh()->cantidad_actual)->toBe(3.0);
    expect(Despacho::where('lote_pt_id', $lote->id)->count())->toBe(2);
});

// ── Test 9: Listar despachos retorna 200 ─────────────────────────────────────
test('test_encargado_puede_listar_despachos', function () {
    ['token' => $token] = crearUsuarioDespacho(Role::ENCARGADO_INVENTARIOS);

    $this->withToken($token)
        ->getJson('/api/v1/despachos')
        ->assertStatus(200)
        ->assertJsonStructure(['success', 'data']);
});

// ── Test 10: Ver despacho por ID con trazabilidad — HU-027 ───────────────────
test('test_ver_despacho_incluye_datos_de_lote_y_producto', function () {
    ['token' => $token] = crearUsuarioDespacho(Role::ENCARGADO_INVENTARIOS);
    $lote = crearLotePtEnVentas(10.0);

    $r = $this->withToken($token)
        ->postJson('/api/v1/despachos', [
            'lote_pt_id'         => $lote->id,
            'cantidad'           => 2,
            'referencia_cliente' => 'Cliente ABC',
        ])
        ->assertStatus(201);

    $id = $r->json('data.id');
    auth()->forgetGuards();

    $this->withToken($token)
        ->getJson("/api/v1/despachos/{$id}")
        ->assertStatus(200)
        ->assertJsonPath('data.referencia_cliente', 'Cliente ABC')
        ->assertJsonStructure(['data' => ['id', 'cantidad', 'lote_pt', 'usuario', 'despachado_en']]);
});
