<?php

use App\Models\Role;
use App\Models\UnidadMedida;
use App\Models\MateriaPrima;
use App\Models\ProductoTerminado;
use App\Models\Bodega;
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

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
function crearUsuarioCatalogo(string $rol): array
{
    $role = Role::where('nombre', $rol)->first();
    $user = \App\Models\User::factory()->create([
        'role_id' => $role->id,
        'activo'  => true,
    ]);
    return ['user' => $user, 'token' => $user->createToken('api-token')->plainTextToken];
}

function unidadKg(): UnidadMedida
{
    return UnidadMedida::where('nombre', 'kg')->first();
}

function crearMp(string $nombre = 'Harina de trigo'): MateriaPrima
{
    return MateriaPrima::create([
        'nombre'           => $nombre,
        'unidad_medida_id' => unidadKg()->id,
        'punto_reorden'    => 10,
        'activa'           => true,
    ]);
}

function crearPt(string $nombre = 'Torta de chocolate'): ProductoTerminado
{
    return ProductoTerminado::create([
        'nombre'           => $nombre,
        'unidad_medida_id' => UnidadMedida::where('nombre', 'unidad')->first()->id,
        'activo'           => true,
    ]);
}

// -----------------------------------------------------------------------
// Test 1: Encargado puede listar materias primas — HU-004
// -----------------------------------------------------------------------
test('test_encargado_puede_listar_materias_primas', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::ENCARGADO_INVENTARIOS);
    crearMp();

    $this->withToken($token)
        ->getJson('/api/v1/materias-primas')
        ->assertStatus(200)
        ->assertJson(['success' => true])
        ->assertJsonCount(1, 'data');
});

// -----------------------------------------------------------------------
// Test 2: Sin token no puede listar materias primas — 401
// -----------------------------------------------------------------------
test('test_sin_token_no_puede_listar_materias_primas', function () {
    $this->getJson('/api/v1/materias-primas')->assertStatus(401);
});

// -----------------------------------------------------------------------
// Test 3: Encargado puede crear materia prima — HU-004
// -----------------------------------------------------------------------
test('test_encargado_puede_crear_materia_prima', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::ENCARGADO_INVENTARIOS);

    $this->withToken($token)
        ->postJson('/api/v1/materias-primas', [
            'nombre'           => 'Azúcar blanca',
            'unidad_medida_id' => unidadKg()->id,
            'punto_reorden'    => 5,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.nombre', 'Azúcar blanca');
});

// -----------------------------------------------------------------------
// Test 4: Gerencia puede crear materia prima — HU-004
// -----------------------------------------------------------------------
test('test_gerencia_puede_crear_materia_prima', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::GERENCIA);

    $this->withToken($token)
        ->postJson('/api/v1/materias-primas', [
            'nombre'           => 'Mantequilla',
            'unidad_medida_id' => unidadKg()->id,
            'punto_reorden'    => 2,
        ])
        ->assertStatus(201);
});

// -----------------------------------------------------------------------
// Test 5: Jefe de producción NO puede crear materias primas — RNFSEC-04
// -----------------------------------------------------------------------
test('test_jefe_produccion_no_puede_crear_materia_prima', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::JEFE_PRODUCCION);

    $this->withToken($token)
        ->postJson('/api/v1/materias-primas', [
            'nombre'           => 'Leche',
            'unidad_medida_id' => unidadKg()->id,
        ])
        ->assertStatus(403);
});

// -----------------------------------------------------------------------
// Test 6: No se puede crear MP con nombre duplicado — validación
// -----------------------------------------------------------------------
test('test_no_se_puede_crear_mp_con_nombre_duplicado', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::ENCARGADO_INVENTARIOS);
    crearMp('Sal');

    $this->withToken($token)
        ->postJson('/api/v1/materias-primas', [
            'nombre'           => 'Sal',
            'unidad_medida_id' => unidadKg()->id,
        ])
        ->assertStatus(422);
});

// -----------------------------------------------------------------------
// Test 7: Actualizar materia prima — HU-005
// -----------------------------------------------------------------------
test('test_encargado_puede_actualizar_materia_prima', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::ENCARGADO_INVENTARIOS);
    $mp = crearMp();

    $this->withToken($token)
        ->patchJson("/api/v1/materias-primas/{$mp->id}", ['punto_reorden' => 25])
        ->assertStatus(200)
        ->assertJsonPath('data.punto_reorden', '25.000');
});

// -----------------------------------------------------------------------
// Test 8: Desactivar materia prima — eliminación lógica
// -----------------------------------------------------------------------
test('test_encargado_puede_desactivar_materia_prima', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::ENCARGADO_INVENTARIOS);
    $mp = crearMp();

    $this->withToken($token)
        ->deleteJson("/api/v1/materias-primas/{$mp->id}")
        ->assertStatus(200)
        ->assertJsonPath('data.activa', false);

    expect(MateriaPrima::find($mp->id)->activa)->toBeFalse(); // Sigue en BD
});

