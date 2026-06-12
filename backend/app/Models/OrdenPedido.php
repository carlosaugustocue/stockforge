<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo OrdenPedido
 *
 * Representa una orden de compra emitida a un proveedor.
 * El sistema no acepta recepciones sin una orden previa (RFREC).
 *
 * Estados:
 *   pendiente    → emitida, sin recepciones aún
 *   en_recepcion → con al menos una recepción parcial registrada
 *   cerrada      → completada — toda la mercancía recibida
 *   anulada      → cancelada antes de recibir
 */
class OrdenPedido extends Model
{
    protected $table = 'ordenes_pedido';

    protected $fillable = [
        'proveedor',
        'estado',
        'fecha_esperada',
        'observaciones',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'fecha_esperada' => 'date',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function recepciones(): HasMany
    {
        return $this->hasMany(Recepcion::class);
    }

    public function estaPendiente(): bool
    {
        return $this->estado === 'pendiente';
    }

    public function estaEnRecepcion(): bool
    {
        return $this->estado === 'en_recepcion';
    }

    public function estaCerrada(): bool
    {
        return $this->estado === 'cerrada';
    }

    public function estaAnulada(): bool
    {
        return $this->estado === 'anulada';
    }
}
