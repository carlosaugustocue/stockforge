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
     * Indicadores operativos de inventario para el dashboard de gestión.
     *
     * Calcula los 4 KPIs logísticos estándar más datos de tendencia para gráficos.
     *
     * 1. Rotación de inventario   = consumo_mp_mes / stock_actual_mp
     * 2. Exactitud de inventario  = (MPs en nivel correcto / total MPs) × 100
     * 3. Nivel de servicio        = (órdenes completadas / órdenes no anuladas) × 100
     * 4. Utilización de almacén   = (lotes activos / total lotes) × 100
     */
    public function indicadoresOperativos(): array
    {
        $hoy  = now()->toDateString();
        $mes  = now()->startOfMonth()->toDateString();
        $hace6Meses = now()->subMonths(6)->startOfMonth()->toDateString();
        $hace30Dias = now()->subDays(29)->toDateString();

        // ── 1. Rotación de inventario ──────────────────────────────────────
        $consumoMes  = $this->repo->consumoMpPeriodo($mes, $hoy);
        $stockActual = $this->repo->stockActualMp();
        $rotacion    = $stockActual > 0 ? round($consumoMes / $stockActual, 2) : 0.0;

        // ── 2. Exactitud de inventario ─────────────────────────────────────
        $totalMps = MateriaPrima::where('activa', true)->count();
        $mpsBajoReorden = MateriaPrima::with('lotes')
            ->where('activa', true)->get()
            ->filter(fn($mp) => $mp->lotes->sum('cantidad_actual') < (float) $mp->punto_reorden)
            ->count();
        $exactitud = $totalMps > 0
            ? round((($totalMps - $mpsBajoReorden) / $totalMps) * 100, 1)
            : 100.0;

        // ── 3. Nivel de servicio ───────────────────────────────────────────
        $ordenes         = $this->repo->conteoOrdenesPorEstado();
        $completadas     = $ordenes['completada'] ?? 0;
        $noAnuladas      = ($ordenes['pendiente'] ?? 0) + ($ordenes['producido'] ?? 0) + $completadas;
        $nivelServicio   = $noAnuladas > 0 ? round(($completadas / $noAnuladas) * 100, 1) : 100.0;

        // ── 4. Utilización de almacén ──────────────────────────────────────
        $totalLotes  = $this->repo->totalLotesMpCount();
        $lotesActivos = $this->repo->lotesActivosMpCount();
        $utilizacion = $totalLotes > 0 ? round(($lotesActivos / $totalLotes) * 100, 1) : 0.0;

        // ── Datos para gráficos ────────────────────────────────────────────
        $despachosLinea = $this->repo->despachosAgrupadosPorDia($hace30Dias, $hoy)
            ->map(fn($r) => ['fecha' => $r->fecha, 'total' => (float) $r->total, 'num' => (int) $r->num_despachos])
            ->values();

        $produccionBarras = $this->repo->ordenesAgrupadasPorMes($hace6Meses, $hoy)
            ->groupBy('mes')
            ->map(fn($grupo, $mes) => [
                'mes'        => $mes,
                'completada' => (int) ($grupo->firstWhere('estado', 'completada')?->total ?? 0),
                'producido'  => (int) ($grupo->firstWhere('estado', 'producido')?->total ?? 0),
                'pendiente'  => (int) ($grupo->firstWhere('estado', 'pendiente')?->total ?? 0),
                'anulada'    => (int) ($grupo->firstWhere('estado', 'anulada')?->total ?? 0),
            ])->values();

        $distribucionOrdenes = collect($ordenes)->map(fn($total, $estado) => [
            'estado' => $estado,
            'total'  => (int) $total,
        ])->values();

        return [
            'indicadores' => [
                'rotacion_inventario' => [
                    'valor'       => $rotacion,
                    'unidad'      => 'veces',
                    'descripcion' => 'Consumo MP / Stock actual. Mayor = mayor flujo.',
                    'estado'      => $rotacion >= 1.5 ? 'bueno' : ($rotacion >= 0.5 ? 'medio' : 'bajo'),
                ],
                'exactitud_inventario' => [
                    'valor'       => $exactitud,
                    'unidad'      => '%',
                    'descripcion' => 'MPs en nivel correcto vs total MPs activas.',
                    'estado'      => $exactitud >= 80 ? 'bueno' : ($exactitud >= 60 ? 'medio' : 'bajo'),
                ],
                'nivel_servicio' => [
                    'valor'       => $nivelServicio,
                    'unidad'      => '%',
                    'descripcion' => 'Órdenes completadas vs órdenes no anuladas.',
                    'estado'      => $nivelServicio >= 85 ? 'bueno' : ($nivelServicio >= 70 ? 'medio' : 'bajo'),
                ],
                'utilizacion_almacen' => [
                    'valor'       => $utilizacion,
                    'unidad'      => '%',
                    'descripcion' => 'Lotes MP activos vs total lotes registrados.',
                    'estado'      => $utilizacion >= 50 ? 'bueno' : ($utilizacion >= 25 ? 'medio' : 'bajo'),
                ],
            ],
            'graficos' => [
                'despachos_30d'         => $despachosLinea,
                'produccion_6m'         => $produccionBarras,
                'distribucion_ordenes'  => $distribucionOrdenes,
            ],
            'periodo' => ['desde' => $mes, 'hasta' => $hoy],
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
