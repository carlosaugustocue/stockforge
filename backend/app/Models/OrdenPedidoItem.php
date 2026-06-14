<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo OrdenPedidoItem
 *
 * Representa un ítem (línea) dentro de una orden de pedido.
 * Registra qué materia prima se solicitó y en qué cantidad.
 *
 * INMUTABLE: no tiene updated_at. Una vez creado, no se modifica.
 */
class OrdenPedidoItem extends Model
{
    protected $table = 'orden_pedido_items';

    public $timestamps = false;

    protected $fillable = [
        'orden_pedido_id',
        'materia_prima_id',
        'cantidad_solicitada',
    ];

    protected function casts(): array
    {
        return [
            'cantidad_solicitada' => 'decimal:3',
            'created_at'         => 'datetime',
        ];
    }

    public function ordenPedido(): BelongsTo
    {
        return $this->belongsTo(OrdenPedido::class);
    }

    public function materiaPrima(): BelongsTo
    {
        return $this->belongsTo(MateriaPrima::class);
    }
}
