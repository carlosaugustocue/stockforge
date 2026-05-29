<?php

namespace App\Modules\Catalogo\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductoTerminadoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'nombre'        => $this->nombre,
            'descripcion'   => $this->descripcion,
            'unidad_medida' => $this->whenLoaded('unidadMedida', fn() => [
                'id'     => $this->unidadMedida->id,
                'nombre' => $this->unidadMedida->nombre,
            ]),
            'presentaciones' => $this->whenLoaded('presentaciones', fn() =>
                PresentacionResource::collection($this->presentaciones)
            ),
            'materias_primas' => $this->whenLoaded('relaciones', fn() =>
                RelacionMpPtResource::collection($this->relaciones)
            ),
            'activo'        => $this->activo,
            'creado_en'     => $this->created_at?->format('Y-m-d H:i:s'),
        ];
        // Nota: precio_venta NO se expone en el listado (dato sensible RNF-SEC-05)
    }
}
