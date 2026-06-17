<?php

namespace App\Modules\Clientes\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Clientes\Requests\CreateClienteRequest;
use App\Modules\Clientes\Requests\UpdateClienteRequest;
use App\Modules\Clientes\Resources\ClienteResource;
use App\Modules\Clientes\Services\ClienteService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClienteController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly ClienteService $service) {}

    /**
     * @OA\Get(
     *     path="/clientes",
     *     summary="Listar o buscar clientes",
     *     description="Retorna todos los clientes. Con parámetro ?q= filtra por nombre, NIT/cédula o email.",
     *     tags={"Clientes"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="q", in="query", required=false, description="Texto libre para buscar por nombre, NIT/cédula o email", @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="Listado de clientes"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere despachos.leer)")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $q = $request->query('q');
        $clientes = $q
            ? $this->service->buscar($q)
            : $this->service->listar();

        return $this->successResponse(ClienteResource::collection($clientes));
    }

    /**
     * @OA\Get(
     *     path="/clientes/{id}",
     *     summary="Ver cliente",
     *     tags={"Clientes"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Detalle del cliente"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="No encontrado")
     * )
     */
    public function show(int $id): JsonResponse
    {
        $cliente = $this->service->obtener($id);
        if (!$cliente) {
            return $this->errorResponse('Cliente no encontrado.', 404);
        }
        return $this->successResponse(new ClienteResource($cliente));
    }

    /**
     * @OA\Post(
     *     path="/clientes",
     *     summary="Crear cliente",
     *     tags={"Clientes"},
     *     security={{"sanctum":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"tipo","nombre"},
     *             @OA\Property(property="tipo", type="string", enum={"persona","empresa"}, example="empresa"),
     *             @OA\Property(property="nombre", type="string", example="Distribuidora El Trigal S.A.S."),
     *             @OA\Property(property="nit_cedula", type="string", example="900.234.567-1"),
     *             @OA\Property(property="telefono", type="string", example="3112345678"),
     *             @OA\Property(property="email", type="string", format="email", example="pedidos@eltrigal.com.co"),
     *             @OA\Property(property="direccion", type="string", example="Calle 15 # 22-45, Bogotá"),
     *             @OA\Property(property="contacto_nombre", type="string", example="Andrés Moreno"),
     *             @OA\Property(property="activo", type="boolean", example=true)
     *         )
     *     ),
     *     @OA\Response(response=201, description="Cliente creado"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere despachos.escribir)"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function store(CreateClienteRequest $request): JsonResponse
    {
        $cliente = $this->service->crear($request->validated());
        return $this->successResponse(new ClienteResource($cliente), 201);
    }

    /**
     * @OA\Patch(
     *     path="/clientes/{id}",
     *     summary="Actualizar cliente",
     *     tags={"Clientes"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="nombre", type="string"),
     *             @OA\Property(property="nit_cedula", type="string"),
     *             @OA\Property(property="telefono", type="string"),
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="direccion", type="string"),
     *             @OA\Property(property="contacto_nombre", type="string"),
     *             @OA\Property(property="activo", type="boolean")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Cliente actualizado"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso"),
     *     @OA\Response(response=404, description="No encontrado"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function update(UpdateClienteRequest $request, int $id): JsonResponse
    {
        $cliente = $this->service->actualizar($id, $request->validated());
        return $this->successResponse(new ClienteResource($cliente));
    }

    /**
     * @OA\Delete(
     *     path="/clientes/{id}",
     *     summary="Eliminar cliente",
     *     tags={"Clientes"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Cliente eliminado"),
     *     @OA\Response(response=401, description="No autenticado"),
     *     @OA\Response(response=403, description="Sin permiso (requiere despachos.escribir)"),
     *     @OA\Response(response=404, description="No encontrado")
     * )
     */
    public function destroy(int $id): JsonResponse
    {
        $this->service->eliminar($id);
        return $this->successResponse(['message' => 'Cliente eliminado.']);
    }
}
