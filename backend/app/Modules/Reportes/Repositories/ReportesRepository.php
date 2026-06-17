<?php

namespace App\Modules\Reportes\Repositories;

use App\Models\Despacho;
use App\Models\LoteMateriaPrima;
use App\Models\LoteProductoTerminado;
use App\Models\MovimientoInventario;
use App\Models\OrdenProduccion;
use App\Models\Recepcion;
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
            ->orderByDesc('id')
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

    public function consumoMpPeriodo(string $desde, string $hasta): float
    {
        return (float) MovimientoInventario::where('tipo', 'CONSUMO_MP')
            ->whereDate('created_at', '>=', $desde)
            ->whereDate('created_at', '<=', $hasta)
            ->sum('cantidad');
    }

    public function stockActualMp(): float
    {
        return (float) LoteMateriaPrima::sum('cantidad_actual');
    }

    public function lotesActivosMpCount(): int
    {
        return LoteMateriaPrima::where('cantidad_actual', '>', 0)->count();
    }

    public function totalLotesMpCount(): int
    {
        return LoteMateriaPrima::count();
    }

    public function despachosAgrupadosPorDia(string $desde, string $hasta): Collection
    {
        return Despacho::selectRaw('DATE(created_at) as fecha, SUM(cantidad) as total, COUNT(*) as num_despachos')
            ->whereDate('created_at', '>=', $desde)
            ->whereDate('created_at', '<=', $hasta)
            ->groupByRaw('DATE(created_at)')
            ->orderBy('fecha')
            ->get();
    }

    public function ordenesAgrupadasPorMes(string $desde, string $hasta): Collection
    {
        return OrdenProduccion::selectRaw("DATE_FORMAT(fecha_planificada, '%Y-%m') as mes, estado, COUNT(*) as total")
            ->whereDate('fecha_planificada', '>=', $desde)
            ->whereDate('fecha_planificada', '<=', $hasta)
            ->groupByRaw("DATE_FORMAT(fecha_planificada, '%Y-%m'), estado")
            ->orderBy('mes')
            ->get();
    }

    // ── Auditoría ─────────────────────────────────────────────────────────────

    public function auditRecepciones(?string $desde, ?string $hasta): Collection
    {
        return Recepcion::with([
            'ordenPedido',
            'usuario',
            'lotes.materiaPrima.unidadMedida',
            'lotes.bodega',
        ])
            ->when($desde, fn($q) => $q->whereDate('created_at', '>=', $desde))
            ->when($hasta, fn($q) => $q->whereDate('created_at', '<=', $hasta))
            ->latest()
            ->get();
    }

    public function auditProducciones(?string $desde, ?string $hasta): Collection
    {
        return OrdenProduccion::with([
            'productoTerminado.unidadMedida',
            'usuario',
            'requerimientos.materiaPrima.unidadMedida',
            'loteProductoTerminado.bodega',
        ])
            ->when($desde, fn($q) => $q->whereDate('fecha_planificada', '>=', $desde))
            ->when($hasta, fn($q) => $q->whereDate('fecha_planificada', '<=', $hasta))
            ->latest()
            ->get();
    }

    public function auditProduccionDetalle(int $id): ?object
    {
        return OrdenProduccion::with([
            'productoTerminado.unidadMedida',
            'usuario',
            'requerimientos.materiaPrima.unidadMedida',
            'loteProductoTerminado.bodega',
        ])->find($id);
    }

    public function auditDespachos(?string $desde, ?string $hasta): Collection
    {
        return Despacho::with([
            'usuario',
            'cliente',
            'lotePt.productoTerminado.unidadMedida',
            'lotePt.bodega',
            'lotePt.ordenProduccion.usuario',
        ])
            ->when($desde, fn($q) => $q->whereDate('created_at', '>=', $desde))
            ->when($hasta, fn($q) => $q->whereDate('created_at', '<=', $hasta))
            ->latest()
            ->get();
    }

    public function auditTrasladosMp(?string $desde, ?string $hasta): Collection
    {
        return MovimientoInventario::with(['bodega', 'usuario'])
            ->whereIn('tipo', [
                MovimientoInventario::TIPO_TRASLADO_SALIDA,
                MovimientoInventario::TIPO_TRASLADO_ENTRADA,
            ])
            ->where('entidad_tipo', MovimientoInventario::ENTIDAD_MATERIA_PRIMA)
            ->when($desde, fn($q) => $q->whereDate('created_at', '>=', $desde))
            ->when($hasta, fn($q) => $q->whereDate('created_at', '<=', $hasta))
            ->latest()
            ->orderByDesc('id')
            ->get();
    }
}
