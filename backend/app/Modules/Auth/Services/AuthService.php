<?php

namespace App\Modules\Auth\Services;

use App\Models\User;
use App\Modules\Auth\Repositories\Contracts\UserRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * AuthService — Capa de lógica de negocio para autenticación
 *
 * Centraliza todas las reglas de negocio relacionadas con la autenticación.
 * SOLID-SRP: esta clase tiene una única responsabilidad — gestionar la
 * autenticación de usuarios.
 *
 * Recibe UserRepositoryInterface por inyección de dependencias en el constructor
 * (SOLID-DIP): no depende de la implementación concreta, sino de la abstracción.
 */
class AuthService
{
    /**
     * Máximo de intentos antes de bloquear la cuenta (RFAUT01)
     */
    private const MAX_INTENTOS = 5;

    /**
     * Minutos de bloqueo tras superar el máximo de intentos (RFAUT01)
     */
    private const MINUTOS_BLOQUEO = 15;

    /**
     * Inyección de dependencia — el Service depende de la interfaz, no de la clase concreta.
     * Esto permite cambiar la implementación del repositorio sin tocar este archivo.
     */
    public function __construct(
        private UserRepositoryInterface $userRepository
    ) {}

    // -----------------------------------------------------------------------
    // Método: login
    // -----------------------------------------------------------------------

    /**
     * Procesa el inicio de sesión de un usuario.
     *
     * Flujo (RFAUT01):
     * 1. Verificar que el email existe en el sistema
     * 2. Verificar si la cuenta está bloqueada
     * 3. Verificar si el usuario está activo
     * 4. Verificar la contraseña
     * 5. En login exitoso: reset intentos, registrar en bitácora, generar token
     *
     * Los mensajes de error son GENÉRICOS para no revelar información del sistema
     * (no se indica si el email existe o si la contraseña es incorrecta).
     *
     * @throws \Exception
     */
    public function login(string $email, string $password, Request $request): array
    {
        // Paso 1: Buscar el usuario — mensaje genérico si no existe (seguridad RFAUT01)
        $user = $this->userRepository->findByEmail($email);
        if (!$user) {
            $this->registrarEnBitacora(null, 'login_fallido', $request);
            throw new \Exception('Credenciales incorrectas.', 401);
        }

        // Paso 2: Verificar si la cuenta está bloqueada (RFAUT01)
        if ($user->estaBloqueado()) {
            $minutosRestantes = (int) Carbon::now()->diffInMinutes($user->bloqueado_hasta, false);
            throw new \Exception(
                "Cuenta bloqueada. Intente nuevamente en {$minutosRestantes} minuto(s).",
                401
            );
        }

        // Paso 3: Verificar si el usuario está activo (RFAUT04)
        if (!$user->activo) {
            throw new \Exception('Usuario inactivo. Contacte al administrador.', 403);
        }

        // Paso 4: Verificar la contraseña con bcrypt (RNFSEC-01)
        if (!Hash::check($password, $user->password)) {
            $this->procesarIntentoFallido($user, $request);
            // Mismo mensaje genérico — no se revela si el email o la contraseña fallaron
            throw new \Exception('Credenciales incorrectas.', 401);
        }

        // Paso 5: Login exitoso
        $this->userRepository->resetIntentosFallidos($user);
        $this->registrarEnBitacora($user->id, 'login_exitoso', $request);

        // Revocar todos los tokens anteriores del usuario (sesión única)
        $user->tokens()->delete();

        // Crear nuevo token Sanctum — la expiración se configura en config/sanctum.php
        $token = $user->createToken('api-token')->plainTextToken;

        // Cargar la relación rol para incluirla en la respuesta
        $user->load('role');

        return [
            'usuario' => $user,
            'token'   => $token,
            'rol'     => $user->role?->nombre,
        ];
    }

    // -----------------------------------------------------------------------
    // Método: logout
    // -----------------------------------------------------------------------

