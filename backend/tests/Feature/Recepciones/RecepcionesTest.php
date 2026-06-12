<?php

use App\Models\Bodega;
use App\Models\MateriaPrima;
use App\Models\LoteMateriaPrima;
use App\Models\MovimientoInventario;
use App\Models\OrdenPedido;
use App\Models\Role;
use App\Models\UnidadMedida;
use App\Models\User;
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function crearUsuarioRec(string $rol): array
{
    $role = Role::where('nombre', $rol)->first();
    $user = User::factory()->create(['role_id' => $role->id, 'activo' => true]);
    return ['user' => $user, 'token' => $user->createToken('api-token')->plainTextToken];
}

function crearMpRec(string $nombre = 'Harina de trigo'): MateriaPrima
{
    return MateriaPrima::create([
        'nombre'           => $nombre,
        'unidad_medida_id' => UnidadMedida::where('nombre', 'kg')->first()->id,
        'punto_reorden'    => 10,
        'activa'           => true,
    ]);
}

function crearOrden(string $proveedor = 'Harinera del Valle'): OrdenPedido
{
    return OrdenPedido::create([
        'proveedor'      => $proveedor,
        'estado'         => 'pendiente',
        'fecha_esperada' => now()->addDays(3)->toDateString(),
    ]);
}

// ── Test 1: Encargado puede listar órdenes de pedido — RFREC ─────────────────
test('test_encargado_puede_listar_ordenes_pedido', function () {
    ['token' => $token] = crearUsuarioRec(Role::ENCARGADO_INVENTARIOS);
    crearOrden();

    $this->withToken($token)
        ->getJson('/api/v1/recepciones/ordenes')
        ->assertStatus(200)
        ->assertJson(['success' => true])
        ->assertJsonCount(1, 'data');
});

// ── Test 2: Sin token no puede listar órdenes — 401 ──────────────────────────
test('test_sin_token_no_puede_listar_ordenes', function () {
    $this->getJson('/api/v1/recepciones/ordenes')->assertStatus(401);
});

// ── Test 3: Jefe de producción SÍ puede listar órdenes (solo lectura) — RNFSEC-04 ──
test('test_jefe_puede_listar_ordenes_solo_lectura', function () {
    ['token' => $token] = crearUsuarioRec(Role::JEFE_PRODUCCION);

    $this->withToken($token)
        ->getJson('/api/v1/recepciones/ordenes')
        ->assertStatus(200);
});

// ── Test 3b: Jefe NO puede crear órdenes de pedido — 403 — RNFSEC-04 ─────────
test('test_jefe_no_puede_crear_orden_pedido', function () {
    ['token' => $token] = crearUsuarioRec(Role::JEFE_PRODUCCION);

    $this->withToken($token)
        ->postJson('/api/v1/recepciones/ordenes', ['proveedor' => 'Proveedor X'])
        ->assertStatus(403);
});

// ── Test 4: Encargado puede crear una orden de pedido — RFREC ────────────────
test('test_encargado_puede_crear_orden_pedido', function () {
    ['token' => $token] = crearUsuarioRec(Role::ENCARGADO_INVENTARIOS);

    $this->withToken($token)
        ->postJson('/api/v1/recepciones/ordenes', [
            'proveedor'      => 'Harinera del Valle',
            'fecha_esperada' => now()->addDays(5)->toDateString(),
            'observaciones'  => 'Pedido urgente',
        ])
        ->assertStatus(201)
        ->assertJson(['success' => true])
        ->assertJsonPath('data.estado', 'pendiente')
        ->assertJsonPath('data.proveedor', 'Harinera del Valle');
});

// ── Test 5: Crear orden sin proveedor retorna 422 ────────────────────────────
test('test_crear_orden_sin_proveedor_retorna_422', function () {
    ['token' => $token] = crearUsuarioRec(Role::ENCARGADO_INVENTARIOS);

    $this->withToken($token)
        ->postJson('/api/v1/recepciones/ordenes', [])
        ->assertStatus(422);
});

// ── Test 6: Ver orden inexistente retorna 404 ─────────────────────────────────
test('test_ver_orden_inexistente_retorna_404', function () {
    ['token' => $token] = crearUsuarioRec(Role::ENCARGADO_INVENTARIOS);

    $this->withToken($token)
        ->getJson('/api/v1/recepciones/ordenes/99999')
        ->assertStatus(404);
});

// ── Test 7: Encargado puede cerrar una orden — RFREC ─────────────────────────
test('test_encargado_puede_cerrar_orden', function () {
    ['token' => $token] = crearUsuarioRec(Role::ENCARGADO_INVENTARIOS);
    $orden = crearOrden();

    $this->withToken($token)
        ->patchJson("/api/v1/recepciones/ordenes/{$orden->id}", ['estado' => 'cerrada'])
        ->assertStatus(200)
        ->assertJsonPath('data.estado', 'cerrada');
});

