<?php

namespace App\Modules\Catalogo\Services;

use App\Models\Bodega;
use App\Modules\Catalogo\Repositories\Contracts\BodegaRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class BodegaService
{
    public function __construct(
        private readonly BodegaRepositoryInterface $repo
    ) {}

    public function listar(): Collection
    {
        return $this->repo->all();
    }

    public function obtener(int $id): Bodega
    {
        $bodega = $this->repo->findById($id);

        if (!$bodega) {
            throw new \Exception('Bodega no encontrada.', 404);
        }

        return $bodega;
    }

    public function crear(array $data): Bodega
    {
        return $this->repo->create($data);
    }

    public function actualizar(int $id, array $data): Bodega
    {
        $bodega = $this->obtener($id);
        return $this->repo->update($bodega, $data);
    }
}
