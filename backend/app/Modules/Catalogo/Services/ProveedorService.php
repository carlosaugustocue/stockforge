<?php

namespace App\Modules\Catalogo\Services;

use App\Models\Proveedor;
use App\Modules\Catalogo\Repositories\Contracts\ProveedorRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * ProveedorService — Gestión del catálogo de proveedores.
 *
 * Maneja CRUD de proveedores y la asociación con materias primas.
 * La asociación proveedor → MP permite sugerir el proveedor correcto
 * al crear una orden de pedido desde una alerta de reorden.
 */
class ProveedorService
{
    public function __construct(
        private readonly ProveedorRepositoryInterface $repo,
    ) {}

    public function listar(): Collection
    {
        return $this->repo->all();
    }

    public function buscarPorId(int $id): ?Proveedor
    {
        return $this->repo->findById($id);
    }

    public function crear(array $data): Proveedor
    {
        $mpIds = $data['materias_primas'] ?? [];
        unset($data['materias_primas']);

        $proveedor = $this->repo->create($data);

        if (! empty($mpIds)) {
            $this->repo->syncMateriasPrimas($proveedor, $mpIds);
        }

        return $this->repo->findById($proveedor->id);
    }

    public function actualizar(Proveedor $proveedor, array $data): Proveedor
    {
        $mpIds = $data['materias_primas'] ?? null;
        unset($data['materias_primas']);

        $proveedor = $this->repo->update($proveedor, $data);

        if ($mpIds !== null) {
            $this->repo->syncMateriasPrimas($proveedor, $mpIds);
        }

        return $this->repo->findById($proveedor->id);
    }

    public function eliminar(Proveedor $proveedor): void
    {
        $this->repo->delete($proveedor);
    }
}
