<?php

namespace App\Modules\Reportes\Repositories;

use App\Models\Despacho;
use App\Models\LoteMateriaPrima;
use App\Models\LoteProductoTerminado;
use App\Models\MovimientoInventario;
use App\Models\OrdenProduccion;
use App\Modules\Reportes\Repositories\Contracts\ReportesRepositoryInterface;
use Illuminate\Support\Collection;

/**
 * ReportesRepository — Solo consultas de lectura agregada para reportes.
 *
 * No realiza escrituras. Toda la lógica de agregación simple vive aquí;
 * la lógica de presentación y cálculos compuestos viven en ReportesService.
 */
class ReportesRepository implements ReportesRepositoryInterface
{
    public function conteoOrdenesPorEstado(): array
    {
        return OrdenProduccion::selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado')
            ->toArray();
    }

    public function totalDespachado(?string $desde, ?string $hasta): float
    {
        return (float) Despacho::when($desde, fn($q) => $q->whereDate('created_at', '>=', $desde))
            ->when($hasta, fn($q) => $q->whereDate('created_at', '<=', $hasta))
            ->sum('cantidad');
    }

    public function totalMpRecibida(?string $desde, ?string $hasta): float
    {
        return (float) LoteMateriaPrima::when($desde, fn($q) => $q->whereDate('fecha_ingreso', '>=', $desde))
            ->when($hasta, fn($q) => $q->whereDate('fecha_ingreso', '<=', $hasta))
            ->sum('cantidad_inicial');
    }

    public function ordenesPorPeriodo(?string $desde, ?string $hasta): Collection
    {
        return OrdenProduccion::with(['productoTerminado.unidadMedida', 'usuario'])
            ->when($desde, fn($q) => $q->whereDate('fecha_planificada', '>=', $desde))
            ->when($hasta, fn($q) => $q->whereDate('fecha_planificada', '<=', $hasta))
            ->latest()
            ->get();
    }

    public function despachosPorPeriodo(?string $desde, ?string $hasta): Collection
    {
        return Despacho::with(['lotePt.productoTerminado.unidadMedida', 'usuario'])
            ->when($desde, fn($q) => $q->whereDate('created_at', '>=', $desde))
            ->when($hasta, fn($q) => $q->whereDate('created_at', '<=', $hasta))
            ->latest()
            ->get();
    }

    public function movimientos(?string $desde, ?string $hasta, ?string $tipo, ?string $entidadTipo): Collection
    {
        return MovimientoInventario::with(['bodega', 'usuario'])
            ->when($desde, fn($q) => $q->whereDate('created_at', '>=', $desde))
            ->when($hasta, fn($q) => $q->whereDate('created_at', '<=', $hasta))
            ->when($tipo, fn($q) => $q->where('tipo', $tipo))
            ->when($entidadTipo, fn($q) => $q->where('entidad_tipo', $entidadTipo))
            ->latest()
            ->get();
    }

    public function stockPt(): Collection
    {
        return LoteProductoTerminado::with(['productoTerminado.unidadMedida', 'bodega', 'ordenProduccion'])
            ->whereHas('bodega', fn($q) => $q->where('tipo', 'ventas'))
            ->where('cantidad_actual', '>', 0)
            ->orderBy('fecha_produccion')
            ->get();
    }
}
