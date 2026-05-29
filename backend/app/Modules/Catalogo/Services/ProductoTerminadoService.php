<?php

namespace App\Modules\Catalogo\Services;

use App\Models\ProductoTerminado;
use App\Modules\Catalogo\Repositories\Contracts\ProductoTerminadoRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * ProductoTerminadoService — Lógica de negocio del catálogo de productos terminados.
 * HU-006, HU-007 — Gestión y consulta de productos terminados.
 */
class ProductoTerminadoService
{
    public function __construct(
        private readonly ProductoTerminadoRepositoryInterface $repo
    ) {}

    public function listar(): Collection
    {
        return $this->repo->all();
    }

    public function obtener(int $id): ProductoTerminado
    {
        $pt = $this->repo->findById($id);

        if (!$pt) {
            throw new \Exception('Producto terminado no encontrado.', 404);
        }

        return $pt;
    }

    public function crear(array $data): ProductoTerminado
    {
        return $this->repo->create($data);
    }

    public function actualizar(int $id, array $data): ProductoTerminado
    {
        $pt = $this->obtener($id);
        return $this->repo->update($pt, $data);
    }

    public function desactivar(int $id): ProductoTerminado
    {
        $pt = $this->obtener($id);
        return $this->repo->desactivar($pt);
    }
}
