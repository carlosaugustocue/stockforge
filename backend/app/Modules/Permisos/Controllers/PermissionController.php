<?php

namespace App\Modules\Permisos\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Permisos\Requests\AsignarPermisoRequest;
use App\Modules\Permisos\Resources\PermissionResource;
use App\Modules\Permisos\Services\PermissionService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;

/**
 * PermissionController — Gestión de la matriz de permisos (RBAC dinámico).
 *
 * Endpoints exclusivos del rol administrador.
 * Solo orquesta HTTP → Service → respuesta JSON.
 */
class PermissionController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly PermissionService $service) {}

    /**
     * GET /permisos
     * Lista todos los permisos disponibles en el sistema.
     */
    /**
     * @OA\Get(
     *     path="/permisos",
     *     summary="Listar todos los permisos disponibles",
     *     description="Solo administrador. Retorna el catálogo completo de permisos del sistema.",
     *     tags={"Permisos"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Listado de permisos"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere rol administrador)")
     * )
     */
    public function index(): JsonResponse
    {
        $permisos = $this->service->listarPermisos();

        return $this->successResponse(
            PermissionResource::collection($permisos),
            'Permisos del sistema.'
        );
    }

    /**
     * GET /roles/{roleId}/permisos
     * Lista los permisos asignados a un rol específico.
     */
    /**
     * @OA\Get(
     *     path="/roles/{roleId}/permisos",
     *     summary="Permisos asignados a un rol",
     *     tags={"Permisos"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="roleId", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Permisos del rol"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="Rol no encontrado")
     * )
     */
    public function byRole(int $roleId): JsonResponse
    {
        $role = $this->service->buscarRol($roleId);

        if (! $role) {
            return $this->errorResponse('Rol no encontrado.', 404);
        }

        $permisos = $this->service->permisosDeRol($role);

        return $this->successResponse(
            PermissionResource::collection($permisos),
            "Permisos del rol '{$role->nombre}'."
        );
    }

    /**
     * POST /roles/{roleId}/permisos
     * Asigna un permiso a un rol.
     *
     * Body: { "permission_id": 5 }
     */
    /**
     * @OA\Post(
     *     path="/roles/{roleId}/permisos",
     *     summary="Asignar permiso a un rol",
     *     description="Solo administrador. Invalida la caché de permisos del rol.",
     *     tags={"Permisos"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="roleId", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"permission_id"},
     *             @OA\Property(property="permission_id", type="integer", example=5)
     *         )
     *     ),
     *     @OA\Response(response=201, description="Permiso asignado"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=422, description="Permiso ya asignado o no existe")
     * )
     */
    public function attach(AsignarPermisoRequest $request, int $roleId): JsonResponse
    {
        $role = $this->service->buscarRol($roleId);

        if (! $role) {
            return $this->errorResponse('Rol no encontrado.', 404);
        }

        $permission = $this->service->buscarPermiso($request->integer('permission_id'));

        if (! $permission) {
            return $this->errorResponse('Permiso no encontrado.', 404);
        }

        $resultado = $this->service->asignar($role, $permission);

        if (! $resultado['ok']) {
            return $this->errorResponse($resultado['mensaje'], 409);
        }

        return $this->createdResponse(
            new PermissionResource($permission),
            $resultado['mensaje']
        );
    }

    /**
     * DELETE /roles/{roleId}/permisos/{permissionId}
     * Revoca un permiso de un rol.
     */
    /**
     * @OA\Delete(
     *     path="/roles/{roleId}/permisos/{permissionId}",
     *     summary="Revocar permiso de un rol",
     *     description="Solo administrador. Invalida la caché de permisos del rol.",
     *     tags={"Permisos"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="roleId", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="permissionId", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Permiso revocado"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="Asignación no encontrada")
     * )
     */
    public function detach(int $roleId, int $permissionId): JsonResponse
    {
        $role = $this->service->buscarRol($roleId);

        if (! $role) {
            return $this->errorResponse('Rol no encontrado.', 404);
        }

        $permission = $this->service->buscarPermiso($permissionId);

        if (! $permission) {
            return $this->errorResponse('Permiso no encontrado.', 404);
        }

        $resultado = $this->service->revocar($role, $permission);

        if (! $resultado['ok']) {
            return $this->errorResponse($resultado['mensaje'], 409);
        }

        return $this->successResponse(null, $resultado['mensaje']);
    }
}
