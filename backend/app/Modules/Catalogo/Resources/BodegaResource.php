<?php

namespace App\Modules\Catalogo\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BodegaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'nombre'      => $this->nombre,
            'descripcion' => $this->descripcion,
            'tipo'        => $this->tipo,
            'activa'      => $this->activa,
            'creado_en'   => $this->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}
