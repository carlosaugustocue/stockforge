<?php

namespace App\Modules\Inventario\Services;

use App\Models\MateriaPrima;
use App\Modules\Inventario\Repositories\Contracts\InventarioRepositoryInterface;
use Illuminate\Support\Collection;

/**
 * InventarioService — Lógica de consulta del inventario de materias primas.
 *
 * El stock actual de cada lote vive en lotes_materia_prima.cantidad_actual.
 * Este servicio agrega esa información por MP y bodega para los endpoints
 * de consulta (inventario.leer — RFINV01 / HU-002).
 *
 * No realiza escrituras — las operaciones de stock ocurren en Recepciones y Producción.
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
