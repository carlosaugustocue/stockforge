<?php

namespace App\Modules\Catalogo\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PresentacionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                       => $this->id,
            'producto_terminado_id'    => $this->producto_terminado_id,
            'nombre'                   => $this->nombre,
            'unidades_por_presentacion' => $this->unidades_por_presentacion,
            'activa'                   => $this->activa,
        ];
    }
}
