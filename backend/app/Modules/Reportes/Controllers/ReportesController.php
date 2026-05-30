<?php

namespace App\Modules\Reportes\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Reportes\Services\ReportesService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ReportesController — Endpoints de lectura agregada para gestión y dashboard.
 *
 * GET /reportes/kpis            → kpis           (indicadores globales del mes actual)
 * GET /reportes/produccion      → produccion      (órdenes por período)
 * GET /reportes/despachos       → despachos       (salidas por período)
 * GET /reportes/movimientos     → movimientos     (historial de inventario)
 * GET /reportes/stock-pt        → stockPt         (PT disponible en ventas)
 *
 * Todos bajo permiso 'reportes.leer' (Gerencia, Jefe Producción, Encargado Inventarios).
 * Parámetros de filtro opcionales: fecha_desde, fecha_hasta (formato Y-m-d).
 */
class ReportesController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly ReportesService $service,
    ) {}

    public function kpis(): JsonResponse
    {
        return $this->successResponse($this->service->kpis(), 'KPIs del sistema.');
    }

    public function produccion(Request $request): JsonResponse
    {
        $data = $this->service->reporteProduccion(
            $request->query('fecha_desde'),
            $request->query('fecha_hasta'),
        );
        return $this->successResponse($data, 'Reporte de producción.');
    }

    public function despachos(Request $request): JsonResponse
    {
        $data = $this->service->reporteDespachos(
            $request->query('fecha_desde'),
            $request->query('fecha_hasta'),
        );
        return $this->successResponse($data, 'Reporte de despachos.');
    }

    public function movimientos(Request $request): JsonResponse
    {
        $data = $this->service->reporteMovimientos(
            $request->query('fecha_desde'),
            $request->query('fecha_hasta'),
            $request->query('tipo'),
            $request->query('entidad_tipo'),
        );
        return $this->successResponse($data, 'Historial de movimientos de inventario.');
    }

    public function stockPt(): JsonResponse
    {
        return $this->successResponse($this->service->stockPt(), 'Stock de PT disponible para despacho.');
    }
}
