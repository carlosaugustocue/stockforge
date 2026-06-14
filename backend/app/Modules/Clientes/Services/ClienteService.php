<?php

namespace App\Modules\Clientes\Services;

use App\Models\Cliente;
use App\Modules\Clientes\Repositories\Contracts\ClienteRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class ClienteService
{
    public function __construct(
        private readonly ClienteRepositoryInterface $repo,
    ) {}

    public function listar(): Collection
    {
        return $this->repo->todos();
    }

    public function buscar(string $q): Collection
    {
        return $this->repo->buscar($q);
    }

    public function obtener(int $id): ?Cliente
    {
        return $this->repo->porId($id);
    }

    public function crear(array $data): Cliente
    {
        return $this->repo->crear($data);
    }

    public function actualizar(int $id, array $data): Cliente
    {
        return $this->repo->actualizar($id, $data);
    }

    public function eliminar(int $id): void
    {
        $this->repo->eliminar($id);
    }
}
