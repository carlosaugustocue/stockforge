<?php

namespace App\Modules\Recepciones\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecepcionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'orden_pedido_id' => $this->orden_pedido_id,
            'observaciones'   => $this->observaciones,
            'usuario'         => $this->whenLoaded('usuario', fn() => [
                'id'     => $this->usuario->id,
                'nombre' => $this->usuario->name,
            ]),
            'lotes'           => $this->whenLoaded('lotes', fn() =>
                $this->lotes->map(fn($lote) => [
                    'id'                => $lote->id,
                    'materia_prima_id'  => $lote->materia_prima_id,
                    'materia_prima'     => $lote->relationLoaded('materiaPrima')
                        ? $lote->materiaPrima->nombre
                        : null,
                    'bodega_id'         => $lote->bodega_id,
                    'cantidad_inicial'  => $lote->cantidad_inicial,
                    'cantidad_actual'   => $lote->cantidad_actual,
                    'fecha_vencimiento' => $lote->fecha_vencimiento?->toDateString(),
                    'fecha_ingreso'     => $lote->fecha_ingreso->toDateTimeString(),
                ])
            ),
            'registrada_en'   => $this->created_at->toDateTimeString(),
        ];
    }
}
