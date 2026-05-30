<?php

namespace App\Modules\Produccion\Repositories;

use App\Models\OrdenProduccion;
use App\Modules\Produccion\Repositories\Contracts\ProduccionRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class ProduccionRepository implements ProduccionRepositoryInterface
{
    public function todasLasOrdenes(): Collection
    {
        return OrdenProduccion::with(['productoTerminado', 'usuario', 'requerimientos.materiaPrima'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function ordenPorId(int $id): ?OrdenProduccion
    {
        return OrdenProduccion::with([
            'productoTerminado.unidadMedida',
            'usuario',
            'requerimientos.materiaPrima.unidadMedida',
            'requerimientos.loteSugerido',
            'loteProductoTerminado.bodega',
            'movimientos',
        ])->find($id);
    }

    public function crearOrden(array $data): OrdenProduccion
    {
        return OrdenProduccion::create($data);
    }

    public function actualizarOrden(OrdenProduccion $orden, array $data): OrdenProduccion
    {
        $orden->update($data);
        return $orden->fresh();
    }
}
