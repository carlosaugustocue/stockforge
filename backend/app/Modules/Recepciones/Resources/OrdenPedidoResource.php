<?php

namespace App\Modules\Recepciones\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrdenPedidoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'proveedor'      => $this->proveedor,
            'proveedor_id'   => $this->proveedor_id,
            'proveedor_detalle' => $this->whenLoaded('proveedor', fn() => $this->proveedor_id ? [
                'id'              => $this->getRelation('proveedor')?->id,
                'nombre'          => $this->getRelation('proveedor')?->nombre,
                'contacto_nombre' => $this->getRelation('proveedor')?->contacto_nombre,
                'telefono'        => $this->getRelation('proveedor')?->telefono,
                'email'           => $this->getRelation('proveedor')?->email,
            ] : null),
            'estado'         => $this->estado,
            'fecha_esperada' => $this->fecha_esperada?->toDateString(),
            'observaciones'  => $this->observaciones,
            'items'          => $this->whenLoaded('items', fn() =>
                $this->items->map(fn($item) => [
                    'id'                  => $item->id,
                    'materia_prima_id'    => $item->materia_prima_id,
                    'materia_prima'       => $item->materiaPrima?->nombre,
                    'unidad_medida'       => $item->materiaPrima?->unidadMedida?->nombre,
                    'cantidad_solicitada' => (float) $item->cantidad_solicitada,
                ])->values()
            ),
            'usuario'        => $this->whenLoaded('usuario', fn() => [
                'id'     => $this->usuario->id,
                'nombre' => $this->usuario->name,
            ]),
            'recepciones'    => RecepcionResource::collection($this->whenLoaded('recepciones')),
            'creada_en'      => $this->created_at->toDateTimeString(),
        ];
    }
}
