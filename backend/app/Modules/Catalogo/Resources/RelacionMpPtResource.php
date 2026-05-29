<?php

namespace App\Modules\Catalogo\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RelacionMpPtResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'materia_prima_id'    => $this->materia_prima_id,
            'materia_prima_nombre' => $this->whenLoaded('materiaPrima', fn() => $this->materiaPrima->nombre),
            'cantidad_requerida'  => $this->cantidad_requerida,
            'unidad_medida'       => $this->whenLoaded('unidadMedida', fn() => [
                'id'     => $this->unidadMedida->id,
                'nombre' => $this->unidadMedida->nombre,
            ]),
        ];
    }
}
