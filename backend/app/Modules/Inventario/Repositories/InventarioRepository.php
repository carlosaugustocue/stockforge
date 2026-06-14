<?php

namespace App\Modules\Inventario\Repositories;

use App\Models\LoteMateriaPrima;
use App\Models\MateriaPrima;
use App\Modules\Inventario\Repositories\Contracts\InventarioRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class InventarioRepository implements InventarioRepositoryInterface
{
    public function stockMateriaPrima(): Collection
    {
        return MateriaPrima::query()
            ->where('activa', true)
            ->with([
                'unidadMedida',
                'lotes' => fn($q) => $q
                    ->where('cantidad_actual', '>', 0)
                    ->with('bodega')
                    ->orderBy('fecha_vencimiento')
                    ->orderBy('fecha_ingreso'),
            ])
            ->orderBy('nombre')
            ->get();
    }

    public function stockMateriaPrimaPorId(int $id): ?MateriaPrima
    {
        return MateriaPrima::query()
            ->where('activa', true)
            ->with([
                'unidadMedida',
                'lotes' => fn($q) => $q
                    ->where('cantidad_actual', '>', 0)
                    ->with('bodega')
                    ->orderBy('fecha_vencimiento')
                    ->orderBy('fecha_ingreso'),
            ])
            ->find($id);
    }

    public function materiasprimasBajoReorden(): Collection
    {
        return MateriaPrima::query()
            ->where('activa', true)
            ->with([
                'unidadMedida',
                'lotes' => fn($q) => $q->where('cantidad_actual', '>', 0)->with('bodega'),
            ])
            ->get()
            ->filter(fn(MateriaPrima $mp) =>
                $mp->lotes->sum('cantidad_actual') < (float) $mp->punto_reorden
            )
            ->values();
    }

    public function lotePorId(int $id): ?LoteMateriaPrima
    {
        return LoteMateriaPrima::with(['bodega', 'materiaPrima'])->find($id);
    }

    /**
     * Todos los lotes de MP con cantidad_actual > 0, ordenados FEFO
     * (fecha_vencimiento ASC, fecha_ingreso ASC).
     */
    public function lotesActivosMp(): Collection
    {
        return LoteMateriaPrima::query()
            ->where('cantidad_actual', '>', 0)
            ->with(['materiaPrima.unidadMedida', 'bodega'])
            ->orderBy('fecha_vencimiento')
            ->orderBy('fecha_ingreso')
            ->get();
    }

    public function loteFefoEnBodega(int $mpId, int $bodegaId): ?LoteMateriaPrima
    {
        return LoteMateriaPrima::with(['bodega', 'materiaPrima'])
            ->where('materia_prima_id', $mpId)
            ->where('bodega_id', $bodegaId)
            ->where('cantidad_actual', '>', 0)
            ->orderByRaw('fecha_vencimiento IS NULL, fecha_vencimiento ASC')
            ->orderBy('fecha_ingreso')
            ->first();
    }
}
