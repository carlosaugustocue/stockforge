<?php

namespace App\Modules\Permisos\Services;

use App\Models\Permission;
use App\Models\Role;
use App\Modules\Permisos\Repositories\Contracts\PermissionRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class PermissionService
{
    public function __construct(
        private readonly PermissionRepositoryInterface $repo
    ) {}

    public function listarPermisos(): Collection
    {
        return $this->repo->all();
    }

    public function permisosDeRol(Role $role): Collection
    {
        return $this->repo->byRole($role);
    }

    /**
     * Asigna un permiso a un rol e invalida la caché del rol.
     *
     * @return array{ok: bool, mensaje: string}
     */
    public function asignar(Role $role, Permission $permission): array
    {
        $asignado = $this->repo->attach($role, $permission);

        if (! $asignado) {
            return ['ok' => false, 'mensaje' => 'El permiso ya estaba asignado a este rol.'];
        }

        $this->invalidarCache($role->id);

        return ['ok' => true, 'mensaje' => 'Permiso asignado correctamente.'];
    }

    /**
     * Revoca un permiso de un rol e invalida la caché del rol.
     *
     * @return array{ok: bool, mensaje: string}
     */
    public function revocar(Role $role, Permission $permission): array
    {
        $revocado = $this->repo->detach($role, $permission);

        if (! $revocado) {
            return ['ok' => false, 'mensaje' => 'El permiso no estaba asignado a este rol.'];
        }

        $this->invalidarCache($role->id);

        return ['ok' => true, 'mensaje' => 'Permiso revocado correctamente.'];
    }

    public function buscarPermiso(int $id): ?Permission
    {
        return $this->repo->findById($id);
    }

    public function buscarRol(int $id): ?Role
    {
        return Role::find($id);
    }

    /** Invalida la caché de permisos para que los cambios surtan efecto de inmediato. */
    private function invalidarCache(int $roleId): void
    {
        Cache::forget("permisos_rol_{$roleId}");
    }
}
