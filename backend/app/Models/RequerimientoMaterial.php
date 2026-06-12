<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo RequerimientoMaterial
 *
 * Snapshot inmutable de las materias primas calculadas al crear una orden de producción.
 * Permite comparar lo planificado vs. lo realmente consumido (trazabilidad RFPROD01).
 *
 * TABLA INMUTABLE: solo created_at, sin updated_at (HU-027).
 */
class RequerimientoMaterial extends Model
{
    protected $table = 'requerimientos_materiales';

    // Tabla inmutable — solo created_at
    const UPDATED_AT = null;

    protected $fillable = [
        'orden_produccion_id',
        'materia_prima_id',
        'cantidad_requerida',
        'lote_sugerido_id',
    ];

    protected function casts(): array
    {
        return [
            'cantidad_requerida' => 'decimal:3',
        ];
    }

    public function ordenProduccion(): BelongsTo
    {
        return $this->belongsTo(OrdenProduccion::class);
    }

    public function materiaPrima(): BelongsTo
    {
        return $this->belongsTo(MateriaPrima::class);
    }

    public function loteSugerido(): BelongsTo
    {
        return $this->belongsTo(LoteMateriaPrima::class, 'lote_sugerido_id');
    }
}
