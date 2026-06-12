<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo LoteProductoTerminado
 *
 * Representa un lote físico de producto terminado generado por una orden de producción.
 *
 * bodega_id refleja la ubicación ACTUAL del lote:
 *   - tipo 'produccion' → recién producido, NO disponible para despacho (Etapa 2)
 *   - tipo 'ventas'     → trasladado al Área de Ventas, disponible para despacho (Etapa 3)
 *
 * cantidad_actual se reduce con cada despacho (DESPACHO_SALIDA).
 * cantidad_inicial es inmutable (referencia histórica).
 *
 * RFPROD03 — El PT solo es dispatchable cuando bodega.tipo = 'ventas'.
 */
class LoteProductoTerminado extends Model
{
    protected $table = 'lotes_producto_terminado';

    protected $fillable = [
        'orden_produccion_id',
        'producto_terminado_id',
        'bodega_id',
        'cantidad_inicial',
        'cantidad_actual',
        'fecha_produccion',
    ];

    protected function casts(): array
    {
        return [
            'cantidad_inicial' => 'decimal:3',
            'cantidad_actual'  => 'decimal:3',
            'fecha_produccion' => 'date',
        ];
    }

    public function ordenProduccion(): BelongsTo
    {
        return $this->belongsTo(OrdenProduccion::class);
    }

    public function productoTerminado(): BelongsTo
    {
        return $this->belongsTo(ProductoTerminado::class);
    }

    public function bodega(): BelongsTo
    {
        return $this->belongsTo(Bodega::class);
    }

    public function despachos(): HasMany
    {
        return $this->hasMany(Despacho::class, 'lote_pt_id');
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class, 'entidad_id')
            ->where('entidad_tipo', 'producto_terminado');
    }

    public function estaDisponibleParaDespacho(): bool
    {
        return $this->bodega->tipo === 'ventas'
            && (float) $this->cantidad_actual > 0;
    }

    public function tieneStockSuficiente(float|string $cantidad): bool
    {
        return (float) $this->cantidad_actual >= (float) $cantidad;
    }
}
