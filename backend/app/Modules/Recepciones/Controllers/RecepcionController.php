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

    /**
     * @OA\Get(
     *     path="/recepciones/ordenes",
     *     summary="Listar órdenes de pedido",
     *     tags={"Recepciones"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Listado de órdenes"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere recepciones.leer)")
     * )
     */
    public function listarOrdenes(): JsonResponse
    {
        $ordenes = $this->service->listarOrdenes();
        return $this->successResponse(OrdenPedidoResource::collection($ordenes), 'Órdenes de pedido listadas.');
    }

    /**
     * @OA\Post(
     *     path="/recepciones/ordenes",
     *     summary="Crear orden de pedido",
     *     tags={"Recepciones"},
     *     security={{"sanctum":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"proveedor"},
     *             @OA\Property(property="proveedor", type="string", example="Harinera del Valle"),
     *             @OA\Property(property="fecha_esperada", type="string", format="date", example="2026-06-15"),
     *             @OA\Property(property="observaciones", type="string", example="Entrega urgente")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Orden creada"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere recepciones.escribir)"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function crearOrden(CreateOrdenPedidoRequest $request): JsonResponse
    {
        $orden = $this->service->crearOrden($request->validated(), $request->user()->id);
        return $this->createdResponse(new OrdenPedidoResource($orden), 'Orden de pedido creada exitosamente.');
    }

    /**
     * @OA\Get(
     *     path="/recepciones/ordenes/{id}",
     *     summary="Ver orden de pedido",
     *     tags={"Recepciones"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Detalle de la orden"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="No encontrada")
     * )
     */
    public function verOrden(int $id): JsonResponse
    {
        $orden = $this->service->obtenerOrden($id);
        if (! $orden) {
            return $this->errorResponse('Orden de pedido no encontrada.', 404);
        }
        return $this->successResponse(new OrdenPedidoResource($orden), 'Orden de pedido encontrada.');
    }

    /**
     * @OA\Patch(
     *     path="/recepciones/ordenes/{id}",
     *     summary="Actualizar orden de pedido",
     *     tags={"Recepciones"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="proveedor", type="string"),
     *             @OA\Property(property="fecha_esperada", type="string", format="date"),
     *             @OA\Property(property="estado", type="string", enum={"pendiente","en_recepcion","cerrada"}),
     *             @OA\Property(property="observaciones", type="string")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Orden actualizada"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="No encontrada"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
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

    /**
     * @OA\Get(
     *     path="/recepciones",
     *     summary="Listar recepciones",
     *     tags={"Recepciones"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Listado de recepciones"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso")
     * )
     */
    public function listarRecepciones(): JsonResponse
    {
        $recepciones = $this->service->listarRecepciones();
        return $this->successResponse(RecepcionResource::collection($recepciones), 'Recepciones listadas.');
    }

    /**
     * @OA\Post(
     *     path="/recepciones/ordenes/{id}/recepciones",
     *     summary="Registrar recepción de materias primas",
     *     description="Registra la entrada física de MP contra una orden de pedido. Crea lotes con trazabilidad FEFO (RFREC).",
     *     tags={"Recepciones"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="ID de la orden de pedido", @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"items"},
     *             @OA\Property(property="items", type="array",
     *                 @OA\Items(
     *                     required={"materia_prima_id","cantidad"},
     *                     @OA\Property(property="materia_prima_id", type="integer", example=1),
     *                     @OA\Property(property="cantidad", type="number", example=100),
     *                     @OA\Property(property="fecha_vencimiento", type="string", format="date", example="2026-12-31")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(response=201, description="Recepción registrada, lotes creados en Bodega Principal"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere recepciones.escribir)"),
     *     @OA\Response(response=404, description="Orden no encontrada"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
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

    /**
     * @OA\Get(
     *     path="/recepciones/{id}",
     *     summary="Ver recepción",
     *     tags={"Recepciones"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Detalle de la recepción con lotes creados"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="No encontrada")
     * )
     */
    public function verRecepcion(int $id): JsonResponse
    {
        $recepcion = $this->service->obtenerRecepcion($id);
        if (! $recepcion) {
            return $this->errorResponse('Recepción no encontrada.', 404);
        }
        return $this->successResponse(new RecepcionResource($recepcion), 'Recepción encontrada.');
    }
}
