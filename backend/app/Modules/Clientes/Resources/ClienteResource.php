<?php

namespace App\Modules\Clientes\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClienteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'tipo'            => $this->tipo,
            'nombre'          => $this->nombre,
            'nit_cedula'      => $this->nit_cedula,
            'telefono'        => $this->telefono,
            'email'           => $this->email,
            'direccion'       => $this->direccion,
            'contacto_nombre' => $this->contacto_nombre,
            'activo'          => $this->activo,
            'created_at'      => $this->created_at?->toDateString(),
        ];
    }
}
