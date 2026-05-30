<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Modelo MovimientoInventario
 *
 * Libro contable append-only del inventario. Toda operación que modifica
 * el stock genera un registro aquí — inmutable y permanente.
 *
 * TABLA INMUTABLE: solo created_at, sin updated_at (HU-027).
 * Las correcciones NO actualizan filas existentes — se insertan movimientos
 * compensatorios que referencian el original via movimiento_origen_id.
 *
 * entidad_tipo + entidad_id forman una relación polimórfica manual:
 *   'materia_prima'     → id en lotes_materia_prima
 *   'producto_terminado'→ id en lotes_producto_terminado
 *
 * La cantidad es SIEMPRE positiva. La dirección (entrada/salida) la indica el tipo.
 *
 * RFINV02 / HU-027 — Trazabilidad completa e inmutabilidad de movimientos.
 */
class MovimientoInventario extends Model
{
    protected $table = 'movimientos_inventario';

    // Tabla inmutable — solo created_at
    const UPDATED_AT = null;

    // Constantes de tipo para uso en código (evitar strings literales)
    const TIPO_RECEPCION_ENTRADA  = 'RECEPCION_ENTRADA';
    const TIPO_CONSUMO_MP         = 'CONSUMO_MP';
    const TIPO_PRODUCCION_ENTRADA = 'PRODUCCION_ENTRADA';
    const TIPO_TRASLADO_SALIDA    = 'TRASLADO_SALIDA';
    const TIPO_TRASLADO_ENTRADA   = 'TRASLADO_ENTRADA';
    const TIPO_DESPACHO_SALIDA    = 'DESPACHO_SALIDA';
    const TIPO_AJUSTE_ENTRADA     = 'AJUSTE_ENTRADA';
    const TIPO_AJUSTE_SALIDA      = 'AJUSTE_SALIDA';

    const ENTIDAD_MATERIA_PRIMA      = 'materia_prima';
    const ENTIDAD_PRODUCTO_TERMINADO = 'producto_terminado';

    protected $fillable = [
        'tipo',
        'entidad_tipo',
        'entidad_id',
        'bodega_id',
        'cantidad',
        'orden_produccion_id',
        'recepcion_id',
        'movimiento_origen_id',
        'user_id',
        'observaciones',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
        ];
    }

    public function bodega(): BelongsTo
    {
        return $this->belongsTo(Bodega::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function ordenProduccion(): BelongsTo
    {
        return $this->belongsTo(OrdenProduccion::class);
    }

    public function recepcion(): BelongsTo
    {
        return $this->belongsTo(Recepcion::class);
    }

    public function movimientoOrigen(): BelongsTo
    {
        return $this->belongsTo(MovimientoInventario::class, 'movimiento_origen_id');
    }

    public function movimientoCompensatorio(): HasOne
    {
        return $this->hasOne(MovimientoInventario::class, 'movimiento_origen_id');
    }

    public function esEntrada(): bool
    {
        return in_array($this->tipo, [
            self::TIPO_RECEPCION_ENTRADA,
            self::TIPO_PRODUCCION_ENTRADA,
            self::TIPO_TRASLADO_ENTRADA,
            self::TIPO_AJUSTE_ENTRADA,
        ], strict: true);
    }

    public function esSalida(): bool
    {
        return in_array($this->tipo, [
            self::TIPO_CONSUMO_MP,
            self::TIPO_TRASLADO_SALIDA,
            self::TIPO_DESPACHO_SALIDA,
            self::TIPO_AJUSTE_SALIDA,
        ], strict: true);
    }

    public function esCompensatorio(): bool
    {
        return $this->movimiento_origen_id !== null;
    }
}
