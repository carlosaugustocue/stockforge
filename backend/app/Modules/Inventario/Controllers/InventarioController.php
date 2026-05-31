<?php

namespace App\Modules\Inventario\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Requests\TrasladoMpRequest;
use App\Modules\Inventario\Services\InventarioService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;

/**
 * InventarioController — Consultas de stock e inventario actual.
 *
 * Endpoints:
 *   GET /inventario/stock/mp          → stock de todas las materias primas
 *   GET /inventario/stock/mp/{id}     → stock de una MP específica por bodega
 *   GET /inventario/alertas           → MP por debajo del punto de reorden
 *
 * Acceso lectura:  inventario.leer    (Gerencia, Jefe de Producción, Encargado — HU-002)
 * Acceso escritura: inventario.escribir (Jefe de Producción, Encargado — RFINV04)
 */
class InventarioController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly InventarioService $service,
    ) {}

    /**
     * @OA\Get(
     *     path="/inventario/stock/mp",
     *     summary="Stock de todas las materias primas",
     *     description="Retorna el stock actual de todas las MP activas con desglose por bodega y flag bajo_reorden.",
     *     tags={"Inventario"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Stock consultado correctamente"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere inventario.leer)")
     * )
     */
    public function stockMp(): JsonResponse
    {
        $stock = $this->service->stockMateriaPrima();
        return $this->successResponse($stock, 'Stock de materias primas consultado.');
    }

    /**
     * @OA\Get(
     *     path="/inventario/stock/mp/{id}",
     *     summary="Stock de una materia prima por ID",
     *     tags={"Inventario"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Stock de la MP"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="MP no encontrada")
     * )
     */
    public function stockMpPorId(int $id): JsonResponse
    {
        $stock = $this->service->stockMateriaPrimaPorId($id);

        if (! $stock) {
            return $this->errorResponse('Materia prima no encontrada o inactiva.', 404);
        }

        return $this->successResponse($stock, 'Stock de materia prima consultado.');
    }

    /**
     * @OA\Get(
     *     path="/inventario/alertas",
     *     summary="Alertas de stock bajo punto de reorden",
     *     description="Retorna las materias primas cuyo stock total es menor al punto de reorden.",
     *     tags={"Inventario"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Alertas de reorden"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere alertas.leer)")
     * )
     */
    public function alertas(): JsonResponse
    {
        $alertas = $this->service->alertasBajoReorden();
        return $this->successResponse($alertas, 'Alertas de stock bajo reorden consultadas.');
    }

    /**
     * @OA\Post(
     *     path="/inventario/traslados",
     *     summary="Trasladar materia prima entre bodegas",
     *     description="Mueve una cantidad de MP de un lote a otra bodega. Si es traslado total, actualiza bodega_id del lote. Si es parcial, crea un nuevo lote heredando trazabilidad (RFINV04).",
     *     tags={"Inventario"},
     *     security={{"sanctum":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"lote_id","bodega_destino_id","cantidad"},
     *             @OA\Property(property="lote_id", type="integer", example=1),
     *             @OA\Property(property="bodega_destino_id", type="integer", example=2),
     *             @OA\Property(property="cantidad", type="number", example=25.5)
     *         )
     *     ),
     *     @OA\Response(response=201, description="Traslado registrado con movimientos SALIDA y ENTRADA"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere inventario.escribir)"),
     *     @OA\Response(response=422, description="Stock insuficiente o bodega destino igual a origen")
     * )
     */
    public function trasladar(TrasladoMpRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();
            $resultado = $this->service->trasladar(
                $data['lote_id'],
                $data['bodega_destino_id'],
                (float) $data['cantidad'],
                $request->user()->id,
            );
            return $this->createdResponse($resultado, 'Traslado de materia prima registrado correctamente.');
        } catch (\RuntimeException $e) {
            $detalle = json_decode($e->getMessage(), true);
            $mensaje = $detalle
                ? "Stock insuficiente. Disponible: {$detalle['disponible']}, solicitado: {$detalle['solicitada']}."
                : $e->getMessage();
            return $this->errorResponse($mensaje, 422, $detalle ?? []);
        }
    }
}
