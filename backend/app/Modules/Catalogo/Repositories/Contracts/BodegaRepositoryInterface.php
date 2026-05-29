<?php

namespace App\Modules\Catalogo\Repositories\Contracts;

use App\Models\Bodega;
use Illuminate\Database\Eloquent\Collection;

interface BodegaRepositoryInterface
{
    public function all(): Collection;
    public function findById(int $id): ?Bodega;
    public function create(array $data): Bodega;
    public function update(Bodega $bodega, array $data): Bodega;
}
