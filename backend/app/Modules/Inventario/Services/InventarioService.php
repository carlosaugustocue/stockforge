<?php

namespace App\Modules\Inventario\Services;

use App\Models\LoteMateriaPrima;
use App\Models\MateriaPrima;
use App\Models\MovimientoInventario;
use App\Modules\Inventario\Repositories\Contracts\InventarioRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * InventarioService — Lógica de consulta del inventario de materias primas.
 *
 * El stock actual de cada lote vive en lotes_materia_prima.cantidad_actual.
 * Este servicio agrega esa información por MP y bodega para los endpoints
 * de consulta (inventario.leer — RFINV01 / HU-002).
 *
 * También gestiona traslados de MP entre bodegas (inventario.escribir — RFINV04).
 */
class InventarioService
{
    public function __construct(
        private readonly InventarioRepositoryInterface $repo,
    ) {}

    /**
     * Retorna el stock actual de todas las MP activas.
     * Cada ítem incluye: totales globales, desglose por bodega y flag bajo_reorden.
     */
    public function stockMateriaPrima(): Collection
    {
        return $this->repo->stockMateriaPrima()
            ->map(fn(MateriaPrima $mp) => $this->formatearStockMp($mp));
    }

    /**
     * Retorna el stock actual de una MP específica.
     * Null si no existe o está inactiva.
     */
    public function stockMateriaPrimaPorId(int $id): ?array
    {
        $mp = $this->repo->stockMateriaPrimaPorId($id);
        return $mp ? $this->formatearStockMp($mp) : null;
    }

    /**
     * Retorna MP cuyo stock total es menor al punto de reorden.
     * Estas MP requieren una nueva orden de pedido (alerta de reposición).
     */
    public function alertasBajoReorden(): Collection
    {
        return $this->repo->materiasprimasBajoReorden()
            ->map(fn(MateriaPrima $mp) => [
                ...$this->formatearStockMp($mp),
                'faltante' => max(0, (float) $mp->punto_reorden - $mp->lotes->sum('cantidad_actual')),
            ]);
    }

    /**
     * Retorna todos los lotes activos de MP con detalle por lote (RFINV02).
     * Ordenados FEFO para que el operario sepa qué usar primero.
     */
    public function lotesActivosMp(): array
    {
        return $this->repo->lotesActivosMp()
            ->map(fn(LoteMateriaPrima $lote) => [
                'lote_id'          => $lote->id,
                'materia_prima_id' => $lote->materia_prima_id,
                'materia_prima'    => $lote->materiaPrima?->nombre,
                'unidad_medida'    => $lote->materiaPrima?->unidadMedida?->nombre,
                'bodega_id'        => $lote->bodega_id,
                'bodega'           => $lote->bodega?->nombre,
                'tipo_bodega'      => $lote->bodega?->tipo,
                'cantidad_inicial' => round((float) $lote->cantidad_inicial, 3),
                'cantidad_actual'  => round((float) $lote->cantidad_actual, 3),
                'fecha_vencimiento'=> $lote->fecha_vencimiento?->toDateString(),
                'fecha_ingreso'    => $lote->fecha_ingreso?->toDateTimeString(),
            ])
            ->values()
            ->all();
    }

