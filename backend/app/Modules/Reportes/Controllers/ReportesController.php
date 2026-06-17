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
 * GET /reportes/indicadores     → indicadores    (4 KPIs operativos + datos para gráficos)
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

    /**
     * @OA\Get(
     *     path="/reportes/indicadores",
     *     summary="Indicadores operativos de inventario",
     *     description="Retorna los 4 KPIs logísticos (rotación, exactitud, nivel de servicio, utilización) más datos de tendencia para gráficos interactivos.",
     *     tags={"Reportes"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Indicadores calculados con datos para gráficos"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere reportes.leer)")
     * )
     */
    public function indicadores(): JsonResponse
    {
        return $this->successResponse($this->service->indicadoresOperativos(), 'Indicadores operativos del sistema.');
    }

    /**
     * @OA\Get(
     *     path="/reportes/kpis",
     *     summary="KPIs del mes actual",
     *     description="Retorna indicadores clave: órdenes por estado, total despachado, MP recibida, alertas de reorden.",
     *     tags={"Reportes"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="KPIs calculados"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere reportes.leer)")
     * )
     */
    public function kpis(): JsonResponse
    {
        return $this->successResponse($this->service->kpis(), 'KPIs del sistema.');
    }

    /**
     * @OA\Get(
     *     path="/reportes/produccion",
     *     summary="Reporte de producción por período",
     *     tags={"Reportes"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="desde", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="hasta", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Response(response=200, description="Órdenes de producción en el período"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso")
     * )
     */
    public function produccion(Request $request): JsonResponse
    {
        $data = $this->service->reporteProduccion(
            $request->query('fecha_desde'),
            $request->query('fecha_hasta'),
        );
        return $this->successResponse($data, 'Reporte de producción.');
    }

    /**
     * @OA\Get(
     *     path="/reportes/despachos",
     *     summary="Reporte de despachos por período",
     *     tags={"Reportes"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="desde", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="hasta", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Response(response=200, description="Despachos en el período"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso")
     * )
     */
    public function despachos(Request $request): JsonResponse
    {
        $data = $this->service->reporteDespachos(
            $request->query('fecha_desde'),
            $request->query('fecha_hasta'),
        );
        return $this->successResponse($data, 'Reporte de despachos.');
    }

    /**
     * @OA\Get(
     *     path="/reportes/movimientos",
     *     summary="Reporte de movimientos de inventario",
     *     tags={"Reportes"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="desde", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="hasta", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="tipo", in="query", required=false, description="Tipo de movimiento", @OA\Schema(type="string")),
     *     @OA\Parameter(name="entidad_tipo", in="query", required=false, @OA\Schema(type="string", enum={"materia_prima","producto_terminado"})),
     *     @OA\Response(response=200, description="Movimientos filtrados"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso")
     * )
     */
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

    /**
     * @OA\Get(
     *     path="/reportes/stock-pt",
     *     summary="Stock actual de productos terminados",
     *     tags={"Reportes"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Stock de PT por bodega"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso")
     * )
     */
    public function stockPt(): JsonResponse
    {
        return $this->successResponse($this->service->stockPt(), 'Stock de PT disponible para despacho.');
    }
}
