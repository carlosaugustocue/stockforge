<?php

namespace App\Modules\Produccion\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Produccion\Requests\CreateOrdenProduccionRequest;
use App\Modules\Produccion\Requests\EjecutarProduccionRequest;
use App\Modules\Produccion\Resources\OrdenProduccionResource;
use App\Modules\Produccion\Services\ProduccionService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ProduccionController — Orquesta el ciclo productivo (RFPROD01-05).
 *
 * GET    /produccion/ordenes              → listarOrdenes
 * POST   /produccion/ordenes              → crearOrden      (Etapa 1)
 * GET    /produccion/ordenes/{id}         → verOrden
 * POST   /produccion/ordenes/{id}/ejecutar    → ejecutar    (Etapa 2 — consume MP)
 * POST   /produccion/ordenes/{id}/traslado-pt → trasladarPt (Etapa 3 → Ventas)
 * PATCH  /produccion/ordenes/{id}/anular  → anularOrden
 *
 * Acceso: produccion.leer / produccion.escribir (RNFSEC-04)
 */
class ProduccionController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly ProduccionService $service,
    ) {}

    /**
     * @OA\Get(
     *     path="/produccion/ordenes",
     *     summary="Listar órdenes de producción",
     *     tags={"Producción"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Listado de órdenes"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere produccion.leer)")
     * )
     */
    public function listarOrdenes(): JsonResponse
    {
        $ordenes = $this->service->listarOrdenes();
        return $this->successResponse(OrdenProduccionResource::collection($ordenes), 'Órdenes de producción listadas.');
    }

    /**
     * @OA\Post(
     *     path="/produccion/ordenes",
     *     summary="Crear orden de producción",
     *     description="Etapa 1: planifica la producción de un producto terminado (RFPROD01).",
     *     tags={"Producción"},
     *     security={{"sanctum":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"producto_terminado_id","cantidad_planificada","fecha_planificada"},
     *             @OA\Property(property="producto_terminado_id", type="integer", example=1),
     *             @OA\Property(property="cantidad_planificada", type="number", example=100),
     *             @OA\Property(property="fecha_planificada", type="string", format="date", example="2026-06-01")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Orden creada en estado pendiente"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere produccion.escribir)"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function crearOrden(CreateOrdenProduccionRequest $request): JsonResponse
    {
        try {
            $orden = $this->service->crearOrden($request->validated(), $request->user()->id);
            return $this->createdResponse(new OrdenProduccionResource($orden), 'Orden de producción creada.');
        } catch (\RuntimeException $e) {
            $detalle = json_decode($e->getMessage(), true);
            return $this->errorResponse(
                "Stock insuficiente de '{$detalle['materia_prima']}'. Disponible: {$detalle['disponible']}, faltante: {$detalle['faltante']}.",
                422,
                $detalle
            );
        }
    }

    /**
     * @OA\Get(
     *     path="/produccion/ordenes/{id}",
     *     summary="Ver orden de producción",
     *     tags={"Producción"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Detalle de la orden con consumos"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="No encontrada")
     * )
     */
    public function verOrden(int $id): JsonResponse
    {
        $orden = $this->service->obtenerOrden($id);
        if (! $orden) {
            return $this->errorResponse('Orden de producción no encontrada.', 404);
        }
        return $this->successResponse(new OrdenProduccionResource($orden), 'Orden de producción encontrada.');
    }

    /**
     * @OA\Post(
     *     path="/produccion/ordenes/{id}/ejecutar",
     *     summary="Ejecutar orden de producción",
     *     description="Etapa 2: descuenta MP de Bodega Principal usando selección FEFO (RFPROD02). Rechaza si falta stock.",
     *     tags={"Producción"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"cantidad_producida"},
     *             @OA\Property(property="cantidad_producida", type="number", example=95)
     *         )
     *     ),
     *     @OA\Response(response=200, description="Producción ejecutada, MP descontada, lote PT creado en Bodega Producción"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=422, description="Stock insuficiente — indica qué MP falta y cuánta (RFPROD05)")
     * )
     */
    public function ejecutar(EjecutarProduccionRequest $request, int $id): JsonResponse
    {
        $orden = $this->service->obtenerOrden($id);
        if (! $orden) {
            return $this->errorResponse('Orden de producción no encontrada.', 404);
        }

        try {
            $orden = $this->service->ejecutarProduccion($orden, $request->validated(), $request->user()->id);
            return $this->successResponse(new OrdenProduccionResource($orden), 'Producción ejecutada. MP consumida, PT creado en Planta de Producción.');
        } catch (\RuntimeException $e) {
            $detalle = json_decode($e->getMessage(), true);
            $mensaje = $detalle
                ? "Stock insuficiente de '{$detalle['materia_prima']}'. Disponible: {$detalle['disponible']}, faltante: {$detalle['faltante']}."
                : $e->getMessage();
            return $this->errorResponse($mensaje, 422, $detalle ?? []);
        }
    }

    /**
     * @OA\Post(
     *     path="/produccion/ordenes/{id}/traslado-pt",
     *     summary="Trasladar PT a Bodega Ventas",
     *     description="Etapa 3: mueve el producto terminado de Bodega Producción a Bodega Ventas para despacho (RFPROD03).",
     *     tags={"Producción"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="PT trasladado a Bodega Ventas"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=422, description="Orden no ejecutada o ya trasladada")
     * )
     */
    public function trasladarPt(Request $request, int $id): JsonResponse
    {
        $orden = $this->service->obtenerOrden($id);
        if (! $orden) {
            return $this->errorResponse('Orden de producción no encontrada.', 404);
        }

        try {
            $orden = $this->service->trasladarPtAVentas($orden, $request->user()->id);
            return $this->successResponse(new OrdenProduccionResource($orden), 'PT trasladado a Área de Ventas. Disponible para despacho.');
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * @OA\Patch(
     *     path="/produccion/ordenes/{id}/anular",
     *     summary="Anular orden de producción",
     *     description="Crea movimientos compensatorios inmutables. No borra registros (HU-027).",
     *     tags={"Producción"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Orden anulada con movimiento compensatorio"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=422, description="No se puede anular en el estado actual")
     * )
     */
    public function anular(int $id): JsonResponse
    {
        $orden = $this->service->obtenerOrden($id);
        if (! $orden) {
            return $this->errorResponse('Orden de producción no encontrada.', 404);
        }

        try {
            $orden = $this->service->anularOrden($orden);
            return $this->successResponse(new OrdenProduccionResource($orden), 'Orden de producción anulada.');
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }
}
