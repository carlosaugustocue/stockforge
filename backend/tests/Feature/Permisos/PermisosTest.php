<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Limpiar caché entre tests para evitar contaminación de permisos cacheados
    // (los role_id crecen con cada test en SQLite y pueden colisionar con cache previa)
    Cache::flush();
    $this->seed(RoleSeeder::class);
    $this->seed(PermissionSeeder::class);
});

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
function crearUsuarioPermisos(string $rol): array
{
    $role = Role::where('nombre', $rol)->first();
    $user = User::factory()->create(['role_id' => $role->id, 'activo' => true]);
    return ['user' => $user, 'token' => $user->createToken('api-token')->plainTextToken];
}

// -----------------------------------------------------------------------
// Test 1: Administrador puede listar todos los permisos — HU-002
// -----------------------------------------------------------------------
test('test_admin_puede_listar_permisos', function () {
    ['token' => $token] = crearUsuarioPermisos(Role::ADMINISTRADOR);

    $this->withToken($token)
        ->getJson('/api/v1/permisos')
        ->assertStatus(200)
        ->assertJson(['success' => true])
        ->assertJsonStructure(['data' => [['id', 'nombre', 'recurso', 'accion']]]);
});

// -----------------------------------------------------------------------
// Test 2: Sin token no puede listar permisos — 401
// -----------------------------------------------------------------------
test('test_sin_token_no_puede_listar_permisos', function () {
    $this->getJson('/api/v1/permisos')->assertStatus(401);
});

// -----------------------------------------------------------------------
// Test 3: Encargado no puede listar permisos — 403 (no es administrador)
// -----------------------------------------------------------------------
test('test_encargado_no_puede_listar_permisos', function () {
    ['token' => $token] = crearUsuarioPermisos(Role::ENCARGADO_INVENTARIOS);

    $this->withToken($token)
        ->getJson('/api/v1/permisos')
        ->assertStatus(403);
});

// -----------------------------------------------------------------------
// Test 4: Administrador puede ver permisos de un rol — HU-002
// -----------------------------------------------------------------------
test('test_admin_puede_ver_permisos_de_rol', function () {
    ['token' => $token] = crearUsuarioPermisos(Role::ADMINISTRADOR);
    $role = Role::where('nombre', Role::ENCARGADO_INVENTARIOS)->first();

    $response = $this->withToken($token)
        ->getJson("/api/v1/roles/{$role->id}/permisos")
        ->assertStatus(200)
        ->assertJson(['success' => true]);

    // El encargado debe tener permisos de lectura y escritura de catálogo
    $nombres = collect($response->json('data'))->pluck('nombre');
    expect($nombres)->toContain('materias_primas.leer')
                    ->toContain('materias_primas.escribir');
});

// -----------------------------------------------------------------------
// Test 5: Ver permisos de rol inexistente retorna 404
// -----------------------------------------------------------------------
test('test_permisos_de_rol_inexistente_retorna_404', function () {
    ['token' => $token] = crearUsuarioPermisos(Role::ADMINISTRADOR);

    $this->withToken($token)
        ->getJson('/api/v1/roles/99999/permisos')
        ->assertStatus(404);
});

// -----------------------------------------------------------------------
// Test 6: Administrador puede asignar un permiso a un rol — HU-002
// -----------------------------------------------------------------------
test('test_admin_puede_asignar_permiso_a_rol', function () {
    ['token' => $token] = crearUsuarioPermisos(Role::ADMINISTRADOR);
    $role = Role::where('nombre', Role::JEFE_PRODUCCION)->first();

    // Buscar un permiso que el jefe de producción NO tiene: recepciones.escribir
    $permiso = Permission::where('nombre', 'recepciones.escribir')->first();

    // Verificar que no lo tiene asignado
    expect($role->permissions->pluck('nombre'))->not->toContain('recepciones.escribir');

    $this->withToken($token)
        ->postJson("/api/v1/roles/{$role->id}/permisos", ['permission_id' => $permiso->id])
        ->assertStatus(201)
        ->assertJsonPath('data.nombre', 'recepciones.escribir');

    // Verificar que ahora sí lo tiene
    $role->refresh();
    expect($role->permissions->pluck('nombre'))->toContain('recepciones.escribir');
});

// -----------------------------------------------------------------------
// Test 7: Asignar permiso duplicado retorna 409
// -----------------------------------------------------------------------
test('test_asignar_permiso_duplicado_retorna_409', function () {
    ['token' => $token] = crearUsuarioPermisos(Role::ADMINISTRADOR);
    $role = Role::where('nombre', Role::ENCARGADO_INVENTARIOS)->first();
    $permiso = Permission::where('nombre', 'materias_primas.leer')->first();

    // Ya tiene este permiso — segundo intento debe ser 409
    $this->withToken($token)
        ->postJson("/api/v1/roles/{$role->id}/permisos", ['permission_id' => $permiso->id])
        ->assertStatus(409);
});

