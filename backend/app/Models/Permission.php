<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Modelo Permission — permiso atómico del sistema (RBAC dinámico).
 *
 * El slug `nombre` en formato `{recurso}.{accion}` es el identificador
 * que usa CheckPermission middleware para verificar acceso.
 */
class Permission extends Model
{
    protected $table = 'permissions';

    protected $fillable = [
        'nombre',
        'descripcion',
        'recurso',
        'accion',
    ];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_permissions');
    }
}
