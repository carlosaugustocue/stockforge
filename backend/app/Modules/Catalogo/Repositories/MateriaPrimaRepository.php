<?php

namespace App\Modules\Catalogo\Repositories;

use App\Models\MateriaPrima;
use App\Modules\Catalogo\Repositories\Contracts\MateriaPrimaRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class MateriaPrimaRepository implements MateriaPrimaRepositoryInterface
{
    public function all(): Collection
    {
        return MateriaPrima::with('unidadMedida')->orderBy('nombre')->get();
    }

    public function findById(int $id): ?MateriaPrima
    {
        return MateriaPrima::with('unidadMedida')->find($id);
    }

    public function create(array $data): MateriaPrima
    {
        return MateriaPrima::create($data);
    }

    public function update(MateriaPrima $mp, array $data): MateriaPrima
    {
        $mp->update($data);
        return $mp->fresh('unidadMedida');
    }

    public function desactivar(MateriaPrima $mp): MateriaPrima
    {
        $mp->update(['activa' => false]);
        return $mp->fresh();
    }
}
