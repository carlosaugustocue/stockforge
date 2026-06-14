<?php

namespace App\Modules\Despacho\Repositories;

use App\Models\Despacho;
use App\Modules\Despacho\Repositories\Contracts\DespachoRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * DespachoRepository — Persistencia de despachos de PT.
 *
 * Solo consultas y escrituras a BD. Sin lógica de negocio.
 */
class DespachoRepository implements DespachoRepositoryInterface
{
    public function todos(): Collection
    {
        return Despacho::with(['lotePt.productoTerminado', 'lotePt.bodega', 'usuario', 'movimiento', 'cliente'])
            ->latest()
            ->get();
    }

    public function porId(int $id): ?Despacho
    {
        return Despacho::with([
            'lotePt.productoTerminado.unidadMedida',
            'lotePt.bodega',
            'lotePt.ordenProduccion',
            'usuario',
            'movimiento',
        ])->find($id);
    }

    public function crear(array $data): Despacho
    {
        return Despacho::create($data);
    }
}
