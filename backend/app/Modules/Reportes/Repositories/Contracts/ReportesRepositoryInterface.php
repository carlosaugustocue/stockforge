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
}
