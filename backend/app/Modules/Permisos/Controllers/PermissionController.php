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
