<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

/*
|--------------------------------------------------------------------------
| Tests del Módulo de Autenticación — Pest PHP
|--------------------------------------------------------------------------
|
| Cada test verifica un requisito funcional (RF) del proyecto.
| Se usa RefreshDatabase para que cada test comience con BD limpia.
|
| Ejecutar: php artisan test --filter=AuthTest
|           php artisan test tests/Feature/Auth/AuthTest.php
|
*/

uses(RefreshDatabase::class);

// Antes de cada test se crean los roles (requisito para crear usuarios)
beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

// -----------------------------------------------------------------------
// Helper: crea un usuario de prueba con un rol específico
// -----------------------------------------------------------------------
function crearUsuario(string $rolNombre, array $extra = []): User
{
    $rol = Role::where('nombre', $rolNombre)->first();
    return User::factory()->create(array_merge([
        'role_id'           => $rol->id,
        'activo'            => true,
        'intentos_fallidos' => 0,
        'bloqueado_hasta'   => null,
        'password'          => Hash::make('Password123!'),
    ], $extra));
}

// -----------------------------------------------------------------------
// Test 1: Login exitoso retorna token — RFAUT01 escenario 1
// -----------------------------------------------------------------------
test('test_login_exitoso_retorna_token', function () {
    $usuario = crearUsuario(Role::ADMINISTRADOR);

    $response = $this->postJson('/api/v1/auth/login', [
        'email'    => $usuario->email,
        'password' => 'Password123!',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'usuario',
                'token',
                'rol',
            ],
        ])
        ->assertJson(['success' => true]);

    // El token no debe estar vacío
    expect($response->json('data.token'))->not->toBeEmpty();
});

// -----------------------------------------------------------------------
// Test 2: Credenciales inválidas retornan 401 — RFAUT01 escenario 2
// -----------------------------------------------------------------------
test('test_login_con_credenciales_invalidas_retorna_401', function () {
    $usuario = crearUsuario(Role::GERENCIA);

    $response = $this->postJson('/api/v1/auth/login', [
        'email'    => $usuario->email,
        'password' => 'contraseña_incorrecta',
    ]);

    $response->assertStatus(401)
        ->assertJson(['success' => false])
        // Verificar que el mensaje es genérico (no revela qué campo falló)
        ->assertJsonPath('message', 'Credenciales incorrectas.');
});

// -----------------------------------------------------------------------
// Test 3: Bloqueo tras 5 intentos fallidos — RFAUT01 escenario 3
// -----------------------------------------------------------------------
test('test_bloqueo_tras_cinco_intentos_fallidos', function () {
    $usuario = crearUsuario(Role::JEFE_PRODUCCION);

    // Realizar 5 intentos fallidos consecutivos
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/auth/login', [
            'email'    => $usuario->email,
            'password' => 'contraseña_incorrecta',
        ]);
    }

    // En el 6° intento la cuenta ya debe estar bloqueada
    $response = $this->postJson('/api/v1/auth/login', [
        'email'    => $usuario->email,
        'password' => 'Password123!', // Contraseña correcta, pero bloqueada
    ]);

    $response->assertStatus(401);
    expect($response->json('message'))->toContain('Cuenta bloqueada');
});

