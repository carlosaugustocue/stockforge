<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo MateriaPrima
 *
 * Representa una materia prima del catálogo maestro.
 * El costo_unitario se cifra en reposo mediante el cast 'encrypted' (RNF-SEC-05).
 */
class MateriaPrima extends Model
{
    protected $table = 'materias_primas';

    protected $fillable = [
        'nombre',
        'descripcion',
        'unidad_medida_id',
        'costo_unitario',
        'punto_reorden',
        'activa',
    ];

    protected function casts(): array
    {
        return [
            'costo_unitario' => 'encrypted',   // Cifrado en reposo — RNF-SEC-05
            'punto_reorden'  => 'decimal:3',
            'activa'         => 'boolean',
        ];
    }

    public function unidadMedida(): BelongsTo
    {
        return $this->belongsTo(UnidadMedida::class);
    }

    public function relaciones(): HasMany
    {
        return $this->hasMany(RelacionMpPt::class);
    }

    public function lotes(): HasMany
    {
        return $this->hasMany(LoteMateriaPrima::class);
    }

    public function estaActiva(): bool
    {
        return $this->activa === true;
    }
}
