<?php

namespace App\Modules\Recepciones\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Recepciones\Requests\CreateOrdenPedidoRequest;
use App\Modules\Recepciones\Requests\CreateRecepcionRequest;
use App\Modules\Recepciones\Requests\UpdateOrdenPedidoRequest;
use App\Modules\Recepciones\Resources\OrdenPedidoResource;
use App\Modules\Recepciones\Resources\RecepcionResource;
use App\Modules\Recepciones\Services\RecepcionService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * RecepcionController — Orquesta las operaciones del módulo de recepciones.
 *
 * Endpoints de órdenes de pedido:
 *   GET    /recepciones/ordenes          → listarOrdenes
 *   POST   /recepciones/ordenes          → crearOrden
 *   GET    /recepciones/ordenes/{id}     → verOrden
 *   PATCH  /recepciones/ordenes/{id}     → actualizarOrden
 *
 * Endpoints de recepciones:
 *   GET    /recepciones                        → listarRecepciones
 *   POST   /recepciones/ordenes/{id}/recepciones → registrarRecepcion
 *   GET    /recepciones/{id}                   → verRecepcion
 *
 * Acceso: recepciones.leer / recepciones.escribir (RFREC / RNFSEC-04)
 */
class RecepcionController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly RecepcionService $service,
    ) {}

    // ── Órdenes de pedido ────────────────────────────────────────────────────

    public function listarOrdenes(): JsonResponse
    {
        $ordenes = $this->service->listarOrdenes();
        return $this->successResponse(OrdenPedidoResource::collection($ordenes), 'Órdenes de pedido listadas.');
    }

    public function crearOrden(CreateOrdenPedidoRequest $request): JsonResponse
    {
        $orden = $this->service->crearOrden($request->validated(), $request->user()->id);
        return $this->createdResponse(new OrdenPedidoResource($orden), 'Orden de pedido creada exitosamente.');
    }

    public function verOrden(int $id): JsonResponse
    {
        $orden = $this->service->obtenerOrden($id);
        if (! $orden) {
            return $this->errorResponse('Orden de pedido no encontrada.', 404);
        }
        return $this->successResponse(new OrdenPedidoResource($orden), 'Orden de pedido encontrada.');
    }

    public function actualizarOrden(UpdateOrdenPedidoRequest $request, int $id): JsonResponse
    {
        $orden = $this->service->obtenerOrden($id);
        if (! $orden) {
            return $this->errorResponse('Orden de pedido no encontrada.', 404);
        }

        $orden = $this->service->actualizarOrden($orden, $request->validated());
        return $this->successResponse(new OrdenPedidoResource($orden), 'Orden de pedido actualizada.');
    }

    // ── Recepciones ──────────────────────────────────────────────────────────

    public function listarRecepciones(): JsonResponse
    {
        $recepciones = $this->service->listarRecepciones();
        return $this->successResponse(RecepcionResource::collection($recepciones), 'Recepciones listadas.');
    }

    public function registrarRecepcion(CreateRecepcionRequest $request, int $ordenId): JsonResponse
    {
        $orden = $this->service->obtenerOrden($ordenId);
        if (! $orden) {
            return $this->errorResponse('Orden de pedido no encontrada.', 404);
        }

        try {
            $recepcion = $this->service->registrarRecepcion($orden, $request->validated(), $request->user()->id);
            return $this->createdResponse(new RecepcionResource($recepcion), 'Recepción registrada exitosamente.');
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    public function verRecepcion(int $id): JsonResponse
    {
        $recepcion = $this->service->obtenerRecepcion($id);
        if (! $recepcion) {
            return $this->errorResponse('Recepción no encontrada.', 404);
        }
        return $this->successResponse(new RecepcionResource($recepcion), 'Recepción encontrada.');
    }
}
