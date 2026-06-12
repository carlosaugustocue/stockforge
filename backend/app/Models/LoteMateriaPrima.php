<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo LoteMateriaPrima
 *
 * Representa un lote físico de una materia prima recibido en una recepción.
 * Es la unidad de trazabilidad del inventario de MP.
 *
 * FEFO (First Expired, First Out — RFINV03):
 * El lote a consumir se selecciona ordenando por fecha_vencimiento ASC,
 * con fecha_ingreso ASC como desempate. El FefoService encapsula esta lógica.
 *
 * cantidad_actual se reduce con cada CONSUMO_MP o TRASLADO_SALIDA.
 * cantidad_inicial es inmutable (referencia histórica).
 *
 * RFINV02 — Trazabilidad: cada movimiento referencia el lote afectado.
 */
class LoteMateriaPrima extends Model
{
    protected $table = 'lotes_materia_prima';

    protected $fillable = [
        'recepcion_id',
        'materia_prima_id',
        'bodega_id',
        'cantidad_inicial',
        'cantidad_actual',
        'fecha_vencimiento',
        'fecha_ingreso',
    ];

    protected function casts(): array
    {
        return [
            'cantidad_inicial'  => 'decimal:3',
            'cantidad_actual'   => 'decimal:3',
            'fecha_vencimiento' => 'date',
            'fecha_ingreso'     => 'datetime',
        ];
    }

    public function recepcion(): BelongsTo
    {
        return $this->belongsTo(Recepcion::class);
    }

    public function materiaPrima(): BelongsTo
    {
        return $this->belongsTo(MateriaPrima::class);
    }

    public function bodega(): BelongsTo
    {
        return $this->belongsTo(Bodega::class);
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class, 'entidad_id')
            ->where('entidad_tipo', 'materia_prima');
    }

    public function tieneStockSuficiente(float|string $cantidad): bool
    {
        return (float) $this->cantidad_actual >= (float) $cantidad;
    }

    public function estaAgotado(): bool
    {
        return (float) $this->cantidad_actual <= 0;
    }

    public function estaVencido(): bool
    {
        return $this->fecha_vencimiento !== null
            && $this->fecha_vencimiento->isPast();
    }
}
