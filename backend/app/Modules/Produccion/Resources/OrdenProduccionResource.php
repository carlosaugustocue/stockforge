<?php

namespace App\Modules\Produccion\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrdenProduccionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'estado'                => $this->estado,
            'producto_terminado_id' => $this->producto_terminado_id,
            'producto_terminado'    => $this->whenLoaded('productoTerminado', fn() => [
                'id'     => $this->productoTerminado->id,
                'nombre' => $this->productoTerminado->nombre,
                'unidad' => $this->productoTerminado->relationLoaded('unidadMedida')
                    ? $this->productoTerminado->unidadMedida->nombre
                    : null,
            ]),
            'cantidad_planificada'  => $this->cantidad_planificada,
            'cantidad_producida'    => $this->cantidad_producida,
            'fecha_planificada'     => $this->fecha_planificada?->toDateString(),
            'observaciones'         => $this->observaciones,
            'usuario'               => $this->whenLoaded('usuario', fn() => [
                'id'     => $this->usuario->id,
                'nombre' => $this->usuario->name,
            ]),
            'requerimientos'        => $this->whenLoaded('requerimientos', fn() =>
                $this->requerimientos->map(fn($req) => [
                    'materia_prima_id'   => $req->materia_prima_id,
                    'materia_prima'      => $req->relationLoaded('materiaPrima') ? $req->materiaPrima->nombre : null,
                    'unidad_medida'      => $req->relationLoaded('materiaPrima') && $req->materiaPrima->relationLoaded('unidadMedida')
                        ? $req->materiaPrima->unidadMedida?->nombre
                        : null,
                    'cantidad_requerida' => $req->cantidad_requerida,
                    'lote_sugerido_id'   => $req->lote_sugerido_id,
                ])
            ),
            'lote_pt'               => $this->whenLoaded('loteProductoTerminado', fn() =>
                $this->loteProductoTerminado ? [
                    'id'              => $this->loteProductoTerminado->id,
                    'bodega'          => $this->loteProductoTerminado->relationLoaded('bodega')
                        ? $this->loteProductoTerminado->bodega->nombre : null,
                    'cantidad_actual' => $this->loteProductoTerminado->cantidad_actual,
                    'fecha_produccion'=> $this->loteProductoTerminado->fecha_produccion?->toDateString(),
                ] : null
            ),
            'creada_en'             => $this->created_at->toDateTimeString(),
        ];
    }
}
