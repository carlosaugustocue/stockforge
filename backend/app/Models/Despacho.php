<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo Despacho
 *
 * Representa la salida de un lote de producto terminado hacia un cliente.
 * Solo se puede despachar desde lotes cuya bodega sea de tipo 'ventas' (RFPROD03).
 *
 * TABLA INMUTABLE: solo created_at, sin updated_at (HU-027).
 * La anulación de un despacho se registra como movimiento compensatorio
 * de tipo AJUSTE_ENTRADA sobre el lote de PT correspondiente.
 *
 * HU-027 — Trazabilidad completa: proveedor → MP → producción → PT → cliente.
 */
class Despacho extends Model
{
    protected $table = 'despachos';

    // Tabla inmutable — solo created_at
    const UPDATED_AT = null;

    protected $fillable = [
        'lote_pt_id',
        'user_id',
        'cantidad',
        'referencia_cliente',
        'movimiento_id',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
        ];
    }

    public function lotePt(): BelongsTo
    {
        return $this->belongsTo(LoteProductoTerminado::class, 'lote_pt_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function movimiento(): BelongsTo
    {
        return $this->belongsTo(MovimientoInventario::class, 'movimiento_id');
    }
}
