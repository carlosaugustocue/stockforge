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
    public function index(): JsonResponse
    {
        return $this->successResponse(
            BodegaResource::collection($this->service->listar()),
            'Listado de bodegas.'
        );
    }

    // GET /api/v1/bodegas/{id}
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