// -----------------------------------------------------------------------
// Test 4: Usuario inactivo no puede iniciar sesión — RFAUT04
// -----------------------------------------------------------------------
test('test_usuario_inactivo_no_puede_iniciar_sesion', function () {
    // Crear usuario con activo = false
    $usuario = crearUsuario(Role::ENCARGADO_INVENTARIOS, ['activo' => false]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email'    => $usuario->email,
        'password' => 'Password123!',
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Usuario inactivo. Contacte al administrador.');
});

// -----------------------------------------------------------------------
// Test 5: Logout revoca el token — RFAUT03
// -----------------------------------------------------------------------
test('test_logout_revoca_token', function () {
    $usuario = crearUsuario(Role::ADMINISTRADOR);
    $token = $usuario->createToken('api-token')->plainTextToken;

    // Antes del logout: el usuario tiene 1 token activo en la BD
    expect($usuario->tokens()->count())->toBe(1);

    // Hacer logout — debe retornar 200
    $this->withToken($token)
        ->postJson('/api/v1/auth/logout')
        ->assertStatus(200);

    // Verificar que el token fue eliminado físicamente de la base de datos (RFAUT03).
    // Esta es la comprobación correcta: el token no existe en personal_access_tokens.
    // Nota: en entorno de tests, Sanctum puede reutilizar la sesión en memoria entre
    // requests del mismo test, por eso verificamos directamente en la BD.
    expect($usuario->tokens()->count())->toBe(0);
});

// -----------------------------------------------------------------------
// Test 6: Endpoint /me retorna usuario autenticado
// -----------------------------------------------------------------------
test('test_endpoint_me_retorna_usuario_autenticado', function () {
    $usuario = crearUsuario(Role::GERENCIA);
    $token = $usuario->createToken('api-token')->plainTextToken;

    $response = $this->withToken($token)
        ->getJson('/api/v1/auth/me');

    $response->assertStatus(200)
        ->assertJsonPath('data.email', $usuario->email)
        ->assertJsonPath('data.rol', Role::GERENCIA);
});

// -----------------------------------------------------------------------
// Test 7: Rol gerencia NO puede crear usuarios — RFAUT02 / RNFSEC-04
// -----------------------------------------------------------------------
test('test_rol_gerencia_no_puede_crear_usuarios', function () {
    $gerente = crearUsuario(Role::GERENCIA);
    $token = $gerente->createToken('api-token')->plainTextToken;

    $rolAdmin = Role::where('nombre', Role::ADMINISTRADOR)->first();

    $response = $this->withToken($token)
        ->postJson('/api/v1/auth/usuarios', [
            'name'                  => 'Nuevo Usuario',
            'email'                 => 'nuevo@inventario.test',
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role_id'               => $rolAdmin->id,
        ]);

    // El middleware CheckRole debe bloquear con HTTP 403
    $response->assertStatus(403);
});

// -----------------------------------------------------------------------
// Test 8: Rol administrador SÍ puede crear usuarios — RFAUT04
// -----------------------------------------------------------------------
test('test_rol_administrador_puede_crear_usuarios', function () {
    $admin = crearUsuario(Role::ADMINISTRADOR);
    $token = $admin->createToken('api-token')->plainTextToken;

    $rolGerencia = Role::where('nombre', Role::GERENCIA)->first();

    $response = $this->withToken($token)
        ->postJson('/api/v1/auth/usuarios', [
            'name'                  => 'Nuevo Gerente',
            'email'                 => 'gerente.nuevo@inventario.test',
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role_id'               => $rolGerencia->id,
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.email', 'gerente.nuevo@inventario.test')
        ->assertJsonPath('data.rol', Role::GERENCIA);
});

// -----------------------------------------------------------------------
// Test 9: Administrador puede listar todos los usuarios — RFAUT02
// -----------------------------------------------------------------------
test('test_administrador_puede_listar_usuarios', function () {
    $admin    = crearUsuario(Role::ADMINISTRADOR);
    $gerente  = crearUsuario(Role::GERENCIA);
    $encargado = crearUsuario(Role::ENCARGADO_INVENTARIOS);
    $token    = $admin->createToken('api-token')->plainTextToken;

    $response = $this->withToken($token)
        ->getJson('/api/v1/auth/usuarios');

    $response->assertStatus(200)
        ->assertJson(['success' => true])
        ->assertJsonCount(3, 'data'); // admin + gerente + encargado
});

// -----------------------------------------------------------------------
// Test 10: Rol no-administrador no puede listar usuarios — RNFSEC-04
// -----------------------------------------------------------------------
test('test_no_administrador_no_puede_listar_usuarios', function () {
    $gerente = crearUsuario(Role::GERENCIA);
    $token   = $gerente->createToken('api-token')->plainTextToken;

    $this->withToken($token)
        ->getJson('/api/v1/auth/usuarios')
        ->assertStatus(403);
});

// -----------------------------------------------------------------------
// Test 11: Sin token no puede listar usuarios — 401
// -----------------------------------------------------------------------
test('test_sin_token_no_puede_listar_usuarios', function () {
    $this->getJson('/api/v1/auth/usuarios')
        ->assertStatus(401);
});

// -----------------------------------------------------------------------
// Test 12: Administrador puede actualizar el rol de un usuario — RFAUT02
// -----------------------------------------------------------------------
test('test_administrador_puede_actualizar_rol_de_usuario', function () {
    $admin    = crearUsuario(Role::ADMINISTRADOR);
    $encargado = crearUsuario(Role::ENCARGADO_INVENTARIOS);
    $token    = $admin->createToken('api-token')->plainTextToken;

    $rolJefe = Role::where('nombre', Role::JEFE_PRODUCCION)->first();

    $response = $this->withToken($token)
        ->patchJson("/api/v1/auth/usuarios/{$encargado->id}", [
            'role_id' => $rolJefe->id,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.rol', Role::JEFE_PRODUCCION);
});

// -----------------------------------------------------------------------
// Test 13: Desactivar usuario revoca sus tokens activos — RNFSEC-04
// -----------------------------------------------------------------------
test('test_desactivar_usuario_revoca_sus_tokens', function () {
    $admin    = crearUsuario(Role::ADMINISTRADOR);
    $encargado = crearUsuario(Role::ENCARGADO_INVENTARIOS);
    $tokenAdmin     = $admin->createToken('api-token')->plainTextToken;
    $tokenEncargado = $encargado->createToken('api-token')->plainTextToken;

    // Verificar que el encargado tiene un token activo
    expect($encargado->tokens()->count())->toBe(1);

    // El admin desactiva al encargado
    $this->withToken($tokenAdmin)
        ->patchJson("/api/v1/auth/usuarios/{$encargado->id}", ['activo' => false])
        ->assertStatus(200)
        ->assertJsonPath('data.activo', false);

    // Los tokens del encargado deben haber sido revocados
    expect($encargado->tokens()->count())->toBe(0);
});

// -----------------------------------------------------------------------
// Test 14: Actualizar usuario inexistente retorna 404
// -----------------------------------------------------------------------
test('test_actualizar_usuario_inexistente_retorna_404', function () {
    $admin = crearUsuario(Role::ADMINISTRADOR);
    $token = $admin->createToken('api-token')->plainTextToken;

    $this->withToken($token)
        ->patchJson('/api/v1/auth/usuarios/99999', ['activo' => false])
        ->assertStatus(404);
});

// -----------------------------------------------------------------------
// Test 15: Administrador puede listar los roles disponibles — RFAUT02
// -----------------------------------------------------------------------
test('test_administrador_puede_listar_roles', function () {
    $admin = crearUsuario(Role::ADMINISTRADOR);
    $token = $admin->createToken('api-token')->plainTextToken;

    $response = $this->withToken($token)
        ->getJson('/api/v1/roles');

    $response->assertStatus(200)
        ->assertJson(['success' => true])
        ->assertJsonCount(4, 'data'); // 4 roles del sistema
});

// -----------------------------------------------------------------------
// Test 16: Rol no-administrador no puede listar roles — RNFSEC-04
// -----------------------------------------------------------------------
test('test_no_administrador_no_puede_listar_roles', function () {
    $jefe  = crearUsuario(Role::JEFE_PRODUCCION);
    $token = $jefe->createToken('api-token')->plainTextToken;

    $this->withToken($token)
        ->getJson('/api/v1/roles')
        ->assertStatus(403);
});

// -----------------------------------------------------------------------
// Test 17: bloqueado_hasta no aparece en respuesta JSON — RNFSEC-01
// -----------------------------------------------------------------------
test('test_bloqueado_hasta_no_se_expone_en_respuesta_json', function () {
    $admin = crearUsuario(Role::ADMINISTRADOR);
    $token = $admin->createToken('api-token')->plainTextToken;

    $response = $this->withToken($token)
        ->getJson('/api/v1/auth/me');

    $response->assertStatus(200);

    // El campo bloqueado_hasta nunca debe viajar al cliente
    expect($response->json('data'))->not->toHaveKey('bloqueado_hasta');
});