// -----------------------------------------------------------------------
// Test 9: Crear producto terminado — HU-006
// -----------------------------------------------------------------------
test('test_encargado_puede_crear_producto_terminado', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::ENCARGADO_INVENTARIOS);
    $unidad = UnidadMedida::where('nombre', 'unidad')->first();

    $this->withToken($token)
        ->postJson('/api/v1/productos-terminados', [
            'nombre'           => 'Torta de vainilla',
            'unidad_medida_id' => $unidad->id,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.nombre', 'Torta de vainilla');
});

// -----------------------------------------------------------------------
// Test 10: Asociar MP a PT — HU-006
// -----------------------------------------------------------------------
test('test_encargado_puede_asociar_mp_a_pt', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::ENCARGADO_INVENTARIOS);
    $mp = crearMp();
    $pt = crearPt();
    $unidad = unidadKg();

    $this->withToken($token)
        ->postJson("/api/v1/productos-terminados/{$pt->id}/materias-primas", [
            'materia_prima_id'   => $mp->id,
            'cantidad_requerida' => 0.5,
            'unidad_medida_id'   => $unidad->id,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.materia_prima_id', $mp->id);
});

// -----------------------------------------------------------------------
// Test 11: No se puede asociar la misma MP dos veces al mismo PT — 409
// -----------------------------------------------------------------------
test('test_no_se_puede_asociar_mp_duplicada_a_pt', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::ENCARGADO_INVENTARIOS);
    $mp = crearMp();
    $pt = crearPt();
    $unidad = unidadKg();

    $payload = ['materia_prima_id' => $mp->id, 'cantidad_requerida' => 0.5, 'unidad_medida_id' => $unidad->id];

    $this->withToken($token)->postJson("/api/v1/productos-terminados/{$pt->id}/materias-primas", $payload)->assertStatus(201);
    $this->withToken($token)->postJson("/api/v1/productos-terminados/{$pt->id}/materias-primas", $payload)->assertStatus(409);
});

// -----------------------------------------------------------------------
// Test 12: Desasociar MP de PT
// -----------------------------------------------------------------------
test('test_encargado_puede_desasociar_mp_de_pt', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::ENCARGADO_INVENTARIOS);
    $mp = crearMp();
    $pt = crearPt();
    $unidad = unidadKg();

    $this->withToken($token)
        ->postJson("/api/v1/productos-terminados/{$pt->id}/materias-primas", [
            'materia_prima_id' => $mp->id, 'cantidad_requerida' => 0.5, 'unidad_medida_id' => $unidad->id,
        ])->assertStatus(201);

    $this->withToken($token)
        ->deleteJson("/api/v1/productos-terminados/{$pt->id}/materias-primas/{$mp->id}")
        ->assertStatus(200);

    expect(\App\Models\RelacionMpPt::where('producto_terminado_id', $pt->id)->count())->toBe(0);
});

// -----------------------------------------------------------------------
// Test 13: Listar bodegas — seeder crea 2 bodegas
// -----------------------------------------------------------------------
test('test_encargado_puede_listar_bodegas', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::ENCARGADO_INVENTARIOS);

    $this->withToken($token)
        ->getJson('/api/v1/bodegas')
        ->assertStatus(200)
        ->assertJsonCount(3, 'data'); // Bodega Principal + Planta de Producción + Área de Ventas
});

// -----------------------------------------------------------------------
// Test 14: Jefe de producción puede listar bodegas — solo lectura OK
// -----------------------------------------------------------------------
test('test_jefe_produccion_puede_listar_bodegas', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::JEFE_PRODUCCION);

    $this->withToken($token)
        ->getJson('/api/v1/bodegas')
        ->assertStatus(200);
});

// -----------------------------------------------------------------------
// Test 15: Jefe de producción NO puede crear bodega — RNFSEC-04
// -----------------------------------------------------------------------
test('test_jefe_produccion_no_puede_crear_bodega', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::JEFE_PRODUCCION);

    $this->withToken($token)
        ->postJson('/api/v1/bodegas', ['nombre' => 'Nueva Bodega', 'tipo' => 'otro'])
        ->assertStatus(403);
});

// -----------------------------------------------------------------------
// Test 16: Crear presentación para un producto — HU-007
// -----------------------------------------------------------------------
test('test_encargado_puede_crear_presentacion_para_producto', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::ENCARGADO_INVENTARIOS);
    $pt = crearPt();

    $this->withToken($token)
        ->postJson("/api/v1/productos-terminados/{$pt->id}/presentaciones", [
            'nombre'                    => 'Caja x12',
            'unidades_por_presentacion' => 12,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.nombre', 'Caja x12');
});

// -----------------------------------------------------------------------
// Test 17: Listar unidades de medida — accesible para todos los roles
// -----------------------------------------------------------------------
test('test_todos_los_roles_pueden_listar_unidades_medida', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::JEFE_PRODUCCION);

    $this->withToken($token)
        ->getJson('/api/v1/unidades-medida')
        ->assertStatus(200)
        ->assertJson(['success' => true]);
});

// -----------------------------------------------------------------------
// Test 18: Materia prima inexistente retorna 404
// -----------------------------------------------------------------------
test('test_materia_prima_inexistente_retorna_404', function () {
    ['token' => $token] = crearUsuarioCatalogo(Role::ENCARGADO_INVENTARIOS);

    $this->withToken($token)
        ->getJson('/api/v1/materias-primas/99999')
        ->assertStatus(404);
});
