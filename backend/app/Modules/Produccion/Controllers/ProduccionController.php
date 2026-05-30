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

    public function listarOrdenes(): JsonResponse
    {
        $ordenes = $this->service->listarOrdenes();
        return $this->successResponse(OrdenProduccionResource::collection($ordenes), 'Órdenes de producción listadas.');
    }

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

    public function verOrden(int $id): JsonResponse
    {
        $orden = $this->service->obtenerOrden($id);
        if (! $orden) {
            return $this->errorResponse('Orden de producción no encontrada.', 404);
        }
        return $this->successResponse(new OrdenProduccionResource($orden), 'Orden de producción encontrada.');
    }

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
