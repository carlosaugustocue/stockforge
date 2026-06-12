<?php

namespace App\Modules\Produccion\Repositories\Contracts;

use App\Models\OrdenProduccion;
use Illuminate\Database\Eloquent\Collection;

interface ProduccionRepositoryInterface
{
    public function todasLasOrdenes(): Collection;

    public function ordenPorId(int $id): ?OrdenProduccion;

    public function crearOrden(array $data): OrdenProduccion;

    public function actualizarOrden(OrdenProduccion $orden, array $data): OrdenProduccion;
}
