<?php

namespace App\Modules\Catalogo\Services;

use App\Models\Presentacion;
use App\Modules\Catalogo\Repositories\Contracts\PresentacionRepositoryInterface;
use App\Modules\Catalogo\Repositories\Contracts\ProductoTerminadoRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class PresentacionService
{
    public function __construct(
        private readonly PresentacionRepositoryInterface $repo,
        private readonly ProductoTerminadoRepositoryInterface $repoProducto
    ) {}

    public function listarPorProducto(int $productoId): Collection
    {
        // Verificar que el producto existe
        if (!$this->repoProducto->findById($productoId)) {
            throw new \Exception('Producto terminado no encontrado.', 404);
        }

        return $this->repo->allByProducto($productoId);
    }

    public function crear(array $data): Presentacion
    {
        // Verificar que el producto existe
        if (!$this->repoProducto->findById($data['producto_terminado_id'])) {
            throw new \Exception('Producto terminado no encontrado.', 404);
        }

        return $this->repo->create($data);
    }

    public function actualizar(int $id, array $data): Presentacion
    {
        $presentacion = $this->repo->findById($id);

        if (!$presentacion) {
            throw new \Exception('Presentación no encontrada.', 404);
        }

        return $this->repo->update($presentacion, $data);
    }

    public function desactivar(int $id): Presentacion
    {
        $presentacion = $this->repo->findById($id);

        if (!$presentacion) {
            throw new \Exception('Presentación no encontrada.', 404);
        }

        return $this->repo->desactivar($presentacion);
    }
}
