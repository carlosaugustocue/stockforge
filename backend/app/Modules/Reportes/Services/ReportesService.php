<?php

namespace App\Modules\Reportes\Services;

use App\Models\MateriaPrima;
use App\Models\MovimientoInventario;
use App\Modules\Reportes\Repositories\Contracts\ReportesRepositoryInterface;

/**
 * ReportesService — Agrega y formatea datos para los reportes del sistema.
 *
 * Solo lectura — no realiza escrituras en BD.
 * Acceso restringido al permiso 'reportes.leer' (Gerencia, Jefe, Encargado).
 */
class ReportesService
{
    public function __construct(
        private readonly ReportesRepositoryInterface $repo,
    ) {}

    /**
     * KPIs globales para el dashboard de gestión.
     *
     * Retorna indicadores clave: producciones por estado, despachos recientes,
     * MP recibida reciente y alertas de stock bajo reorden.
     */
    public function kpis(): array
    {
        $hoy   = now()->toDateString();
        $mes   = now()->startOfMonth()->toDateString();

        $ordenes = $this->repo->conteoOrdenesPorEstado();

        // Alertas: MP cuyo stock total < punto_reorden
        $alertas = MateriaPrima::with('lotes')
            ->where('activa', true)
            ->get()
            ->filter(fn($mp) => $mp->lotes->sum('cantidad_actual') < (float) $mp->punto_reorden)
            ->count();

        return [
            'ordenes_produccion' => [
                'pendientes'  => $ordenes['pendiente']  ?? 0,
                'producidas'  => $ordenes['producido']  ?? 0,
                'completadas' => $ordenes['completada'] ?? 0,
                'anuladas'    => $ordenes['anulada']    ?? 0,
                'total'       => array_sum($ordenes),
            ],
            'despachos_mes'     => $this->repo->totalDespachado($mes, $hoy),
            'mp_recibida_mes'   => $this->repo->totalMpRecibida($mes, $hoy),
            'alertas_reorden'   => $alertas,
            'periodo'           => ['desde' => $mes, 'hasta' => $hoy],
        ];
    }

    /**
     * Reporte de producción por período.
     *
     * Incluye detalle de cada orden: PT, cantidades planificadas vs producidas y estado.
     */
    public function reporteProduccion(?string $desde, ?string $hasta): array
    {
        $ordenes = $this->repo->ordenesPorPeriodo($desde, $hasta);

        $detalle = $ordenes->map(fn($o) => [
            'id'                   => $o->id,
            'estado'               => $o->estado,
            'fecha_planificada'    => $o->fecha_planificada?->toDateString(),
            'producto_terminado'   => $o->productoTerminado?->nombre,
            'unidad_medida'        => $o->productoTerminado?->unidadMedida?->nombre,
            'cantidad_planificada' => (float) $o->cantidad_planificada,
            'cantidad_producida'   => $o->cantidad_producida !== null ? (float) $o->cantidad_producida : null,
            'usuario'              => $o->usuario?->name,
        ])->values();

        $totalPlanificado = $ordenes->sum(fn($o) => (float) $o->cantidad_planificada);
        $totalProducido   = $ordenes->whereNotNull('cantidad_producida')->sum(fn($o) => (float) $o->cantidad_producida);

        return [
            'periodo'           => ['desde' => $desde, 'hasta' => $hasta],
            'total_ordenes'     => $ordenes->count(),
            'total_planificado' => round($totalPlanificado, 3),
            'total_producido'   => round($totalProducido, 3),
            'detalle'           => $detalle,
        ];
    }

