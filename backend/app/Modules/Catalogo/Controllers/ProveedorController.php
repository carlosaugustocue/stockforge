<?php

namespace App\Modules\Catalogo\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalogo\Requests\CreateProveedorRequest;
use App\Modules\Catalogo\Requests\UpdateProveedorRequest;
use App\Modules\Catalogo\Services\ProveedorService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;

/**
 * ProveedorController — CRUD del catálogo de proveedores.
 *
 * Endpoints:
 *   GET    /proveedores          → listar con sus materias primas
 *   POST   /proveedores          → crear proveedor (incluye materias_primas[])
 *   GET    /proveedores/{id}     → detalle
 *   PATCH  /proveedores/{id}     → actualizar (incluye materias_primas[] para sync)
 *   DELETE /proveedores/{id}     → eliminar
 *
 * Acceso: materias_primas.escribir (encargado, gerencia)
 */
class ProveedorController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly ProveedorService $service,
    ) {}

    public function index(): JsonResponse
    {
        $proveedores = $this->service->listar()->map(fn($p) => [
            'id'              => $p->id,
            'nombre'          => $p->nombre,
            'contacto_nombre' => $p->contacto_nombre,
            'telefono'        => $p->telefono,
            'email'           => $p->email,
            'activo'          => $p->activo,
            'materias_primas' => $p->materiasPrimas->map(fn($mp) => [
                'id'     => $mp->id,
                'nombre' => $mp->nombre,
            ])->values(),
        ]);

        return $this->successResponse($proveedores, 'Proveedores listados.');
    }

    public function show(int $id): JsonResponse
    {
        $proveedor = $this->service->buscarPorId($id);

        if (! $proveedor) {
            return $this->errorResponse('Proveedor no encontrado.', 404);
        }

        return $this->successResponse([
            'id'              => $proveedor->id,
            'nombre'          => $proveedor->nombre,
            'contacto_nombre' => $proveedor->contacto_nombre,
            'telefono'        => $proveedor->telefono,
            'email'           => $proveedor->email,
            'activo'          => $proveedor->activo,
            'materias_primas' => $proveedor->materiasPrimas->map(fn($mp) => [
                'id'     => $mp->id,
                'nombre' => $mp->nombre,
            ])->values(),
        ], 'Proveedor encontrado.');
    }

    public function store(CreateProveedorRequest $request): JsonResponse
    {
        $proveedor = $this->service->crear($request->validated());

        return $this->createdResponse([
            'id'              => $proveedor->id,
            'nombre'          => $proveedor->nombre,
            'contacto_nombre' => $proveedor->contacto_nombre,
            'telefono'        => $proveedor->telefono,
            'email'           => $proveedor->email,
            'activo'          => $proveedor->activo,
            'materias_primas' => $proveedor->materiasPrimas->map(fn($mp) => [
                'id'     => $mp->id,
                'nombre' => $mp->nombre,
            ])->values(),
        ], 'Proveedor creado correctamente.');
    }

    public function update(UpdateProveedorRequest $request, int $id): JsonResponse
    {
        $proveedor = $this->service->buscarPorId($id);

        if (! $proveedor) {
            return $this->errorResponse('Proveedor no encontrado.', 404);
        }

        $proveedor = $this->service->actualizar($proveedor, $request->validated());

        return $this->successResponse([
            'id'              => $proveedor->id,
            'nombre'          => $proveedor->nombre,
            'contacto_nombre' => $proveedor->contacto_nombre,
            'telefono'        => $proveedor->telefono,
            'email'           => $proveedor->email,
            'activo'          => $proveedor->activo,
            'materias_primas' => $proveedor->materiasPrimas->map(fn($mp) => [
                'id'     => $mp->id,
                'nombre' => $mp->nombre,
            ])->values(),
        ], 'Proveedor actualizado.');
    }

    public function destroy(int $id): JsonResponse
    {
        $proveedor = $this->service->buscarPorId($id);

        if (! $proveedor) {
            return $this->errorResponse('Proveedor no encontrado.', 404);
        }

        $this->service->eliminar($proveedor);

        return $this->successResponse(null, 'Proveedor eliminado.');
    }
}
