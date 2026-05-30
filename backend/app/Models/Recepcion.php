<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo Recepcion
 *
 * Representa un evento de entrada física de materias primas desde un proveedor.
 * Siempre referencia una OrdenPedido (RFREC — no se recibe sin orden previa).
 *
 * TABLA INMUTABLE: solo created_at, sin updated_at (HU-027).
 * Una recepción registrada no se modifica. Los errores se corrigen con
 * una nueva recepción compensatoria.
 */
class Recepcion extends Model
{
    protected $table = 'recepciones';

    // Tabla inmutable — solo created_at
    const UPDATED_AT = null;

    protected $fillable = [
        'orden_pedido_id',
        'user_id',
        'observaciones',
    ];

    public function ordenPedido(): BelongsTo
    {
        return $this->belongsTo(OrdenPedido::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function lotes(): HasMany
    {
        return $this->hasMany(LoteMateriaPrima::class);
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class);
    }
}
