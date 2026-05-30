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

    public function stockMp(): JsonResponse
    {
        $stock = $this->service->stockMateriaPrima();
        return $this->successResponse($stock, 'Stock de materias primas consultado.');
    }

    public function stockMpPorId(int $id): JsonResponse
    {
        $stock = $this->service->stockMateriaPrimaPorId($id);

        if (! $stock) {
            return $this->errorResponse('Materia prima no encontrada o inactiva.', 404);
        }

        return $this->successResponse($stock, 'Stock de materia prima consultado.');
    }

    public function alertas(): JsonResponse
    {
        $alertas = $this->service->alertasBajoReorden();
        return $this->successResponse($alertas, 'Alertas de stock bajo reorden consultadas.');
    }

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
