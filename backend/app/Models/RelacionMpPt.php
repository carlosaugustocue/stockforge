<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo RelacionMpPt
 *
 * Asociación entre materia prima y producto terminado.
 * Define la cantidad de MP consumida por unidad de PT producida.
 *
 * ACLARACIÓN (RNF-SEC-06): Este modelo NO almacena recetas ni fórmulas.
 * Solo registra la cantidad de consumo agregado por unidad producida.
 */
class RelacionMpPt extends Model
{
    protected $table = 'relaciones_mp_pt';

    protected $fillable = [
        'materia_prima_id',
        'producto_terminado_id',
        'cantidad_requerida',
        'unidad_medida_id',
    ];

    protected function casts(): array
    {
        return [
            'cantidad_requerida' => 'decimal:4',
        ];
    }

    public function materiaPrima(): BelongsTo
    {
        return $this->belongsTo(MateriaPrima::class);
    }

    public function productoTerminado(): BelongsTo
    {
        return $this->belongsTo(ProductoTerminado::class);
    }

    public function unidadMedida(): BelongsTo
    {
        return $this->belongsTo(UnidadMedida::class);
    }
}
