<?php

namespace App\Modules\Catalogo\Repositories\Contracts;

use App\Models\RelacionMpPt;
use Illuminate\Database\Eloquent\Collection;

interface RelacionMpPtRepositoryInterface
{
    public function allByProducto(int $productoId): Collection;
    public function findByProductoYMp(int $productoId, int $mpId): ?RelacionMpPt;
    public function create(array $data): RelacionMpPt;
    public function update(RelacionMpPt $relacion, array $data): RelacionMpPt;
    public function eliminar(RelacionMpPt $relacion): void;
}
