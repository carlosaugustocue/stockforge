<?php

namespace App\Modules\Catalogo\Repositories\Contracts;

use App\Models\Presentacion;
use Illuminate\Database\Eloquent\Collection;

interface PresentacionRepositoryInterface
{
    public function allByProducto(int $productoId): Collection;
    public function findById(int $id): ?Presentacion;
    public function create(array $data): Presentacion;
    public function update(Presentacion $presentacion, array $data): Presentacion;
    public function desactivar(Presentacion $presentacion): Presentacion;
}
