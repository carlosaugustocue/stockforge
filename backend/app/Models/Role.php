<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo Role
 *
 * Representa un rol del sistema en el esquema RBAC manual.
 * Se implementa sin paquetes de terceros (ej. Spatie) para demostrar
 * comprensión del patrón de control de acceso basado en roles (RFAUT02).
 */
class Role extends Model
{
    // Constantes de clase para evitar "magic strings" en el código
    // Principio de código limpio: los valores de roles son un solo punto de verdad
    const ADMINISTRADOR          = 'administrador';
    const GERENCIA               = 'gerencia';
    const JEFE_PRODUCCION        = 'jefe_produccion';
    const ENCARGADO_INVENTARIOS  = 'encargado_inventarios';

    protected $fillable = [
        'nombre',
        'descripcion',
    ];

    /**
     * Un rol puede tener muchos usuarios asignados.
     * Relación: Role -> hasMany -> User
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Los permisos asignados a este rol (RBAC dinámico — RNFSEC-04).
     * Relación: Role -> belongsToMany -> Permission via role_permissions
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions');
    }
}
