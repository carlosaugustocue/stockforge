<?php

namespace App\Modules\Catalogo\Repositories;

use App\Models\Bodega;
use App\Modules\Catalogo\Repositories\Contracts\BodegaRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class BodegaRepository implements BodegaRepositoryInterface
{
    public function all(): Collection
    {
        return Bodega::orderBy('nombre')->get();
    }

    public function findById(int $id): ?Bodega
    {
        return Bodega::find($id);
    }

    public function create(array $data): Bodega
    {
        return Bodega::create($data);
    }

    public function update(Bodega $bodega, array $data): Bodega
    {
        $bodega->update($data);
        return $bodega->fresh();
    }
}
