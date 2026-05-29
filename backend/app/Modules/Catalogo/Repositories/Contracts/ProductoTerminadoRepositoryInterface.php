<?php

namespace App\Modules\Catalogo\Repositories\Contracts;

use App\Models\ProductoTerminado;
use Illuminate\Database\Eloquent\Collection;

interface ProductoTerminadoRepositoryInterface
{
    public function all(): Collection;
    public function findById(int $id): ?ProductoTerminado;
    public function create(array $data): ProductoTerminado;
    public function update(ProductoTerminado $pt, array $data): ProductoTerminado;
    public function desactivar(ProductoTerminado $pt): ProductoTerminado;
}
