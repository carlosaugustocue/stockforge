<?php

namespace App\Modules\Catalogo\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalogo\Requests\CreateBodegaRequest;
use App\Modules\Catalogo\Requests\UpdateBodegaRequest;
use App\Modules\Catalogo\Resources\BodegaResource;
use App\Modules\Catalogo\Services\BodegaService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;

class BodegaController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly BodegaService $service
    ) {}

    // GET /api/v1/bodegas
    /**
     * @OA\Get(path="/bodegas", summary="Listar bodegas", tags={"Catálogo - Bodegas"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Listado de bodegas"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere bodegas.leer)")
     * )
     */
    public function index(): JsonResponse
    {
        return $this->successResponse(
            BodegaResource::collection($this->service->listar()),
            'Listado de bodegas.'
        );
    }

    // GET /api/v1/bodegas/{id}
    /**
     * @OA\Get(path="/bodegas/{id}", summary="Ver bodega", tags={"Catálogo - Bodegas"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Detalle de la bodega"),
     *     @OA\Response(response=404, description="No encontrada")
     * )
     */
    public function show(int $id): JsonResponse
    {
        try {
            return $this->successResponse(
                new BodegaResource($this->service->obtener($id)),
                'Bodega encontrada.'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), (int) $e->getCode() ?: 500);
        }
    }

    // POST /api/v1/bodegas
    /**
     * @OA\Post(path="/bodegas", summary="Crear bodega", tags={"Catálogo - Bodegas"},
     *     security={{"sanctum":{}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"nombre","tipo"},
     *         @OA\Property(property="nombre", type="string", example="Bodega Norte"),
     *         @OA\Property(property="tipo", type="string", enum={"principal","produccion","ventas"})
     *     )),
     *     @OA\Response(response=201, description="Bodega creada"),
     *     @OA\Response(response=403, description="Sin permiso (requiere bodegas.escribir)"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function store(CreateBodegaRequest $request): JsonResponse
    {
        try {
            $bodega = $this->service->crear($request->validated());
            return $this->createdResponse(
                new BodegaResource($bodega),
                'Bodega creada exitosamente.'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Error al crear la bodega.', 500);
        }
    }

    // PATCH /api/v1/bodegas/{id}
    /**
     * @OA\Patch(path="/bodegas/{id}", summary="Actualizar bodega", tags={"Catálogo - Bodegas"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(@OA\JsonContent(
     *         @OA\Property(property="nombre", type="string"),
     *         @OA\Property(property="activa", type="boolean")
     *     )),
     *     @OA\Response(response=200, description="Bodega actualizada"),
     *     @OA\Response(response=404, description="No encontrada")
     * )
     */
    public function update(UpdateBodegaRequest $request, int $id): JsonResponse
    {
        try {
            $bodega = $this->service->actualizar($id, $request->validated());
            return $this->successResponse(
                new BodegaResource($bodega),
                'Bodega actualizada exitosamente.'
            );
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }
}
