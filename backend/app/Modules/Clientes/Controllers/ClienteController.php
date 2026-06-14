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

    public function index(Request $request): JsonResponse
    {
        $q = $request->query('q');
        $clientes = $q
            ? $this->service->buscar($q)
            : $this->service->listar();

        return $this->successResponse(ClienteResource::collection($clientes));
    }

    public function show(int $id): JsonResponse
    {
        $cliente = $this->service->obtener($id);
        if (!$cliente) {
            return $this->errorResponse('Cliente no encontrado.', 404);
        }
        return $this->successResponse(new ClienteResource($cliente));
    }

    public function store(CreateClienteRequest $request): JsonResponse
    {
        $cliente = $this->service->crear($request->validated());
        return $this->successResponse(new ClienteResource($cliente), 201);
    }

    public function update(UpdateClienteRequest $request, int $id): JsonResponse
    {
        $cliente = $this->service->actualizar($id, $request->validated());
        return $this->successResponse(new ClienteResource($cliente));
    }

    public function destroy(int $id): JsonResponse
    {
        $this->service->eliminar($id);
        return $this->successResponse(['message' => 'Cliente eliminado.']);
    }
}
