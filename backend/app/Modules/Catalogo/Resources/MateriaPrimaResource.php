<?php

namespace App\Modules\Catalogo\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MateriaPrimaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'nombre'         => $this->nombre,
            'descripcion'    => $this->descripcion,
            'unidad_medida'  => $this->whenLoaded('unidadMedida', fn() => [
                'id'     => $this->unidadMedida->id,
                'nombre' => $this->unidadMedida->nombre,
            ]),
            'punto_reorden'  => $this->punto_reorden,
            'activa'         => $this->activa,
            'creado_en'      => $this->created_at?->format('Y-m-d H:i:s'),
        ];
        // Nota: costo_unitario NO se expone en el listado (dato sensible RNF-SEC-05)
    }
}
