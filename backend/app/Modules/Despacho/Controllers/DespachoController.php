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

    /**
     * @OA\Get(
     *     path="/despachos",
     *     summary="Listar despachos",
     *     tags={"Despacho"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Listado de despachos"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere despachos.leer)")
     * )
     */
    public function listarDespachos(): JsonResponse
    {
        $despachos = $this->service->listarDespachos();
        return $this->successResponse(DespachoResource::collection($despachos), 'Despachos listados.');
    }

    /**
     * @OA\Get(
     *     path="/despachos/{id}",
     *     summary="Ver despacho",
     *     tags={"Despacho"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Detalle del despacho"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="No encontrado")
     * )
     */
    public function verDespacho(int $id): JsonResponse
    {
        $despacho = $this->service->obtenerDespacho($id);
        if (! $despacho) {
            return $this->errorResponse('Despacho no encontrado.', 404);
        }
        return $this->successResponse(new DespachoResource($despacho), 'Despacho encontrado.');
    }

    /**
     * @OA\Post(
     *     path="/despachos",
     *     summary="Registrar despacho",
     *     description="Registra la salida de un producto terminado desde Bodega Ventas hacia un cliente (RFPROD03 / HU-027).",
     *     tags={"Despacho"},
     *     security={{"sanctum":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"lote_pt_id","cantidad","cliente"},
     *             @OA\Property(property="lote_pt_id", type="integer", example=1),
     *             @OA\Property(property="cantidad", type="number", example=50),
     *             @OA\Property(property="cliente", type="string", example="Supermercado La 14"),
     *             @OA\Property(property="observaciones", type="string", example="Entrega urgente")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Despacho registrado con movimiento DESPACHO_SALIDA inmutable"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere despachos.escribir)"),
     *     @OA\Response(response=422, description="Stock insuficiente o lote no en Bodega Ventas")
     * )
     */
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
