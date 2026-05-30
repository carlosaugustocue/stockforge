<?php

namespace App\Modules\Despacho\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Despacho\Requests\CreateDespachoRequest;
use App\Modules\Despacho\Resources\DespachoResource;
use App\Modules\Despacho\Services\DespachoService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;

/**
 * DespachoController — Gestión de salidas de PT hacia clientes.
 *
 * GET    /despachos        → listarDespachos  (despachos.leer)
 * GET    /despachos/{id}   → verDespacho      (despachos.leer)
 * POST   /despachos        → registrar        (despachos.escribir)
 *
 * Acceso: despachos.leer / despachos.escribir (RNFSEC-04)
 * Solo lotes en bodega tipo 'ventas' pueden despacharse (RFPROD03 — Etapa 3).
 */
class DespachoController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly DespachoService $service,
    ) {}

    public function listarDespachos(): JsonResponse
    {
        $despachos = $this->service->listarDespachos();
        return $this->successResponse(DespachoResource::collection($despachos), 'Despachos listados.');
    }

    public function verDespacho(int $id): JsonResponse
    {
        $despacho = $this->service->obtenerDespacho($id);
        if (! $despacho) {
            return $this->errorResponse('Despacho no encontrado.', 404);
        }
        return $this->successResponse(new DespachoResource($despacho), 'Despacho encontrado.');
    }

    public function registrar(CreateDespachoRequest $request): JsonResponse
    {
        try {
            $despacho = $this->service->despachar($request->validated(), $request->user()->id);
            return $this->createdResponse(new DespachoResource($despacho), 'Despacho registrado correctamente.');
        } catch (\RuntimeException $e) {
            $detalle = json_decode($e->getMessage(), true);
            $mensaje = $detalle
                ? "Stock insuficiente en el lote. Disponible: {$detalle['disponible']}, solicitado: {$detalle['solicitada']}."
                : $e->getMessage();
            return $this->errorResponse($mensaje, 422, $detalle ?? []);
        }
    }
}
