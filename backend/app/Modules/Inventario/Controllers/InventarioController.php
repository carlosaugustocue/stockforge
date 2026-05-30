<?php

namespace App\Modules\Inventario\Controllers;

use App\Http\Controllers\Controller;
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
 * Acceso: inventario.leer (Gerencia, Jefe de Producción, Encargado — HU-002)
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
}
