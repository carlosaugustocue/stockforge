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
            'estado'         => $this->estado,
            'fecha_esperada' => $this->fecha_esperada?->toDateString(),
            'observaciones'  => $this->observaciones,
            'usuario'        => $this->whenLoaded('usuario', fn() => [
                'id'     => $this->usuario->id,
                'nombre' => $this->usuario->name,
            ]),
            'recepciones'    => RecepcionResource::collection($this->whenLoaded('recepciones')),
            'creada_en'      => $this->created_at->toDateTimeString(),
        ];
    }
}
