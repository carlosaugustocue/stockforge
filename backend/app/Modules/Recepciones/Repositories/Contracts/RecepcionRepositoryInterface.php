<?php

namespace App\Modules\Recepciones\Repositories\Contracts;

use App\Models\OrdenPedido;
use App\Models\Recepcion;
use Illuminate\Database\Eloquent\Collection;

/**
 * Contrato del repositorio de recepciones.
 * Define las operaciones de persistencia para OrdenPedido y Recepcion (RFREC).
 */
interface RecepcionRepositoryInterface
{
    public function todasLasOrdenes(): Collection;

    public function ordenPorId(int $id): ?OrdenPedido;

    public function crearOrden(array $data): OrdenPedido;

    public function actualizarOrden(OrdenPedido $orden, array $data): OrdenPedido;

    public function todasLasRecepciones(): Collection;

    public function recepcionPorId(int $id): ?Recepcion;

    public function crearRecepcion(array $data): Recepcion;
}
