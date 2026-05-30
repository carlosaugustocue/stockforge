<?php

namespace App\Modules\Permisos\Repositories;

use App\Models\Permission;
use App\Models\Role;
use App\Modules\Permisos\Repositories\Contracts\PermissionRepositoryInterface;
use Illuminate\Support\Collection;

class PermissionRepository implements PermissionRepositoryInterface
{
    public function all(): Collection
    {
        return Permission::orderBy('recurso')->orderBy('accion')->get();
    }

    public function byRole(Role $role): Collection
    {
        return $role->permissions()->orderBy('recurso')->orderBy('accion')->get();
    }

    public function attach(Role $role, Permission $permission): bool
    {
        // syncWithoutDetaching retorna el estado del attach
        $result = $role->permissions()->syncWithoutDetaching([$permission->id]);
        return ! empty($result['attached']);
    }

    public function detach(Role $role, Permission $permission): bool
    {
        $detached = $role->permissions()->detach($permission->id);
        return $detached > 0;
    }

    public function findById(int $id): ?Permission
    {
        return Permission::find($id);
    }

    public function findByNombre(string $nombre): ?Permission
    {
        return Permission::where('nombre', $nombre)->first();
    }
}