    /**
     * Cierra la sesión del usuario revocando su token actual.
     */
    public function logout(User $user, Request $request): void
    {
        // Obtenemos el token actual y lo eliminamos de la BD por su ID.
        // Usamos tokens()->where() para garantizar la eliminación física del registro,
        // ya que currentAccessToken()->delete() puede retornar un TransientToken
        // en Sanctum 4 cuando se usa en entorno de pruebas (RFAUT03).
        $tokenActual = $user->currentAccessToken();
        if ($tokenActual && isset($tokenActual->id)) {
            $user->tokens()->where('id', $tokenActual->id)->delete();
        } else {
            // Fallback: eliminar todos los tokens si no se puede identificar el actual
            $user->tokens()->delete();
        }

        $this->registrarEnBitacora($user->id, 'logout', $request);
    }

    // -----------------------------------------------------------------------
    // Método: crearUsuario
    // -----------------------------------------------------------------------

    /**
     * Crea un nuevo usuario en el sistema.
     *
     * La validación de permisos (solo administrador) se realiza a nivel de
     * middleware y controller — este método solo crea el usuario (SOLID-SRP).
     *
     * La contraseña llega sin hashear y se hashea aquí con bcrypt (RNFSEC-01).
     */
    public function crearUsuario(array $data): User
    {
        // bcrypt garantiza que la contraseña nunca se almacene en texto plano
        $data['password'] = bcrypt($data['password']);
        $data['activo']   = true;

        return $this->userRepository->create($data);
    }

    // -----------------------------------------------------------------------
    // Método: listarUsuarios
    // -----------------------------------------------------------------------

    /**
     * Retorna todos los usuarios del sistema con su rol.
     * Solo accesible por administrador (restricción en middleware).
     */
    public function listarUsuarios(): \Illuminate\Database\Eloquent\Collection
    {
        return $this->userRepository->all();
    }

    // -----------------------------------------------------------------------
    // Método: obtenerUsuario
    // -----------------------------------------------------------------------

    /**
     * Busca un usuario por ID.
     * Lanza excepción 404 si no existe.
     */
    public function obtenerUsuario(int $id): User
    {
        $user = $this->userRepository->findById($id);

        if (!$user) {
            throw new \Exception('Usuario no encontrado.', 404);
        }

        return $user;
    }

    // -----------------------------------------------------------------------
    // Método: actualizarUsuario
    // -----------------------------------------------------------------------

    /**
     * Actualiza los datos de un usuario existente (PATCH semántico).
     * Solo se modifican los campos presentes en $data.
     *
     * Si se desactiva un usuario activo, se revocan todos sus tokens
     * para cerrar cualquier sesión activa inmediatamente.
     */
    public function actualizarUsuario(int $id, array $data): User
    {
        $user = $this->obtenerUsuario($id);

        // Si se está desactivando un usuario activo, cerrar sus sesiones
        if (isset($data['activo']) && $data['activo'] === false && $user->activo) {
            $user->tokens()->delete();
        }

        return $this->userRepository->update($user, $data);
    }

    // -----------------------------------------------------------------------
    // Métodos privados
    // -----------------------------------------------------------------------

    /**
     * Procesa un intento de login fallido.
     * Si se alcanzan MAX_INTENTOS, bloquea la cuenta y registra el evento.
     */
    private function procesarIntentoFallido(User $user, Request $request): void
    {
        $this->userRepository->incrementIntentosFallidos($user);
        $user->refresh(); // Recargar para tener el valor actualizado de intentos_fallidos

        if ($user->intentos_fallidos >= self::MAX_INTENTOS) {
            $this->userRepository->bloquearUsuario($user, self::MINUTOS_BLOQUEO);
            $this->registrarEnBitacora($user->id, 'cuenta_bloqueada', $request);
        } else {
            $this->registrarEnBitacora($user->id, 'login_fallido', $request);
        }
    }

    /**
     * Registra un evento de acceso en la tabla bitacora_accesos.
     *
     * La bitácora es INMUTABLE (RNF-MAN): solo se insertan registros, nunca
     * se modifican ni se eliminan. Por eso la tabla no tiene updated_at.
     *
     * @param int|null $userId  null cuando el login falla y el usuario no existe
     * @param string   $accion  Tipo de evento registrado
     */
    private function registrarEnBitacora(?int $userId, string $accion, Request $request): void
    {
        DB::table('bitacora_accesos')->insert([
            'user_id'    => $userId,
            'accion'     => $accion,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now(),
        ]);
    }
}
