<?php

namespace App\Modules\Permisos\Repositories\Contracts;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Collection;

interface PermissionRepositoryInterface
{
    /** Todos los permisos del catálogo. */
    public function all(): Collection;

    /** Permisos asignados a un rol. */
    public function byRole(Role $role): Collection;

    /** Asignar un permiso a un rol. Retorna false si ya existía. */
    public function attach(Role $role, Permission $permission): bool;

    /** Revocar un permiso de un rol. Retorna false si no existía. */
    public function detach(Role $role, Permission $permission): bool;

    /** Buscar permiso por ID. */
    public function findById(int $id): ?Permission;

    /** Buscar permiso por slug (nombre). */
    public function findByNombre(string $nombre): ?Permission;
}
