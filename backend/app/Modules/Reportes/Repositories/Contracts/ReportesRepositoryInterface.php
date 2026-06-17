<?php

namespace App\Modules\Reportes\Repositories\Contracts;

use Illuminate\Support\Collection;

interface ReportesRepositoryInterface
{
    /** Conteo de órdenes de producción agrupadas por estado */
    public function conteoOrdenesPorEstado(): array;

    /** Suma total de unidades despachadas en el período */
    public function totalDespachado(?string $desde, ?string $hasta): float;

    /** Suma total de MP recibida (cantidad_inicial de lotes) en el período */
    public function totalMpRecibida(?string $desde, ?string $hasta): float;

    /** Órdenes de producción en el período con detalle de PT */
    public function ordenesPorPeriodo(?string $desde, ?string $hasta): Collection;

    /** Despachos en el período con detalle de PT y cliente */
    public function despachosPorPeriodo(?string $desde, ?string $hasta): Collection;

    /** Movimientos de inventario filtrados por período, tipo y entidad */
    public function movimientos(?string $desde, ?string $hasta, ?string $tipo, ?string $entidadTipo): Collection;

    /** Lotes de PT disponibles para despacho (bodega tipo ventas, stock > 0) */
    public function stockPt(): Collection;

    /** Suma total de consumos de MP (movimientos CONSUMO_MP) en el período */
    public function consumoMpPeriodo(string $desde, string $hasta): float;

    /** Suma de cantidad_actual de todos los lotes de MP activos */
    public function stockActualMp(): float;

    /** Conteo de lotes de MP con cantidad_actual > 0 */
    public function lotesActivosMpCount(): int;

    /** Conteo total de lotes de MP creados */
    public function totalLotesMpCount(): int;

    /** Despachos agrupados por día (para gráfico de tendencia) */
    public function despachosAgrupadosPorDia(string $desde, string $hasta): Collection;

    /** Órdenes de producción agrupadas por mes (para gráfico de tendencia) */
    public function ordenesAgrupadasPorMes(string $desde, string $hasta): Collection;
}
