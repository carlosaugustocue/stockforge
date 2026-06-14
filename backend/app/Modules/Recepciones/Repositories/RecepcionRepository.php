<?php

namespace App\Modules\Recepciones\Repositories;

use App\Models\OrdenPedido;
use App\Models\Recepcion;
use App\Modules\Recepciones\Repositories\Contracts\RecepcionRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class RecepcionRepository implements RecepcionRepositoryInterface
{
    public function todasLasOrdenes(): Collection
    {
        return OrdenPedido::with(['usuario', 'proveedor', 'items.materiaPrima.unidadMedida'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function ordenPorId(int $id): ?OrdenPedido
    {
        return OrdenPedido::with([
            'usuario',
            'proveedor',
            'items.materiaPrima.unidadMedida',
            'recepciones.lotes.materiaPrima',
        ])->find($id);
    }

    public function crearOrden(array $data): OrdenPedido
    {
        return OrdenPedido::create($data);
    }

    public function actualizarOrden(OrdenPedido $orden, array $data): OrdenPedido
    {
        $orden->update($data);
        return $orden->fresh();
    }

    public function todasLasRecepciones(): Collection
    {
        return Recepcion::with(['ordenPedido', 'usuario', 'lotes.materiaPrima'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function recepcionPorId(int $id): ?Recepcion
    {
        return Recepcion::with(['ordenPedido', 'usuario', 'lotes.materiaPrima', 'movimientos'])->find($id);
    }

    public function crearRecepcion(array $data): Recepcion
    {
        return Recepcion::create($data);
    }
}
