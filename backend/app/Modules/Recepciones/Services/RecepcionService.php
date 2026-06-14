<?php

namespace App\Modules\Recepciones\Services;

use App\Models\Bodega;
use App\Models\LoteMateriaPrima;
use App\Models\MovimientoInventario;
use App\Models\OrdenPedido;
use App\Models\OrdenPedidoItem;
use App\Models\Proveedor;
use App\Models\Recepcion;
use App\Modules\Recepciones\Repositories\Contracts\RecepcionRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * RecepcionService — Lógica de negocio del módulo de recepciones.
 *
 * Gestiona el ciclo de vida de las órdenes de pedido y el registro de
 * recepciones de materias primas (RFREC).
 *
 * Regla principal: no se acepta ninguna recepción sin una orden de pedido previa.
 * Cada recepción crea lotes de MP en Bodega Principal y genera movimientos
 * RECEPCION_ENTRADA inmutables para trazabilidad (RFINV02).
 *
 * Todas las escrituras multi-tabla se ejecutan dentro de DB::transaction() (RFINV04).
 */
class RecepcionService
{
    public function __construct(
        private readonly RecepcionRepositoryInterface $repo,
    ) {}

    public function listarOrdenes(): Collection
    {
        return $this->repo->todasLasOrdenes();
    }

    public function obtenerOrden(int $id): ?OrdenPedido
    {
        return $this->repo->ordenPorId($id);
    }

    public function crearOrden(array $data, int $userId): OrdenPedido
    {
        // Resolver nombre del proveedor desde FK o string libre
        $proveedorNombre = $data['proveedor'] ?? null;
        $proveedorId     = $data['proveedor_id'] ?? null;

        if ($proveedorId && ! $proveedorNombre) {
            $proveedorNombre = Proveedor::find($proveedorId)?->nombre ?? '';
        }

        $orden = $this->repo->crearOrden([
            'proveedor'      => $proveedorNombre,
            'proveedor_id'   => $proveedorId,
            'fecha_esperada' => $data['fecha_esperada'] ?? null,
            'observaciones'  => $data['observaciones'] ?? null,
            'user_id'        => $userId,
            'estado'         => 'pendiente',
        ]);

        // Crear ítems de la orden si se proporcionaron
        foreach ($data['items'] ?? [] as $item) {
            OrdenPedidoItem::create([
                'orden_pedido_id'     => $orden->id,
                'materia_prima_id'    => $item['materia_prima_id'],
                'cantidad_solicitada' => $item['cantidad_solicitada'],
            ]);
        }

        return $orden->load(['items.materiaPrima', 'proveedor']);
    }

    public function actualizarOrden(OrdenPedido $orden, array $data): OrdenPedido
    {
        return $this->repo->actualizarOrden($orden, $data);
    }

    public function listarRecepciones(): Collection
    {
        return $this->repo->todasLasRecepciones();
    }

    public function obtenerRecepcion(int $id): ?Recepcion
    {
        return $this->repo->recepcionPorId($id);
    }

    /**
     * Registra una recepción de materias primas contra una orden de pedido.
     *
     * Por cada ítem recibido:
     *   1. Crea un LoteMateriaPrima en Bodega Principal
     *   2. Inserta un movimiento RECEPCION_ENTRADA (inmutable)
     *
     * Al finalizar, actualiza el estado de la orden a 'en_recepcion'.
     * El cierre definitivo ('cerrada') lo hace manualmente el encargado via PATCH.
     *
     * RFINV04 — Todo ocurre dentro de una transacción atómica.
     * RFINV02 — Cada lote y movimiento quedan trazables al proveedor.
     *
     * @throws \RuntimeException si la orden no está en estado recepcionable
     */
    public function registrarRecepcion(OrdenPedido $orden, array $data, int $userId): Recepcion
    {
        if ($orden->estaAnulada() || $orden->estaCerrada()) {
            throw new \RuntimeException(
                "No se puede recepcionar una orden en estado '{$orden->estado}'."
            );
        }

        $bodegaPrincipal = Bodega::where('tipo', 'principal')->firstOrFail();

        return DB::transaction(function () use ($orden, $data, $userId, $bodegaPrincipal) {
            // Crear el registro de recepción
            $recepcion = $this->repo->crearRecepcion([
                'orden_pedido_id' => $orden->id,
                'user_id'         => $userId,
                'observaciones'   => $data['observaciones'] ?? null,
            ]);

            // Por cada ítem recibido: crear lote + movimiento de entrada
            foreach ($data['items'] as $item) {
                $lote = LoteMateriaPrima::create([
                    'recepcion_id'     => $recepcion->id,
                    'materia_prima_id' => $item['materia_prima_id'],
                    'bodega_id'        => $bodegaPrincipal->id,
                    'cantidad_inicial' => $item['cantidad'],
                    'cantidad_actual'  => $item['cantidad'],
                    'fecha_vencimiento'=> $item['fecha_vencimiento'] ?? null,
                    'fecha_ingreso'    => now(),
                ]);

                MovimientoInventario::create([
                    'tipo'         => MovimientoInventario::TIPO_RECEPCION_ENTRADA,
                    'entidad_tipo' => MovimientoInventario::ENTIDAD_MATERIA_PRIMA,
                    'entidad_id'   => $lote->id,
                    'bodega_id'    => $bodegaPrincipal->id,
                    'cantidad'     => $item['cantidad'],
                    'recepcion_id' => $recepcion->id,
                    'user_id'      => $userId,
                ]);
            }

            // Actualizar estado de la orden a 'en_recepcion' si aún estaba pendiente
            if ($orden->estaPendiente()) {
                $this->repo->actualizarOrden($orden, ['estado' => 'en_recepcion']);
            }

            return $recepcion->load(['lotes.materiaPrima', 'usuario']);
        });
    }
}
