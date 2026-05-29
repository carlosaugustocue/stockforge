<?php

namespace App\Modules\Catalogo\Repositories;

use App\Models\ProductoTerminado;
use App\Modules\Catalogo\Repositories\Contracts\ProductoTerminadoRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class ProductoTerminadoRepository implements ProductoTerminadoRepositoryInterface
{
    public function all(): Collection
    {
        return ProductoTerminado::with('unidadMedida')->orderBy('nombre')->get();
    }

    public function findById(int $id): ?ProductoTerminado
    {
        return ProductoTerminado::with(['unidadMedida', 'presentaciones', 'relaciones.materiaPrima', 'relaciones.unidadMedida'])->find($id);
    }

    public function create(array $data): ProductoTerminado
    {
        return ProductoTerminado::create($data);
    }

    public function update(ProductoTerminado $pt, array $data): ProductoTerminado
    {
        $pt->update($data);
        return $pt->fresh('unidadMedida');
    }

    public function desactivar(ProductoTerminado $pt): ProductoTerminado
    {
        $pt->update(['activo' => false]);
        return $pt->fresh();
    }
}
