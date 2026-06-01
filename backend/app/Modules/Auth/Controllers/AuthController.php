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

class AuthController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private AuthService $authService
    ) {}

    // -----------------------------------------------------------------------
    // POST /api/v1/auth/login
    // -----------------------------------------------------------------------

    /**
     * @OA\Post(
     *     path="/auth/login",
     *     summary="Iniciar sesión",
     *     description="Autentica al usuario y retorna un token Bearer de Sanctum.",
     *     tags={"Auth"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email","password"},
     *             @OA\Property(property="email", type="string", format="email", example="admin@inventario.test"),
     *             @OA\Property(property="password", type="string", format="password", example="Admin1234!")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Login exitoso",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Inicio de sesión exitoso."),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="token", type="string", example="1|abc123..."),
     *                 @OA\Property(property="rol", type="string", example="administrador"),
     *                 @OA\Property(property="usuario", type="object",
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="name", type="string", example="Admin"),
     *                     @OA\Property(property="email", type="string", example="admin@inventario.test")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Credenciales inválidas o cuenta bloqueada"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
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
                'token' => $resultado['token'],
                'rol'   => $resultado['rol'],
            ], 'Inicio de sesión exitoso.');

        } catch (\Exception $e) {
            $code = $e->getCode();
            $httpCode = (is_int($code) && $code >= 100 && $code < 600) ? $code : 401;
            return $this->errorResponse($e->getMessage(), $httpCode);
        }
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/auth/logout
    // -----------------------------------------------------------------------

    /**
     * @OA\Post(
     *     path="/auth/logout",
     *     summary="Cerrar sesión",
     *     description="Revoca el token Bearer actual del usuario autenticado.",
     *     tags={"Auth"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Sesión cerrada exitosamente"),
     *     @OA\Response(response=401, description="Token inválido o no proporcionado")
     * )
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
    // GET /api/v1/auth/me
    // -----------------------------------------------------------------------

    /**
     * @OA\Get(
     *     path="/auth/me",
     *     summary="Datos del usuario autenticado",
     *     tags={"Auth"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Datos del usuario autenticado"),
     *     @OA\Response(response=401, description="No autenticado")
     * )
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        return $this->successResponse(
            new UserResource($user),
            'Datos del usuario autenticado.'
        );
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/auth/usuarios
    // -----------------------------------------------------------------------

    /**
     * @OA\Post(
     *     path="/auth/usuarios",
     *     summary="Crear usuario",
     *     description="Solo administrador. Crea un nuevo usuario en el sistema.",
     *     tags={"Auth"},
     *     security={{"sanctum":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name","email","password","password_confirmation","role_id"},
     *             @OA\Property(property="name", type="string", example="Juan Pérez"),
     *             @OA\Property(property="email", type="string", format="email", example="juan@inventario.test"),
     *             @OA\Property(property="password", type="string", example="Password123!"),
     *             @OA\Property(property="password_confirmation", type="string", example="Password123!"),
     *             @OA\Property(property="role_id", type="integer", example=2)
     *         )
     *     ),
     *     @OA\Response(response=201, description="Usuario creado"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere rol administrador)"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
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
    // GET /api/v1/auth/usuarios
    // -----------------------------------------------------------------------

    /**
     * @OA\Get(
     *     path="/auth/usuarios",
     *     summary="Listar usuarios",
     *     description="Solo administrador. Lista todos los usuarios del sistema.",
     *     tags={"Auth"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Listado de usuarios"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso")
     * )
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
    // PATCH /api/v1/auth/usuarios/{id}
    // -----------------------------------------------------------------------

    /**
     * @OA\Patch(
     *     path="/auth/usuarios/{id}",
     *     summary="Actualizar usuario",
     *     description="Solo administrador. Actualiza nombre, email, rol o estado activo.",
     *     tags={"Auth"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="Nuevo Nombre"),
     *             @OA\Property(property="email", type="string", example="nuevo@inventario.test"),
     *             @OA\Property(property="role_id", type="integer", example=3),
     *             @OA\Property(property="activo", type="boolean", example=true)
     *         )
     *     ),
     *     @OA\Response(response=200, description="Usuario actualizado"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="Usuario no encontrado"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
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
    // GET /api/v1/roles
    // -----------------------------------------------------------------------

    /**
     * @OA\Get(
     *     path="/roles",
     *     summary="Listar roles",
     *     description="Solo administrador. Retorna todos los roles disponibles.",
     *     tags={"Auth"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Listado de roles"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso")
     * )
     */
    public function listarRoles(): JsonResponse
    {
        $roles = Role::select('id', 'nombre', 'descripcion')->orderBy('nombre')->get();

        return $this->successResponse($roles, 'Listado de roles.');
    }
}
