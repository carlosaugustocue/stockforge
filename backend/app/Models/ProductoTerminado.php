<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo ProductoTerminado
 *
 * Representa un producto terminado del catálogo maestro.
 * El precio_venta se cifra en reposo (RNF-SEC-05).
 *
 * IMPORTANTE: Este modelo NO almacena recetas ni fórmulas de producción (RNF-SEC-06).
 * La relación con materias primas (cantidades de consumo) vive en RelacionMpPt.
 */
class ProductoTerminado extends Model
{
    protected $table  = 'productos_terminados';

    protected $fillable = [
        'nombre',
        'descripcion',
        'unidad_medida_id',
        'precio_venta',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'precio_venta' => 'encrypted',   // Cifrado en reposo — RNF-SEC-05
            'activo'       => 'boolean',
        ];
    }

    public function unidadMedida(): BelongsTo
    {
        return $this->belongsTo(UnidadMedida::class);
    }

    public function presentaciones(): HasMany
    {
        return $this->hasMany(Presentacion::class);
    }

    public function relaciones(): HasMany
    {
        return $this->hasMany(RelacionMpPt::class);
    }

    public function lotes(): HasMany
    {
        return $this->hasMany(LoteProductoTerminado::class);
    }

    public function ordenesProduccion(): HasMany
    {
        return $this->hasMany(OrdenProduccion::class);
    }

    public function estaActivo(): bool
    {
        return $this->activo === true;
    }
}
