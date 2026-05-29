<?php

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auth\Requests\CreateUserRequest;
use App\Modules\Auth\Requests\LoginRequest;
use App\Modules\Auth\Requests\UpdateUserRequest;
use App\Models\Role;
use App\Modules\Auth\Resources\UserResource;
use App\Modules\Auth\Services\AuthService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AuthController — Controlador del módulo de autenticación
 *
 * SOLID-SRP: el controller solo orquesta — recibe la petición HTTP,
 * delega al Service y retorna la respuesta JSON.
 * No contiene lógica de negocio ni acceso directo a la base de datos.
 *
 * El trait ApiResponseTrait garantiza respuestas JSON consistentes en toda la API.
 */
class AuthController extends Controller
{
    use ApiResponseTrait;

    /**
     * Inyección de dependencia del AuthService.
     * El Service encapsula toda la lógica de negocio de autenticación.
     */
    public function __construct(
        private AuthService $authService
    ) {}

    // -----------------------------------------------------------------------
    // POST /api/auth/login
    // -----------------------------------------------------------------------

    /**
     * Procesa el inicio de sesión.
     * Ruta pública — no requiere token de autenticación.
     *
     * @return JsonResponse HTTP 200 con token | HTTP 401 si las credenciales fallan
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $resultado = $this->authService->login(
                $request->email,
                $request->password,
                $request
            );

            return $this->successResponse([
                'usuario' => new UserResource($resultado['usuario']),
                'token'   => $resultado['token'],
                'rol'     => $resultado['rol'],
            ], 'Inicio de sesión exitoso.');

        } catch (\Exception $e) {
            $code = $e->getCode();
            $httpCode = (is_int($code) && $code >= 100 && $code < 600) ? $code : 401;
            return $this->errorResponse($e->getMessage(), $httpCode);
        }
    }

    // -----------------------------------------------------------------------
    // POST /api/auth/logout
    // -----------------------------------------------------------------------

    /**
     * Cierra la sesión del usuario autenticado.
     * Ruta protegida — requiere token Sanctum válido.
     *
     * @return JsonResponse HTTP 200 con mensaje de confirmación
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $this->authService->logout($request->user(), $request);
            return $this->successResponse(null, 'Sesión cerrada exitosamente.');

        } catch (\Exception $e) {
            return $this->errorResponse('Error al cerrar sesión.', 500);
        }
    }

    // -----------------------------------------------------------------------
    // GET /api/auth/me
    // -----------------------------------------------------------------------

    /**
     * Retorna los datos del usuario autenticado actualmente.
     * Ruta protegida — requiere token Sanctum válido.
     *
     * @return JsonResponse HTTP 200 con datos del usuario
     */
    public function me(Request $request): JsonResponse
    {
        // Cargar la relación 'role' para incluir el nombre del rol en la respuesta
        $user = $request->user()->load('role');

        return $this->successResponse(
            new UserResource($user),
            'Datos del usuario autenticado.'
        );
    }

    // -----------------------------------------------------------------------
    // POST /api/auth/usuarios
    // -----------------------------------------------------------------------

    /**
     * Crea un nuevo usuario en el sistema.
     * Ruta protegida + solo ADMINISTRADOR (middleware 'role:administrador').
     *
     * @return JsonResponse HTTP 201 con el usuario creado | HTTP 500 si hay error
     */
    public function crearUsuario(CreateUserRequest $request): JsonResponse
    {
        try {
            $usuario = $this->authService->crearUsuario($request->validated());

            return $this->createdResponse(
                new UserResource($usuario->load('role')),
                'Usuario creado exitosamente.'
            );

        } catch (\Exception $e) {
            return $this->errorResponse('Error al crear el usuario.', 500);
        }
    }

    // -----------------------------------------------------------------------
    // GET /api/auth/usuarios
    // -----------------------------------------------------------------------

    /**
     * Lista todos los usuarios del sistema con su rol asignado.
     * Ruta protegida + solo ADMINISTRADOR (middleware 'role:administrador').
     *
     * @return JsonResponse HTTP 200 con la colección de usuarios
     */
    public function listarUsuarios(): JsonResponse
    {
        $usuarios = $this->authService->listarUsuarios();

        return $this->successResponse(
            UserResource::collection($usuarios),
            'Listado de usuarios.'
        );
    }

    // -----------------------------------------------------------------------
    // PATCH /api/auth/usuarios/{id}
    // -----------------------------------------------------------------------

    /**
     * Actualiza los datos de un usuario existente (PATCH semántico).
     * Permite cambiar nombre, email, rol y estado activo.
     * Ruta protegida + solo ADMINISTRADOR (middleware 'role:administrador').
     *
     * @return JsonResponse HTTP 200 con el usuario actualizado | HTTP 404 | HTTP 500
     */
    public function actualizarUsuario(UpdateUserRequest $request, int $id): JsonResponse
    {
        try {
            $usuario = $this->authService->actualizarUsuario($id, $request->validated());

            return $this->successResponse(
                new UserResource($usuario),
                'Usuario actualizado exitosamente.'
            );

        } catch (\Exception $e) {
            $code = $e->getCode();
            $httpCode = (is_int($code) && $code >= 100 && $code < 600) ? $code : 500;
            return $this->errorResponse($e->getMessage(), $httpCode);
        }
    }

    // -----------------------------------------------------------------------
    // GET /api/roles
    // -----------------------------------------------------------------------

    /**
     * Lista todos los roles disponibles en el sistema.
     * Usado por el frontend para poblar el selector de rol al crear/editar usuarios.
     * Ruta protegida + solo ADMINISTRADOR (middleware 'role:administrador').
     *
     * @return JsonResponse HTTP 200 con la lista de roles
     */
    public function listarRoles(): JsonResponse
    {
        $roles = Role::select('id', 'nombre', 'descripcion')->orderBy('nombre')->get();

        return $this->successResponse($roles, 'Listado de roles.');
    }
}
