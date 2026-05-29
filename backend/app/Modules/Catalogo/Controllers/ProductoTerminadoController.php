<?php

namespace App\Modules\Catalogo\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalogo\Requests\CreateProductoTerminadoRequest;
use App\Modules\Catalogo\Requests\UpdateProductoTerminadoRequest;
use App\Modules\Catalogo\Requests\AsociarMpRequest;
use App\Modules\Catalogo\Resources\ProductoTerminadoResource;
use App\Modules\Catalogo\Resources\RelacionMpPtResource;
use App\Modules\Catalogo\Services\ProductoTerminadoService;
use App\Modules\Catalogo\Services\RelacionMpPtService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ProductoTerminadoController — Orquestación HTTP del catálogo de productos terminados
 * y su asociación con materias primas.
 * HU-006, HU-007 — CRUD de productos y gestión de relaciones MP ↔ PT.
 */
class ProductoTerminadoController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly ProductoTerminadoService $service,
        private readonly RelacionMpPtService $relacionService
    ) {}

    // GET /api/v1/productos-terminados
    public function index(): JsonResponse
    {
        return $this->successResponse(
            ProductoTerminadoResource::collection($this->service->listar()),
            'Listado de productos terminados.'
        );
    }

    // GET /api/v1/productos-terminados/{id}
    public function show(int $id): JsonResponse
    {
        try {
            return $this->successResponse(
                new ProductoTerminadoResource($this->service->obtener($id)),
                'Producto terminado encontrado.'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), (int) $e->getCode() ?: 500);
        }
    }

    // POST /api/v1/productos-terminados
    public function store(CreateProductoTerminadoRequest $request): JsonResponse
    {
        try {
            $pt = $this->service->crear($request->validated());
            return $this->createdResponse(
                new ProductoTerminadoResource($pt->load('unidadMedida')),
                'Producto terminado creado exitosamente.'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Error al crear el producto terminado.', 500);
        }
    }

    // PATCH /api/v1/productos-terminados/{id}
    public function update(UpdateProductoTerminadoRequest $request, int $id): JsonResponse
    {
        try {
            $pt = $this->service->actualizar($id, $request->validated());
            return $this->successResponse(
                new ProductoTerminadoResource($pt),
                'Producto terminado actualizado exitosamente.'
            );
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }

    // DELETE /api/v1/productos-terminados/{id}
    public function destroy(int $id): JsonResponse
    {
        try {
            $pt = $this->service->desactivar($id);
            return $this->successResponse(
                new ProductoTerminadoResource($pt),
                'Producto terminado desactivado exitosamente.'
            );
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }

    // GET /api/v1/productos-terminados/{id}/materias-primas
    public function listarMateriasPrimas(int $id): JsonResponse
    {
        try {
            $relaciones = $this->relacionService->listarPorProducto($id);
            return $this->successResponse(
                RelacionMpPtResource::collection($relaciones),
                'Materias primas asociadas al producto.'
            );
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }

    // POST /api/v1/productos-terminados/{id}/materias-primas
    public function asociarMateriaPrima(AsociarMpRequest $request, int $id): JsonResponse
    {
        try {
            $relacion = $this->relacionService->asociar($id, $request->validated());
            return $this->createdResponse(
                new RelacionMpPtResource($relacion->load(['materiaPrima', 'unidadMedida'])),
                'Materia prima asociada al producto exitosamente.'
            );
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }

    // PATCH /api/v1/productos-terminados/{id}/materias-primas/{mp_id}
    public function actualizarRelacion(Request $request, int $id, int $mpId): JsonResponse
    {
        $request->validate([
            'cantidad_requerida' => ['required', 'numeric', 'min:0.0001'],
            'unidad_medida_id'   => ['sometimes', 'exists:unidades_medida,id'],
        ]);

        try {
            $relacion = $this->relacionService->actualizar($id, $mpId, $request->only(['cantidad_requerida', 'unidad_medida_id']));
            return $this->successResponse(
                new RelacionMpPtResource($relacion),
                'Relación actualizada exitosamente.'
            );
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }

    // DELETE /api/v1/productos-terminados/{id}/materias-primas/{mp_id}
    public function desasociarMateriaPrima(int $id, int $mpId): JsonResponse
    {
        try {
            $this->relacionService->desasociar($id, $mpId);
            return $this->successResponse(null, 'Materia prima desasociada del producto.');
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }
}
