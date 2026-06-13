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
        // Carga todas las MP activas con sus lotes para evaluar stock total en PHP
        // (evita subconsulta con encrypted cast en punto_reorden — decimal comparado en app)
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
