<?php

use App\Models\BitacoraAcceso;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function crearUsuarioBitacora(string $rol): array
{
    $role = Role::where('nombre', $rol)->first();
    $user = User::factory()->create(['role_id' => $role->id, 'activo' => true]);
    return ['user' => $user, 'token' => $user->createToken('api-token')->plainTextToken];
}

function crearRegistrosBitacora(int $userId = null, string $accion = BitacoraAcceso::ACCION_LOGIN_EXITOSO, int $cantidad = 3): void
{
    for ($i = 0; $i < $cantidad; $i++) {
        BitacoraAcceso::create([
            'user_id'    => $userId,
            'accion'     => $accion,
            'ip_address' => '127.0.0.' . ($i + 1),
            'user_agent' => 'TestAgent/1.0',
        ]);
    }
}

// ── Test 1: Sin token retorna 401 ─────────────────────────────────────────────
test('test_sin_token_no_puede_ver_bitacora', function () {
    $this->getJson('/api/v1/bitacora')->assertStatus(401);
});

// ── Test 2: Rol no administrador recibe 403 — RNFSEC ─────────────────────────
test('test_gerencia_no_puede_ver_bitacora', function () {
    ['token' => $token] = crearUsuarioBitacora(Role::GERENCIA);

    $this->withToken($token)
        ->getJson('/api/v1/bitacora')
        ->assertStatus(403);
});

test('test_jefe_produccion_no_puede_ver_bitacora', function () {
    ['token' => $token] = crearUsuarioBitacora(Role::JEFE_PRODUCCION);

    $this->withToken($token)
        ->getJson('/api/v1/bitacora')
        ->assertStatus(403);
});

test('test_encargado_no_puede_ver_bitacora', function () {
    ['token' => $token] = crearUsuarioBitacora(Role::ENCARGADO_INVENTARIOS);

    $this->withToken($token)
        ->getJson('/api/v1/bitacora')
        ->assertStatus(403);
});

// ── Test 3: Administrador puede listar la bitácora ────────────────────────────
test('test_admin_puede_listar_bitacora', function () {
    ['token' => $token, 'user' => $admin] = crearUsuarioBitacora(Role::ADMINISTRADOR);
    crearRegistrosBitacora($admin->id, BitacoraAcceso::ACCION_LOGIN_EXITOSO, 5);

    $response = $this->withToken($token)
        ->getJson('/api/v1/bitacora')
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonStructure([
            'data' => [
                'data' => [['id', 'accion', 'ip_address', 'created_at', 'usuario']],
                'pagination' => ['total', 'por_pagina', 'pagina_actual', 'ultima_pagina'],
            ],
        ]);

    expect($response->json('data.pagination.total'))->toBeGreaterThanOrEqual(5);
});

// ── Test 4: Filtrar por accion ────────────────────────────────────────────────
test('test_admin_puede_filtrar_bitacora_por_accion', function () {
    ['token' => $token, 'user' => $admin] = crearUsuarioBitacora(Role::ADMINISTRADOR);
    crearRegistrosBitacora($admin->id, BitacoraAcceso::ACCION_LOGIN_EXITOSO, 3);
    crearRegistrosBitacora($admin->id, BitacoraAcceso::ACCION_LOGIN_FALLIDO, 2);

    $response = $this->withToken($token)
        ->getJson('/api/v1/bitacora?accion=' . BitacoraAcceso::ACCION_LOGIN_FALLIDO)
        ->assertStatus(200);

    $items = $response->json('data.data');
    foreach ($items as $item) {
        expect($item['accion'])->toBe(BitacoraAcceso::ACCION_LOGIN_FALLIDO);
    }
    expect($response->json('data.pagination.total'))->toBe(2);
});

