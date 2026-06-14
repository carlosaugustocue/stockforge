<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo Proveedor
 *
 * Representa un proveedor que suministra materias primas.
 * Un proveedor puede asociarse a varias materias primas (pivot proveedor_materia_prima),
 * lo que permite sugerir el proveedor correcto al crear una orden desde una alerta.
 */
class Proveedor extends Model
{
    protected $table = 'proveedores';

    protected $fillable = [
        'nombre',
        'contacto_nombre',
        'telefono',
        'email',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    /** Materias primas que suministra este proveedor. */
    public function materiasPrimas(): BelongsToMany
    {
        return $this->belongsToMany(MateriaPrima::class, 'proveedor_materia_prima');
    }

    /** Órdenes de pedido emitidas a este proveedor. */
    public function ordenesPedido(): HasMany
    {
        return $this->hasMany(OrdenPedido::class);
    }

    public function estaActivo(): bool
    {
        return $this->activo === true;
    }
}
