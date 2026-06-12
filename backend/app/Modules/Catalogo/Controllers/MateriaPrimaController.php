<?php

namespace App\Modules\Catalogo\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalogo\Requests\CreateMateriaPrimaRequest;
use App\Modules\Catalogo\Requests\UpdateMateriaPrimaRequest;
use App\Modules\Catalogo\Requests\ImportarMateriaPrimaRequest;
use App\Modules\Catalogo\Resources\MateriaPrimaResource;
use App\Modules\Catalogo\Services\MateriaPrimaService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;

class MateriaPrimaController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly MateriaPrimaService $service,
    ) {}

    /**
     * @OA\Get(
     *     path="/materias-primas",
     *     summary="Listar materias primas",
     *     tags={"Catálogo - Materias Primas"},
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Listado de materias primas activas"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere materias_primas.leer)")
     * )
     */
    public function index(): JsonResponse
    {
        return $this->successResponse(
            MateriaPrimaResource::collection($this->service->listar()),
            'Listado de materias primas.'
        );
    }

    /**
     * @OA\Get(
     *     path="/materias-primas/{id}",
     *     summary="Ver materia prima",
     *     tags={"Catálogo - Materias Primas"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Detalle de la materia prima"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="No encontrada")
     * )
     */
    public function show(int $id): JsonResponse
    {
        try {
            $mp = $this->service->obtener($id);
            return $this->successResponse(new MateriaPrimaResource($mp), 'Materia prima.');
        } catch (\Exception $e) {
            return $this->errorResponse('Materia prima no encontrada.', 404);
        }
    }

    /**
     * @OA\Post(
     *     path="/materias-primas",
     *     summary="Crear materia prima",
     *     tags={"Catálogo - Materias Primas"},
     *     security={{"sanctum":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"nombre","unidad_medida_id","punto_reorden"},
     *             @OA\Property(property="nombre", type="string", example="Harina de trigo"),
     *             @OA\Property(property="unidad_medida_id", type="integer", example=1),
     *             @OA\Property(property="punto_reorden", type="number", example=50)
     *         )
     *     ),
     *     @OA\Response(response=201, description="Materia prima creada"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere materias_primas.escribir)"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function store(CreateMateriaPrimaRequest $request): JsonResponse
    {
        $mp = $this->service->crear($request->validated());
        return $this->createdResponse(new MateriaPrimaResource($mp), 'Materia prima creada.');
    }

    /**
     * @OA\Patch(
     *     path="/materias-primas/{id}",
     *     summary="Actualizar materia prima",
     *     tags={"Catálogo - Materias Primas"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="nombre", type="string"),
     *             @OA\Property(property="punto_reorden", type="number"),
     *             @OA\Property(property="activa", type="boolean")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Materia prima actualizada"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="No encontrada"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function update(UpdateMateriaPrimaRequest $request, int $id): JsonResponse
    {
        try {
            $mp = $this->service->actualizar($id, $request->validated());
            return $this->successResponse(new MateriaPrimaResource($mp), 'Materia prima actualizada.');
        } catch (\Exception $e) {
            $code = $e->getCode();
            $httpCode = (is_int($code) && $code >= 100 && $code < 600) ? $code : 500;
            return $this->errorResponse($e->getMessage(), $httpCode);
        }
    }

    /**
     * @OA\Delete(
     *     path="/materias-primas/{id}",
     *     summary="Eliminar materia prima",
     *     description="Desactiva (soft-delete lógico) la materia prima.",
     *     tags={"Catálogo - Materias Primas"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Materia prima eliminada"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="No encontrada")
     * )
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $mp = $this->service->desactivar($id);
            return $this->successResponse(
                new MateriaPrimaResource($mp),
                'Materia prima desactivada exitosamente.'
            );
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/materias-primas/importar",
     *     summary="Importar materias primas desde Excel",
     *     tags={"Catálogo - Materias Primas"},
     *     security={{"sanctum":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 required={"archivo"},
     *                 @OA\Property(property="archivo", type="string", format="binary", description="Archivo Excel (.xlsx, .xls, .csv)")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=201, description="Materias primas importadas"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=422, description="Error de validación o formato incorrecto")
     * )
     */
    public function importar(ImportarMateriaPrimaRequest $request): JsonResponse
    {
        try {
            $resultado = $this->service->importar($request->file('archivo'));
            return $this->createdResponse($resultado, 'Importación completada.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }
}