    /**
     * Reporte de despachos por período.
     *
     * Incluye resumen por producto terminado y detalle de cada despacho.
     */
    public function reporteDespachos(?string $desde, ?string $hasta): array
    {
        $despachos = $this->repo->despachosPorPeriodo($desde, $hasta);

        $detalle = $despachos->map(fn($d) => [
            'id'                 => $d->id,
            'fecha'              => $d->created_at->toDateTimeString(),
            'producto_terminado' => $d->lotePt?->productoTerminado?->nombre,
            'unidad_medida'      => $d->lotePt?->productoTerminado?->unidadMedida?->nombre,
            'cantidad'           => (float) $d->cantidad,
            'referencia_cliente' => $d->referencia_cliente,
            'usuario'            => $d->usuario?->name,
        ])->values();

        // Resumen agrupado por producto terminado
        $porProducto = $despachos
            ->groupBy(fn($d) => $d->lotePt?->productoTerminado?->nombre ?? 'Sin producto')
            ->map(fn($grupo, $nombre) => [
                'producto_terminado' => $nombre,
                'total_despachado'   => round($grupo->sum(fn($d) => (float) $d->cantidad), 3),
                'num_despachos'      => $grupo->count(),
            ])->values();

        return [
            'periodo'         => ['desde' => $desde, 'hasta' => $hasta],
            'total_despachos' => $despachos->count(),
            'total_unidades'  => round($despachos->sum(fn($d) => (float) $d->cantidad), 3),
            'por_producto'    => $porProducto,
            'detalle'         => $detalle,
        ];
    }

    /**
     * Historial de movimientos de inventario con filtros opcionales.
     *
     * Permite trazabilidad completa por período, tipo de movimiento y entidad (HU-027).
     */
    public function reporteMovimientos(?string $desde, ?string $hasta, ?string $tipo, ?string $entidadTipo): array
    {
        $movimientos = $this->repo->movimientos($desde, $hasta, $tipo, $entidadTipo);

        $detalle = $movimientos->map(fn($m) => [
            'id'           => $m->id,
            'tipo'         => $m->tipo,
            'direccion'    => $m->esEntrada() ? 'entrada' : 'salida',
            'entidad_tipo' => $m->entidad_tipo,
            'entidad_id'   => $m->entidad_id,
            'bodega'       => $m->bodega?->nombre,
            'cantidad'     => (float) $m->cantidad,
            'usuario'      => $m->usuario?->name,
            'fecha'        => $m->created_at->toDateTimeString(),
            'compensatorio'=> $m->esCompensatorio(),
        ])->values();

        // Totales por tipo
        $porTipo = $movimientos
            ->groupBy('tipo')
            ->map(fn($grupo, $t) => [
                'tipo'     => $t,
                'cantidad' => round($grupo->sum(fn($m) => (float) $m->cantidad), 3),
                'count'    => $grupo->count(),
            ])->values();

        return [
            'filtros'  => ['desde' => $desde, 'hasta' => $hasta, 'tipo' => $tipo, 'entidad_tipo' => $entidadTipo],
            'total'    => $movimientos->count(),
            'por_tipo' => $porTipo,
            'detalle'  => $detalle,
        ];
    }

    /**
     * Stock actual de PT disponible para despacho.
     *
     * Solo lotes en bodega tipo 'ventas' con cantidad_actual > 0.
     * RFPROD03 — Solo PT trasladado a Ventas puede despacharse.
     */
    public function stockPt(): array
    {
        $lotes = $this->repo->stockPt();

        $detalle = $lotes->map(fn($l) => [
            'lote_id'            => $l->id,
            'producto_terminado' => $l->productoTerminado?->nombre,
            'unidad_medida'      => $l->productoTerminado?->unidadMedida?->nombre,
            'bodega'             => $l->bodega?->nombre,
            'cantidad_inicial'   => (float) $l->cantidad_inicial,
            'cantidad_actual'    => (float) $l->cantidad_actual,
            'fecha_produccion'   => $l->fecha_produccion?->toDateString(),
            'orden_produccion_id'=> $l->orden_produccion_id,
        ])->values();

        // Resumen agrupado por producto
        $porProducto = $lotes
            ->groupBy(fn($l) => $l->productoTerminado?->nombre ?? 'Sin producto')
            ->map(fn($grupo, $nombre) => [
                'producto_terminado' => $nombre,
                'stock_total'        => round($grupo->sum(fn($l) => (float) $l->cantidad_actual), 3),
                'lotes_activos'      => $grupo->count(),
            ])->values();

        return [
            'total_lotes'  => $lotes->count(),
            'por_producto' => $porProducto,
            'detalle'      => $detalle,
        ];
    }
}
