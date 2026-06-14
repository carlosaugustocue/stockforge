<?php

namespace App\Modules\Despacho\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * DespachoResource — Serialización de un despacho a JSON.
 *
 * Incluye trazabilidad completa: lote PT → orden de producción → cliente.
 * HU-027 — Trazabilidad completa del ciclo productivo.
 */
class DespachoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'cantidad'           => $this->cantidad,
            'referencia_cliente' => $this->referencia_cliente,
            'despachado_en'      => $this->created_at->toDateTimeString(),
            'cliente'            => $this->whenLoaded('cliente', fn() => $this->cliente ? [
                'id'              => $this->cliente->id,
                'tipo'            => $this->cliente->tipo,
                'nombre'          => $this->cliente->nombre,
                'nit_cedula'      => $this->cliente->nit_cedula,
                'telefono'        => $this->cliente->telefono,
                'contacto_nombre' => $this->cliente->contacto_nombre,
            ] : null),
            'usuario'            => $this->whenLoaded('usuario', fn() => [
                'id'     => $this->usuario->id,
                'nombre' => $this->usuario->name,
            ]),
            'lote_pt'            => $this->whenLoaded('lotePt', fn() => [
                'id'                  => $this->lotePt->id,
                'cantidad_restante'   => $this->lotePt->cantidad_actual,
                'fecha_produccion'    => $this->lotePt->fecha_produccion?->toDateString(),
                'producto_terminado'  => $this->lotePt->relationLoaded('productoTerminado') ? [
                    'id'     => $this->lotePt->productoTerminado->id,
                    'nombre' => $this->lotePt->productoTerminado->nombre,
                    'unidad' => $this->lotePt->productoTerminado->relationLoaded('unidadMedida')
                        ? $this->lotePt->productoTerminado->unidadMedida->nombre
                        : null,
                ] : null,
                'bodega'             => $this->lotePt->relationLoaded('bodega') ? [
                    'id'     => $this->lotePt->bodega->id,
                    'nombre' => $this->lotePt->bodega->nombre,
                ] : null,
                'orden_produccion_id' => $this->lotePt->orden_produccion_id,
            ]),
            'movimiento_id'      => $this->movimiento_id,
        ];
    }
}
