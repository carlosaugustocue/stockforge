<?php

namespace App\Modules\Catalogo\Repositories;

use App\Models\Presentacion;
use App\Modules\Catalogo\Repositories\Contracts\PresentacionRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class PresentacionRepository implements PresentacionRepositoryInterface
{
    public function allByProducto(int $productoId): Collection
    {
        return Presentacion::where('producto_terminado_id', $productoId)
            ->orderBy('nombre')
            ->get();
    }

    public function findById(int $id): ?Presentacion
    {
        return Presentacion::with('productoTerminado')->find($id);
    }

    public function create(array $data): Presentacion
    {
        return Presentacion::create($data);
    }

    public function update(Presentacion $presentacion, array $data): Presentacion
    {
        $presentacion->update($data);
        return $presentacion->fresh();
    }

    public function desactivar(Presentacion $presentacion): Presentacion
    {
        $presentacion->update(['activa' => false]);
        return $presentacion->fresh();
    }
}
