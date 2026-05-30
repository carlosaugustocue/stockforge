<?php

namespace App\Modules\Produccion\Services;

use App\Models\Bodega;
use App\Models\LoteProductoTerminado;
use App\Models\MovimientoInventario;
use App\Models\OrdenProduccion;
use App\Models\RequerimientoMaterial;
use App\Modules\Produccion\Repositories\Contracts\ProduccionRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * ProduccionService — Lógica del ciclo productivo (RFPROD01-05).
 *
 * Etapa 1 — Crear orden: calcula requerimientos de MP con FEFO y valida stock.
 * Etapa 2 — Ejecutar: consume MP de Bodega Principal (FEFO) y crea lote PT en Planta.
 * Etapa 3 — Trasladar PT: mueve el lote de PT de Planta → Área de Ventas.
 *
 * Decisión de diseño confirmada: el descuento de MP ocurre en Etapa 2 (ejecución),
 * directo desde Bodega Principal. No hay traslado obligatorio previo de MP.
 *
 * Todas las escrituras multi-tabla ocurren dentro de DB::transaction() (RFINV04).
 */
class ProduccionService
{
    public function __construct(
        private readonly ProduccionRepositoryInterface $repo,
        private readonly FefoService $fefo,
    ) {}

    public function listarOrdenes(): Collection
    {
        return $this->repo->todasLasOrdenes();
    }

    public function obtenerOrden(int $id): ?OrdenProduccion
    {
        return $this->repo->ordenPorId($id);
    }

    /**
     * Etapa 1 — Crea una orden de producción y su snapshot de requerimientos.
     *
     * Valida que haya stock suficiente de cada MP en Bodega Principal.
     * Si alguna MP falta, lanza RuntimeException antes de persistir nada.
     *
     * @throws \RuntimeException con detalle de MP faltante (RFPROD05)
     */
    public function crearOrden(array $data, int $userId): OrdenProduccion
    {
        $bodegaPrincipal = Bodega::where('tipo', 'principal')->firstOrFail();
        $pt = \App\Models\ProductoTerminado::with('relaciones.materiaPrima')->findOrFail($data['producto_terminado_id']);
        $cantidad = (float) $data['cantidad_planificada'];

        // Validar stock y calcular requerimientos antes de persistir
        $requerimientos = [];
        foreach ($pt->relaciones as $relacion) {
            $mp              = $relacion->materiaPrima;
            $cantidadNeeded  = round($relacion->cantidad_requerida * $cantidad, 3);
            $loteSugerido    = $this->fefo->loteSugerido($mp->id, $bodegaPrincipal->id);
            $disponible      = $this->fefo->stockDisponible($mp->id, $bodegaPrincipal->id);

            if ($disponible < $cantidadNeeded) {
                throw new \RuntimeException(json_encode([
                    'materia_prima' => $mp->nombre,
                    'requerida'     => $cantidadNeeded,
                    'disponible'    => round($disponible, 3),
                    'faltante'      => round($cantidadNeeded - $disponible, 3),
                ]));
            }

            $requerimientos[] = [
                'materia_prima_id'  => $mp->id,
                'cantidad_requerida'=> $cantidadNeeded,
                'lote_sugerido_id'  => $loteSugerido?->id,
            ];
        }

        $orden = $this->repo->crearOrden([
            'producto_terminado_id' => $pt->id,
            'user_id'               => $userId,
            'cantidad_planificada'  => $cantidad,
            'fecha_planificada'     => $data['fecha_planificada'],
            'observaciones'         => $data['observaciones'] ?? null,
            'estado'                => 'pendiente',
        ]);

        foreach ($requerimientos as $req) {
            RequerimientoMaterial::create([...$req, 'orden_produccion_id' => $orden->id]);
        }

        return $orden->load(['requerimientos.materiaPrima', 'productoTerminado']);
    }

