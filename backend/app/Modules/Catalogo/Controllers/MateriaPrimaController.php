<?php

namespace App\Modules\Catalogo\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalogo\Requests\CreateMateriaPrimaRequest;
use App\Modules\Catalogo\Requests\UpdateMateriaPrimaRequest;
use App\Modules\Catalogo\Resources\MateriaPrimaResource;
use App\Modules\Catalogo\Services\MateriaPrimaService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * MateriaPrimaController — Orquestación HTTP del catálogo de materias primas.
 * HU-004, HU-005, HU-008 — CRUD y importación de materias primas.
 */
class MateriaPrimaController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly MateriaPrimaService $service
    ) {}

    // GET /api/v1/materias-primas
    public function index(): JsonResponse
    {
        return $this->successResponse(
            MateriaPrimaResource::collection($this->service->listar()),
            'Listado de materias primas.'
        );
    }

    // GET /api/v1/materias-primas/{id}
    public function show(int $id): JsonResponse
    {
        try {
            return $this->successResponse(
                new MateriaPrimaResource($this->service->obtener($id)),
                'Materia prima encontrada.'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), (int) $e->getCode() ?: 500);
        }
    }

    // POST /api/v1/materias-primas
    public function store(CreateMateriaPrimaRequest $request): JsonResponse
    {
        try {
            $mp = $this->service->crear($request->validated());
            return $this->createdResponse(
                new MateriaPrimaResource($mp->load('unidadMedida')),
                'Materia prima creada exitosamente.'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Error al crear la materia prima.', 500);
        }
    }

    // PATCH /api/v1/materias-primas/{id}
    public function update(UpdateMateriaPrimaRequest $request, int $id): JsonResponse
    {
        try {
            $mp = $this->service->actualizar($id, $request->validated());
            return $this->successResponse(
                new MateriaPrimaResource($mp),
                'Materia prima actualizada exitosamente.'
            );
        } catch (\Exception $e) {
            $code = (int) $e->getCode();
            return $this->errorResponse($e->getMessage(), ($code >= 100 && $code < 600) ? $code : 500);
        }
    }

    // DELETE /api/v1/materias-primas/{id}
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

    // POST /api/v1/materias-primas/importar
    public function importar(Request $request): JsonResponse
    {
        $request->validate([
            'archivo' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:5120'],
        ], [
            'archivo.required' => 'El archivo es obligatorio.',
            'archivo.mimes'    => 'El archivo debe ser Excel (.xlsx, .xls) o CSV.',
            'archivo.max'      => 'El archivo no puede superar los 5 MB.',
        ]);

        try {
            $resultado = $this->service->importar($request->file('archivo'));

            return $this->successResponse($resultado,
                "Importación completada: {$resultado['importadas']} filas importadas, " .
                count($resultado['errores']) . " con errores."
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Error al procesar el archivo.', 500);
        }
    }
}
