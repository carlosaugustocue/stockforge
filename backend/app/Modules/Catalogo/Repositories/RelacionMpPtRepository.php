<?php

namespace App\Modules\Catalogo\Repositories;

use App\Models\RelacionMpPt;
use App\Modules\Catalogo\Repositories\Contracts\RelacionMpPtRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class RelacionMpPtRepository implements RelacionMpPtRepositoryInterface
{
    public function allByProducto(int $productoId): Collection
    {
        return RelacionMpPt::with(['materiaPrima.unidadMedida', 'unidadMedida'])
            ->where('producto_terminado_id', $productoId)
            ->get();
    }

    public function findByProductoYMp(int $productoId, int $mpId): ?RelacionMpPt
    {
        return RelacionMpPt::where('producto_terminado_id', $productoId)
            ->where('materia_prima_id', $mpId)
            ->first();
    }

    public function create(array $data): RelacionMpPt
    {
        return RelacionMpPt::create($data);
    }

    public function update(RelacionMpPt $relacion, array $data): RelacionMpPt
    {
        $relacion->update($data);
        return $relacion->fresh(['materiaPrima', 'unidadMedida']);
    }

    public function eliminar(RelacionMpPt $relacion): void
    {
        $relacion->delete();
    }
}