// ── Test 5: Filtrar por user_id ───────────────────────────────────────────────
test('test_admin_puede_filtrar_bitacora_por_user_id', function () {
    ['token' => $token, 'user' => $admin] = crearUsuarioBitacora(Role::ADMINISTRADOR);
    $otroRole = Role::where('nombre', Role::GERENCIA)->first();
    $otroUser = User::factory()->create(['role_id' => $otroRole->id]);

    crearRegistrosBitacora($admin->id, BitacoraAcceso::ACCION_LOGIN_EXITOSO, 3);
    crearRegistrosBitacora($otroUser->id, BitacoraAcceso::ACCION_LOGIN_EXITOSO, 2);

    $response = $this->withToken($token)
        ->getJson('/api/v1/bitacora?user_id=' . $admin->id)
        ->assertStatus(200);

    expect($response->json('data.pagination.total'))->toBe(3);

    $items = $response->json('data.data');
    foreach ($items as $item) {
        expect($item['usuario']['id'])->toBe($admin->id);
    }
});

// ── Test 6: Filtrar por rango de fechas ───────────────────────────────────────
test('test_admin_puede_filtrar_bitacora_por_fechas', function () {
    ['token' => $token, 'user' => $admin] = crearUsuarioBitacora(Role::ADMINISTRADOR);

    // Registro antiguo: DB::table para controlar created_at (no en $fillable del modelo)
    \Illuminate\Support\Facades\DB::table('bitacora_accesos')->insert([
        'user_id'    => $admin->id,
        'accion'     => BitacoraAcceso::ACCION_LOGIN_EXITOSO,
        'ip_address' => '10.0.0.1',
        'created_at' => now()->subDays(10)->toDateTimeString(),
    ]);
    // Registro reciente
    crearRegistrosBitacora($admin->id, BitacoraAcceso::ACCION_LOGIN_EXITOSO, 2);

    $desde = now()->subDays(1)->toDateString();
    $hasta = now()->toDateString();

    $response = $this->withToken($token)
        ->getJson("/api/v1/bitacora?desde={$desde}&hasta={$hasta}")
        ->assertStatus(200);

    expect($response->json('data.pagination.total'))->toBe(2);
});

// ── Test 7: Respuesta vacía cuando no hay registros ───────────────────────────
test('test_bitacora_vacia_retorna_coleccion_vacia', function () {
    ['token' => $token] = crearUsuarioBitacora(Role::ADMINISTRADOR);

    $response = $this->withToken($token)
        ->getJson('/api/v1/bitacora')
        ->assertStatus(200);

    expect($response->json('data.pagination.total'))->toBe(0);
    expect($response->json('data.data'))->toBeArray()->toHaveCount(0);
});

// ── Test 8: Paginación respeta por_pagina ────────────────────────────────────
test('test_bitacora_paginacion_respeta_por_pagina', function () {
    ['token' => $token, 'user' => $admin] = crearUsuarioBitacora(Role::ADMINISTRADOR);
    crearRegistrosBitacora($admin->id, BitacoraAcceso::ACCION_LOGIN_EXITOSO, 10);

    $response = $this->withToken($token)
        ->getJson('/api/v1/bitacora?por_pagina=3')
        ->assertStatus(200);

    expect($response->json('data.data'))->toHaveCount(3);
    expect($response->json('data.pagination.por_pagina'))->toBe(3);
    expect($response->json('data.pagination.total'))->toBe(10);
});

// ── Test 9: Registro con user_id null (login fallido sin usuario en BD) ───────
test('test_bitacora_registra_login_fallido_sin_usuario', function () {
    ['token' => $token] = crearUsuarioBitacora(Role::ADMINISTRADOR);

    BitacoraAcceso::create([
        'user_id'    => null,
        'accion'     => BitacoraAcceso::ACCION_LOGIN_FALLIDO,
        'ip_address' => '192.168.1.1',
        'user_agent' => 'Mozilla/5.0',
    ]);

    $response = $this->withToken($token)
        ->getJson('/api/v1/bitacora?accion=' . BitacoraAcceso::ACCION_LOGIN_FALLIDO)
        ->assertStatus(200);

    $items = $response->json('data.data');
    expect($items)->toHaveCount(1);
    expect($items[0]['usuario'])->toBeNull();
    expect($items[0]['accion'])->toBe(BitacoraAcceso::ACCION_LOGIN_FALLIDO);
});