// -----------------------------------------------------------------------
// Test 8: Administrador puede revocar un permiso de un rol
// -----------------------------------------------------------------------
test('test_admin_puede_revocar_permiso_de_rol', function () {
    ['token' => $token] = crearUsuarioPermisos(Role::ADMINISTRADOR);
    $role = Role::where('nombre', Role::ENCARGADO_INVENTARIOS)->first();
    $permiso = Permission::where('nombre', 'materias_primas.escribir')->first();

    $this->withToken($token)
        ->deleteJson("/api/v1/roles/{$role->id}/permisos/{$permiso->id}")
        ->assertStatus(200)
        ->assertJson(['success' => true]);

    $role->refresh();
    expect($role->permissions->pluck('nombre'))->not->toContain('materias_primas.escribir');
});

// -----------------------------------------------------------------------
// Test 9: Revocar permiso no asignado retorna 409
// -----------------------------------------------------------------------
test('test_revocar_permiso_no_asignado_retorna_409', function () {
    ['token' => $token] = crearUsuarioPermisos(Role::ADMINISTRADOR);
    $role = Role::where('nombre', Role::ADMINISTRADOR)->first();
    // El administrador no tiene 'materias_primas.leer'
    $permiso = Permission::where('nombre', 'materias_primas.leer')->first();

    $this->withToken($token)
        ->deleteJson("/api/v1/roles/{$role->id}/permisos/{$permiso->id}")
        ->assertStatus(409);
});

// -----------------------------------------------------------------------
// Test 10: CheckPermission — encargado puede listar materias primas — RNFSEC-04
// -----------------------------------------------------------------------
test('test_check_permission_encargado_puede_listar_materias_primas', function () {
    ['token' => $token] = crearUsuarioPermisos(Role::ENCARGADO_INVENTARIOS);

    $this->withToken($token)
        ->getJson('/api/v1/materias-primas')
        ->assertStatus(200);
});

// -----------------------------------------------------------------------
// Test 11: CheckPermission — jefe NO puede escribir materias primas — RNFSEC-04
// -----------------------------------------------------------------------
test('test_check_permission_jefe_no_puede_escribir_materias_primas', function () {
    ['token' => $token] = crearUsuarioPermisos(Role::JEFE_PRODUCCION);

    $this->withToken($token)
        ->postJson('/api/v1/materias-primas', ['nombre' => 'Test', 'unidad_medida_id' => 1])
        ->assertStatus(403);
});

// -----------------------------------------------------------------------
// Test 12: CheckPermission — gerencia puede escribir materias primas — RNFSEC-04
// -----------------------------------------------------------------------
test('test_check_permission_gerencia_puede_escribir_materias_primas', function () {
    ['token' => $token] = crearUsuarioPermisos(Role::GERENCIA);

    // Solo verificamos que no sea 403 — la validación puede retornar 422 por campos faltantes
    $response = $this->withToken($token)
        ->postJson('/api/v1/materias-primas', []);

    expect($response->status())->not->toBe(403);
});

// -----------------------------------------------------------------------
// Test 13: Caché de permisos se invalida al revocar — comportamiento en tiempo real
// -----------------------------------------------------------------------
test('test_cache_se_invalida_al_revocar_permiso', function () {
    ['user' => $admin, 'token' => $tokenAdmin] = crearUsuarioPermisos(Role::ADMINISTRADOR);
    ['user' => $encargado, 'token' => $tokenEncargado] = crearUsuarioPermisos(Role::ENCARGADO_INVENTARIOS);

    $role = Role::find($encargado->role_id);
    $permiso = Permission::where('nombre', 'materias_primas.leer')->first();

    // Calentar la caché
    $this->withToken($tokenEncargado)->getJson('/api/v1/materias-primas')->assertStatus(200);
    expect(Cache::has("permisos_rol_{$role->id}"))->toBeTrue();

    // Resetear el guard de Sanctum entre requests para evitar el user cacheado
    // (RequestGuard::$user persiste en el mismo test si no se hace forgetGuards)
    auth()->forgetGuards();

    // Admin revoca el permiso — debe invalidar la caché
    $this->withToken($tokenAdmin)
        ->deleteJson("/api/v1/roles/{$role->id}/permisos/{$permiso->id}")
        ->assertStatus(200);

    expect(Cache::has("permisos_rol_{$role->id}"))->toBeFalse();

    // Resetear guard para re-autenticar correctamente al encargado
    auth()->forgetGuards();

    // Encargado ya no puede acceder
    $this->withToken($tokenEncargado)
        ->getJson('/api/v1/materias-primas')
        ->assertStatus(403);
});
