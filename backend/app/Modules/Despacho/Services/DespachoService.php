<?php

namespace App\Modules\Despacho\Services;

use App\Models\Despacho;
use App\Models\LoteProductoTerminado;
use App\Models\MovimientoInventario;
use App\Modules\Despacho\Repositories\Contracts\DespachoRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * DespachoService — Lógica de negocio para el despacho de PT (RFPROD03 / HU-027).
 *
 * Un despacho solo puede realizarse sobre lotes de PT ubicados en la bodega
 * de tipo 'ventas' (disponibles tras el traslado — Etapa 3 del ciclo productivo).
 *
 * Cada despacho:
 *  1. Descuenta cantidad_actual del lote PT.
 *  2. Registra un movimiento DESPACHO_SALIDA inmutable.
 *  3. Persiste el Despacho referenciando ese movimiento.
 *
 * Todas las escrituras ocurren dentro de DB::transaction() + lockForUpdate() (RFINV04).
 */
class DespachoService
{
    public function __construct(
        private readonly DespachoRepositoryInterface $repo,
    ) {}

    public function listarDespachos(): Collection
    {
        return $this->repo->todos();
    }

    public function obtenerDespacho(int $id): ?Despacho
    {
        return $this->repo->porId($id);
    }

    /**
     * Registra un despacho de PT desde el Área de Ventas.
     *
     * @throws \RuntimeException si el lote no está disponible para despacho o sin stock suficiente
     */
    public function despachar(array $data, int $userId): Despacho
    {
        $lotePt   = LoteProductoTerminado::with('bodega')->findOrFail($data['lote_pt_id']);
        $cantidad = (float) $data['cantidad'];

        if (! $lotePt->estaDisponibleParaDespacho()) {
            throw new \RuntimeException(
                "El lote #{$lotePt->id} no está disponible para despacho. " .
                "Debe estar en el Área de Ventas (bodega tipo 'ventas') y tener stock."
            );
        }

        if (! $lotePt->tieneStockSuficiente($cantidad)) {
            throw new \RuntimeException(json_encode([
                'lote_pt_id'  => $lotePt->id,
                'disponible'  => round((float) $lotePt->cantidad_actual, 3),
                'solicitada'  => $cantidad,
                'faltante'    => round($cantidad - (float) $lotePt->cantidad_actual, 3),
            ]));
        }

        return DB::transaction(function () use ($lotePt, $cantidad, $userId, $data) {
            // Bloqueo pesimista — evita doble despacho bajo concurrencia (RNFPER-04)
            $lotePt = LoteProductoTerminado::lockForUpdate()->find($lotePt->id);

            // Verificación post-lock (puede haber cambiado el stock)
            if (! $lotePt->tieneStockSuficiente($cantidad)) {
                throw new \RuntimeException(json_encode([
                    'lote_pt_id'  => $lotePt->id,
                    'disponible'  => round((float) $lotePt->cantidad_actual, 3),
                    'solicitada'  => $cantidad,
                    'faltante'    => round($cantidad - (float) $lotePt->cantidad_actual, 3),
                ]));
            }

            // Descontar stock del lote PT
            $lotePt->decrement('cantidad_actual', $cantidad);

            // Registrar movimiento DESPACHO_SALIDA (inmutable — HU-027)
            $movimiento = MovimientoInventario::create([
                'tipo'        => MovimientoInventario::TIPO_DESPACHO_SALIDA,
                'entidad_tipo'=> MovimientoInventario::ENTIDAD_PRODUCTO_TERMINADO,
                'entidad_id'  => $lotePt->id,
                'bodega_id'   => $lotePt->bodega_id,
                'cantidad'    => $cantidad,
                'user_id'     => $userId,
                'observaciones'=> $data['referencia_cliente'] ?? null,
            ]);

            // Crear registro de despacho
            $despacho = $this->repo->crear([
                'lote_pt_id'         => $lotePt->id,
                'user_id'            => $userId,
                'cantidad'           => $cantidad,
                'referencia_cliente' => $data['referencia_cliente'] ?? null,
                'movimiento_id'      => $movimiento->id,
            ]);

            return $this->repo->porId($despacho->id);
        });
    }
}
