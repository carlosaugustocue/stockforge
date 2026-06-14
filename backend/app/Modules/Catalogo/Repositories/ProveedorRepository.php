<?php

namespace App\Modules\Catalogo\Repositories;

use App\Models\Proveedor;
use App\Modules\Catalogo\Repositories\Contracts\ProveedorRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class ProveedorRepository implements ProveedorRepositoryInterface
{
    public function all(): Collection
    {
        return Proveedor::with('materiasPrimas')->orderBy('nombre')->get();
    }

    public function findById(int $id): ?Proveedor
    {
        return Proveedor::with('materiasPrimas')->find($id);
    }

    public function create(array $data): Proveedor
    {
        return Proveedor::create($data);
    }

    public function update(Proveedor $proveedor, array $data): Proveedor
    {
        $proveedor->update($data);
        return $proveedor->fresh('materiasPrimas');
    }

    public function delete(Proveedor $proveedor): void
    {
        $proveedor->delete();
    }

    public function syncMateriasPrimas(Proveedor $proveedor, array $mpIds): void
    {
        $proveedor->materiasPrimas()->sync($mpIds);
    }
}