// ── Test 8: Registrar recepción crea lote y movimiento — RFREC + RFINV02 ─────
test('test_registrar_recepcion_crea_lote_y_movimiento', function () {
    ['token' => $token] = crearUsuarioRec(Role::ENCARGADO_INVENTARIOS);
    $orden = crearOrden();
    $mp    = crearMpRec();
    $bodega = Bodega::where('tipo', 'principal')->first();

    $this->withToken($token)
        ->postJson("/api/v1/recepciones/ordenes/{$orden->id}/recepciones", [
            'observaciones' => 'Llegó en buen estado',
            'items' => [
                [
                    'materia_prima_id'  => $mp->id,
                    'cantidad'          => 50.0,
                    'fecha_vencimiento' => now()->addMonths(6)->toDateString(),
                ],
            ],
        ])
        ->assertStatus(201)
        ->assertJson(['success' => true]);

    // Se creó el lote en Bodega Principal
    expect(LoteMateriaPrima::where('materia_prima_id', $mp->id)->count())->toBe(1);
    $lote = LoteMateriaPrima::where('materia_prima_id', $mp->id)->first();
    expect((float) $lote->cantidad_actual)->toBe(50.0);
    expect($lote->bodega_id)->toBe($bodega->id);

    // Se creó el movimiento RECEPCION_ENTRADA
    expect(
        MovimientoInventario::where('tipo', MovimientoInventario::TIPO_RECEPCION_ENTRADA)
            ->where('entidad_id', $lote->id)
            ->exists()
    )->toBeTrue();
});

// ── Test 9: La orden pasa a 'en_recepcion' al registrar la primera recepción ──
test('test_orden_pasa_a_en_recepcion_tras_primera_recepcion', function () {
    ['token' => $token] = crearUsuarioRec(Role::ENCARGADO_INVENTARIOS);
    $orden = crearOrden();
    $mp    = crearMpRec();

    $this->withToken($token)
        ->postJson("/api/v1/recepciones/ordenes/{$orden->id}/recepciones", [
            'items' => [['materia_prima_id' => $mp->id, 'cantidad' => 10.0]],
        ])
        ->assertStatus(201);

    expect($orden->fresh()->estado)->toBe('en_recepcion');
});

// ── Test 10: No se puede recepcionar una orden cerrada — RFREC ───────────────
test('test_no_se_puede_recepcionar_orden_cerrada', function () {
    ['token' => $token] = crearUsuarioRec(Role::ENCARGADO_INVENTARIOS);
    $orden = crearOrden();
    $orden->update(['estado' => 'cerrada']);
    $mp = crearMpRec();

    $this->withToken($token)
        ->postJson("/api/v1/recepciones/ordenes/{$orden->id}/recepciones", [
            'items' => [['materia_prima_id' => $mp->id, 'cantidad' => 10.0]],
        ])
        ->assertStatus(422);
});

// ── Test 11: No se puede recepcionar una orden anulada — RFREC ───────────────
test('test_no_se_puede_recepcionar_orden_anulada', function () {
    ['token' => $token] = crearUsuarioRec(Role::ENCARGADO_INVENTARIOS);
    $orden = crearOrden();
    $orden->update(['estado' => 'anulada']);
    $mp = crearMpRec();

    $this->withToken($token)
        ->postJson("/api/v1/recepciones/ordenes/{$orden->id}/recepciones", [
            'items' => [['materia_prima_id' => $mp->id, 'cantidad' => 10.0]],
        ])
        ->assertStatus(422);
});

// ── Test 12: Recepción con MP inexistente retorna 422 ────────────────────────
test('test_recepcion_con_mp_inexistente_retorna_422', function () {
    ['token' => $token] = crearUsuarioRec(Role::ENCARGADO_INVENTARIOS);
    $orden = crearOrden();

    $this->withToken($token)
        ->postJson("/api/v1/recepciones/ordenes/{$orden->id}/recepciones", [
            'items' => [['materia_prima_id' => 99999, 'cantidad' => 10.0]],
        ])
        ->assertStatus(422);
});

// ── Test 13: Recepción con cantidad 0 retorna 422 ────────────────────────────
test('test_recepcion_con_cantidad_cero_retorna_422', function () {
    ['token' => $token] = crearUsuarioRec(Role::ENCARGADO_INVENTARIOS);
    $orden = crearOrden();
    $mp    = crearMpRec();

    $this->withToken($token)
        ->postJson("/api/v1/recepciones/ordenes/{$orden->id}/recepciones", [
            'items' => [['materia_prima_id' => $mp->id, 'cantidad' => 0]],
        ])
        ->assertStatus(422);
});

// ── Test 14: Encargado puede listar recepciones — RFREC ──────────────────────
test('test_encargado_puede_listar_recepciones', function () {
    ['user' => $user, 'token' => $token] = crearUsuarioRec(Role::ENCARGADO_INVENTARIOS);
    $orden = crearOrden();
    $mp    = crearMpRec();

    // Registrar una recepción primero
    $this->withToken($token)
        ->postJson("/api/v1/recepciones/ordenes/{$orden->id}/recepciones", [
            'items' => [['materia_prima_id' => $mp->id, 'cantidad' => 5.0]],
        ])->assertStatus(201);

    auth()->forgetGuards();

    $this->withToken($token)
        ->getJson('/api/v1/recepciones')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data');
});

// ── Test 15: Gerencia puede listar órdenes — solo lectura — RNFSEC-04 ────────
test('test_gerencia_puede_listar_ordenes', function () {
    ['token' => $token] = crearUsuarioRec(Role::GERENCIA);
    crearOrden();

    $this->withToken($token)
        ->getJson('/api/v1/recepciones/ordenes')
        ->assertStatus(200);
});