    /**
     * Traslada una cantidad de MP de una bodega a otra (RFINV04).
     *
     * Si la cantidad es menor al stock del lote, se reduce cantidad_actual del lote
     * origen y se crea un nuevo lote en la bodega destino heredando recepcion_id
     * y fecha_vencimiento (trazabilidad completa — RFINV02).
     *
     * Si la cantidad es igual al stock del lote, se actualiza bodega_id directamente.
     *
     * Genera movimientos TRASLADO_SALIDA y TRASLADO_ENTRADA inmutables (HU-027).
     * Toda la operación ocurre en DB::transaction() con lockForUpdate() (RFINV04).
     *
     * @throws \RuntimeException si stock insuficiente o bodega destino igual a origen
     */
    public function trasladar(int $mpId, int $bodegaOrigenId, int $bodegaDestinoId, float $cantidad, int $userId): array
    {
        if ($bodegaOrigenId === $bodegaDestinoId) {
            throw new \RuntimeException('La bodega destino debe ser diferente a la bodega de origen.');
        }

        // Seleccionar el lote más próximo a vencer en la bodega origen (FEFO — RFINV03)
        $lote = $this->repo->loteFefoEnBodega($mpId, $bodegaOrigenId);

        if (! $lote) {
            throw new \RuntimeException('No hay stock disponible de esa materia prima en la bodega de origen.');
        }

        if (! $lote->tieneStockSuficiente($cantidad)) {
            throw new \RuntimeException(json_encode([
                'lote_id'    => $lote->id,
                'disponible' => round((float) $lote->cantidad_actual, 3),
                'solicitada' => $cantidad,
                'faltante'   => round($cantidad - (float) $lote->cantidad_actual, 3),
            ]));
        }

        return DB::transaction(function () use ($lote, $bodegaDestinoId, $cantidad, $userId) {
            // Bloqueo pesimista — evita doble traslado bajo concurrencia (RNFPER-04)
            $lote = LoteMateriaPrima::lockForUpdate()->find($lote->id);

            if (! $lote->tieneStockSuficiente($cantidad)) {
                throw new \RuntimeException(json_encode([
                    'lote_id'    => $lote->id,
                    'disponible' => round((float) $lote->cantidad_actual, 3),
                    'solicitada' => $cantidad,
                    'faltante'   => round($cantidad - (float) $lote->cantidad_actual, 3),
                ]));
            }

            $bodegaOrigen = $lote->bodega_id;
            $esTraslado   = (float) $lote->cantidad_actual === $cantidad;

            if ($esTraslado) {
                // Traslado total: mover el lote completo actualizando bodega_id
                $lote->update(['bodega_id' => $bodegaDestinoId]);
                $loteDestino = $lote;
            } else {
                // Traslado parcial: reducir origen y crear nuevo lote en destino
                $lote->decrement('cantidad_actual', $cantidad);
                $loteDestino = LoteMateriaPrima::create([
                    'recepcion_id'     => $lote->recepcion_id,
                    'materia_prima_id' => $lote->materia_prima_id,
                    'bodega_id'        => $bodegaDestinoId,
                    'cantidad_inicial' => $cantidad,
                    'cantidad_actual'  => $cantidad,
                    'fecha_vencimiento'=> $lote->fecha_vencimiento,
                    'fecha_ingreso'    => $lote->fecha_ingreso,
                ]);
            }

            // Movimiento SALIDA desde bodega origen (inmutable — HU-027)
            MovimientoInventario::create([
                'tipo'        => MovimientoInventario::TIPO_TRASLADO_SALIDA,
                'entidad_tipo'=> MovimientoInventario::ENTIDAD_MATERIA_PRIMA,
                'entidad_id'  => $lote->id,
                'bodega_id'   => $bodegaOrigen,
                'cantidad'    => $cantidad,
                'user_id'     => $userId,
            ]);

            // Movimiento ENTRADA en bodega destino (inmutable — HU-027)
            MovimientoInventario::create([
                'tipo'        => MovimientoInventario::TIPO_TRASLADO_ENTRADA,
                'entidad_tipo'=> MovimientoInventario::ENTIDAD_MATERIA_PRIMA,
                'entidad_id'  => $loteDestino->id,
                'bodega_id'   => $bodegaDestinoId,
                'cantidad'    => $cantidad,
                'user_id'     => $userId,
            ]);

            return [
                'lote_origen_id'   => $lote->id,
                'lote_destino_id'  => $loteDestino->id,
                'materia_prima'    => $lote->materiaPrima->nombre,
                'cantidad'         => $cantidad,
                'bodega_origen_id' => $bodegaOrigen,
                'bodega_destino_id'=> $bodegaDestinoId,
                'traslado_total'   => $esTraslado,
            ];
        });
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    private function formatearStockMp(MateriaPrima $mp): array
    {
        $stockTotal = (float) $mp->lotes->sum('cantidad_actual');
        $ptoReorden = (float) $mp->punto_reorden;

        $porBodega = $mp->lotes
            ->groupBy('bodega_id')
            ->map(fn($lotes, $bodegaId) => [
                'bodega_id'   => $bodegaId,
                'bodega'      => $lotes->first()->bodega->nombre,
                'stock'       => round($lotes->sum('cantidad_actual'), 3),
                'lotes_activos' => $lotes->count(),
                'proximo_vencimiento' => $lotes
                    ->whereNotNull('fecha_vencimiento')
                    ->sortBy('fecha_vencimiento')
                    ->first()?->fecha_vencimiento?->toDateString(),
            ])
            ->values();

        return [
            'materia_prima_id' => $mp->id,
            'nombre'           => $mp->nombre,
            'unidad_medida'    => $mp->unidadMedida->nombre,
            'punto_reorden'    => $ptoReorden,
            'stock_total'      => round($stockTotal, 3),
            'bajo_reorden'     => $stockTotal < $ptoReorden,
            'por_bodega'       => $porBodega,
        ];
    }
}
