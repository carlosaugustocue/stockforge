<?php

namespace App\Modules\Bitacora\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bitacora\Resources\BitacoraResource;
use App\Modules\Bitacora\Services\BitacoraService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * BitacoraController — Consulta de la bitácora de accesos del sistema.
 *
 * SOLID-SRP: solo orquestación HTTP — recibe, delega al service, responde.
 * Acceso exclusivo: middleware 'role:administrador'.
 */
class BitacoraController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly BitacoraService $service,
    ) {}

    // -----------------------------------------------------------------------
    // GET /api/v1/bitacora
    // Permiso: role:administrador (middleware estático)
    // Query params opcionales: user_id, accion, desde, hasta, por_pagina
    // -----------------------------------------------------------------------

    /**
     * Lista los registros de la bitácora con filtros y paginación.
     *
     * @return JsonResponse HTTP 200 con colección paginada
     */
    public function index(Request $request): JsonResponse
    {
        $filtros = $request->only(['user_id', 'accion', 'desde', 'hasta', 'por_pagina']);

        $paginator = $this->service->listar($filtros);

        return $this->successResponse([
            'data'       => BitacoraResource::collection($paginator->items()),
            'pagination' => [
                'total'        => $paginator->total(),
                'por_pagina'   => $paginator->perPage(),
                'pagina_actual'=> $paginator->currentPage(),
                'ultima_pagina'=> $paginator->lastPage(),
            ],
        ], 'Bitácora de accesos.');
    }
}