    /**
     * Etapa 2 — Ejecuta la producción.
     *
     * Por cada MP del requerimiento (ajustado a cantidad_producida real):
     *   - Selecciona lotes con FEFO usando lockForUpdate()
     *   - Descuenta cantidad_actual del/los lote(s)
     *   - Inserta movimiento CONSUMO_MP inmutable
     *
     * Crea el LoteProductoTerminado en Planta de Producción.
     * Inserta movimiento PRODUCCION_ENTRADA inmutable.
     *
     * @throws \RuntimeException si alguna MP no tiene stock suficiente (RFPROD05)
     */
    public function ejecutarProduccion(OrdenProduccion $orden, array $data, int $userId): OrdenProduccion
    {
        if (! $orden->estaPendiente()) {
            throw new \RuntimeException("La orden no está en estado 'pendiente'.");
        }

        $bodegaPrincipal = Bodega::where('tipo', 'principal')->firstOrFail();
        $bodegaPlanta    = Bodega::where('tipo', 'produccion')->firstOrFail();
        $cantidadReal    = (float) $data['cantidad_producida'];

        return DB::transaction(function () use ($orden, $cantidadReal, $userId, $bodegaPrincipal, $bodegaPlanta) {
            $pt = \App\Models\ProductoTerminado::with('relaciones.materiaPrima')->findOrFail($orden->producto_terminado_id);

            // Calcular consumo real y ejecutar FEFO con lockForUpdate
            foreach ($pt->relaciones as $relacion) {
                $mp           = $relacion->materiaPrima;
                $cantNeeded   = round($relacion->cantidad_requerida * $cantidadReal, 3);
                $planConsumo  = $this->fefo->planificarConsumo($mp->id, $bodegaPrincipal->id, $cantNeeded, $mp->nombre);

                foreach ($planConsumo as ['lote' => $lote, 'cantidad_a_consumir' => $aConsumir]) {
                    // Bloqueo pesimista — evita doble descuento bajo concurrencia (RNFPER-04)
                    $lote = \App\Models\LoteMateriaPrima::lockForUpdate()->find($lote->id);
                    $lote->decrement('cantidad_actual', $aConsumir);

                    MovimientoInventario::create([
                        'tipo'               => MovimientoInventario::TIPO_CONSUMO_MP,
                        'entidad_tipo'       => MovimientoInventario::ENTIDAD_MATERIA_PRIMA,
                        'entidad_id'         => $lote->id,
                        'bodega_id'          => $bodegaPrincipal->id,
                        'cantidad'           => $aConsumir,
                        'orden_produccion_id'=> $orden->id,
                        'user_id'            => $userId,
                    ]);
                }
            }

            // Crear lote de PT en Planta de Producción
            $lotePt = LoteProductoTerminado::create([
                'orden_produccion_id'   => $orden->id,
                'producto_terminado_id' => $orden->producto_terminado_id,
                'bodega_id'             => $bodegaPlanta->id,
                'cantidad_inicial'      => $cantidadReal,
                'cantidad_actual'       => $cantidadReal,
                'fecha_produccion'      => now()->toDateString(),
            ]);

            MovimientoInventario::create([
                'tipo'               => MovimientoInventario::TIPO_PRODUCCION_ENTRADA,
                'entidad_tipo'       => MovimientoInventario::ENTIDAD_PRODUCTO_TERMINADO,
                'entidad_id'         => $lotePt->id,
                'bodega_id'          => $bodegaPlanta->id,
                'cantidad'           => $cantidadReal,
                'orden_produccion_id'=> $orden->id,
                'user_id'            => $userId,
            ]);

            $this->repo->actualizarOrden($orden, [
                'estado'            => 'producido',
                'cantidad_producida' => $cantidadReal,
            ]);

            return $this->repo->ordenPorId($orden->id);
        });
    }

    /**
     * Etapa 3 — Traslada el PT de Planta de Producción → Área de Ventas.
     *
     * Tras este traslado, el PT queda disponible para despacho (RFPROD03).
     *
     * @throws \RuntimeException si la orden no está en estado 'producido'
     */
    public function trasladarPtAVentas(OrdenProduccion $orden, int $userId): OrdenProduccion
    {
        if (! $orden->estaProducido()) {
            throw new \RuntimeException("La orden debe estar en estado 'producido' para trasladar el PT.");
        }

        $bodegaVentas = Bodega::where('tipo', 'ventas')->firstOrFail();

        return DB::transaction(function () use ($orden, $userId, $bodegaVentas) {
            $lotePt = LoteProductoTerminado::lockForUpdate()
                ->where('orden_produccion_id', $orden->id)
                ->firstOrFail();

            $bodegaOrigen = $lotePt->bodega_id;

            // Traslado SALIDA desde Planta
            MovimientoInventario::create([
                'tipo'               => MovimientoInventario::TIPO_TRASLADO_SALIDA,
                'entidad_tipo'       => MovimientoInventario::ENTIDAD_PRODUCTO_TERMINADO,
                'entidad_id'         => $lotePt->id,
                'bodega_id'          => $bodegaOrigen,
                'cantidad'           => $lotePt->cantidad_actual,
                'orden_produccion_id'=> $orden->id,
                'user_id'            => $userId,
            ]);

            // Actualizar bodega del lote → Área de Ventas
            $lotePt->update(['bodega_id' => $bodegaVentas->id]);

            // Traslado ENTRADA en Ventas
            MovimientoInventario::create([
                'tipo'               => MovimientoInventario::TIPO_TRASLADO_ENTRADA,
                'entidad_tipo'       => MovimientoInventario::ENTIDAD_PRODUCTO_TERMINADO,
                'entidad_id'         => $lotePt->id,
                'bodega_id'          => $bodegaVentas->id,
                'cantidad'           => $lotePt->cantidad_actual,
                'orden_produccion_id'=> $orden->id,
                'user_id'            => $userId,
            ]);

            $this->repo->actualizarOrden($orden, ['estado' => 'completada']);

            return $this->repo->ordenPorId($orden->id);
        });
    }

    public function anularOrden(OrdenProduccion $orden): OrdenProduccion
    {
        if (! $orden->estaPendiente()) {
            throw new \RuntimeException("Solo se pueden anular órdenes en estado 'pendiente'.");
        }

        return $this->repo->actualizarOrden($orden, ['estado' => 'anulada']);
    }
}
