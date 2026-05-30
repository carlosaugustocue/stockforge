<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Modelo OrdenProduccion
 *
 * Representa la planificación y ejecución de un lote de producción.
 *
 * Ciclo de vida (RFPROD01-05):
 *   pendiente   → creada, MP calculada, sin ejecutar
 *   producido   → MP consumida, PT creado en Planta de Producción
 *   completada  → PT trasladado a Área de Ventas, disponible para despacho
 *   anulada     → cancelada (solo si está pendiente)
 *
 * Decisión de diseño: el descuento de MP ocurre al ejecutar la producción
 * (estado pendiente → producido), directo desde Bodega Principal, sin
 * traslado previo obligatorio de MP (Opción B confirmada por el cliente).
 */
class OrdenProduccion extends Model
{
    protected $table = 'ordenes_produccion';

    protected $fillable = [
        'producto_terminado_id',
        'user_id',
        'cantidad_planificada',
        'cantidad_producida',
        'fecha_planificada',
        'estado',
        'observaciones',
    ];

    protected function casts(): array
    {
        return [
            'cantidad_planificada' => 'decimal:3',
            'cantidad_producida'   => 'decimal:3',
            'fecha_planificada'    => 'date',
        ];
    }

    public function productoTerminado(): BelongsTo
    {
        return $this->belongsTo(ProductoTerminado::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function requerimientos(): HasMany
    {
        return $this->hasMany(RequerimientoMaterial::class);
    }

    public function loteProductoTerminado(): HasOne
    {
        return $this->hasOne(LoteProductoTerminado::class);
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class);
    }

    public function estaPendiente(): bool
    {
        return $this->estado === 'pendiente';
    }

    public function estaProducido(): bool
    {
        return $this->estado === 'producido';
    }

    public function estaCompletada(): bool
    {
        return $this->estado === 'completada';
    }

    public function estaAnulada(): bool
    {
        return $this->estado === 'anulada';
    }
}
