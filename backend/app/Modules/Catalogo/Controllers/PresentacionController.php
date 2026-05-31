<?php

namespace App\Modules\Catalogo\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalogo\Requests\CreatePresentacionRequest;
use App\Modules\Catalogo\Resources\PresentacionResource;
use App\Modules\Catalogo\Services\PresentacionService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresentacionController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly PresentacionService $service
    ) {}

    // GET /api/v1/productos-terminados/{id}/presentaciones
    /**
     * @OA\Get(path="/productos-terminados/{id}/presentaciones", summary="Listar presentaciones de un PT",
     *     tags={"Catálogo - Presentaciones"}, security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Presentaciones del producto"),
     *     @OA\Response(response=403, description="Sin permiso (requiere productos_terminados.leer)")
     * )
     */
    public function index(int $productoId): JsonResponse
    {
        try {
            return $this->successResponse(
                PresentacionResource::collection($this->service->listarPorProducto($productoId)),
                'Presentaciones del producto.'
            );
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }

    // POST /api/v1/productos-terminados/{id}/presentaciones
    /**
     * @OA\Post(path="/productos-terminados/{id}/presentaciones", summary="Crear presentación",
     *     tags={"Catálogo - Presentaciones"}, security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"nombre","unidades_por_presentacion"},
     *         @OA\Property(property="nombre", type="string", example="Caja x12"),
     *         @OA\Property(property="unidades_por_presentacion", type="integer", example=12)
     *     )),
     *     @OA\Response(response=201, description="Presentación creada"),
     *     @OA\Response(response=403, description="Sin permiso (requiere productos_terminados.escribir)")
     * )
     */
    public function store(CreatePresentacionRequest $request, int $productoId): JsonResponse
    {
        try {
            $presentacion = $this->service->crear(
                array_merge($request->validated(), ['producto_terminado_id' => $productoId])
            );
            return $this->createdResponse(
                new PresentacionResource($presentacion),
                'Presentación creada exitosamente.'
            );
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }

    // PATCH /api/v1/presentaciones/{id}
    /**
     * @OA\Patch(path="/presentaciones/{id}", summary="Actualizar presentación",
     *     tags={"Catálogo - Presentaciones"}, security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Presentación actualizada"),
     *     @OA\Response(response=403, description="Sin permiso (requiere bodegas.escribir)")
     * )
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'nombre'                    => ['sometimes', 'string', 'max:100'],
            'unidades_por_presentacion' => ['sometimes', 'numeric', 'min:0.001'],
            'activa'                    => ['sometimes', 'boolean'],
        ]);

        try {
            $presentacion = $this->service->actualizar($id, $request->only(['nombre', 'unidades_por_presentacion', 'activa']));
            return $this->successResponse(
                new PresentacionResource($presentacion),
                'Presentación actualizada exitosamente.'
            );
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }

    // DELETE /api/v1/presentaciones/{id}
    /**
     * @OA\Delete(path="/presentaciones/{id}", summary="Eliminar presentación",
     *     tags={"Catálogo - Presentaciones"}, security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Presentación eliminada"),
     *     @OA\Response(response=403, description="Sin permiso")
     * )
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $presentacion = $this->service->desactivar($id);
            return $this->successResponse(
                new PresentacionResource($presentacion),
                'Presentación desactivada exitosamente.'
            );
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }
}
