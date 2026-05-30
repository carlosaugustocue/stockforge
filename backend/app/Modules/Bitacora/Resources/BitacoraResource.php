<?php

namespace App\Modules\Bitacora\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * BitacoraResource — DTO de salida para un registro de la bitácora.
 *
 * SOLID-SRP: solo serialización del modelo a JSON.
 * Nunca expone campos sensibles del usuario relacionado.
 */
class BitacoraResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'accion'      => $this->accion,
            'ip_address'  => $this->ip_address,
            'user_agent'  => $this->user_agent,
            'created_at'  => $this->created_at?->toIso8601String(),
            'usuario'     => $this->whenLoaded('user', fn() => $this->user ? [
                'id'    => $this->user->id,
                'name'  => $this->user->name,
                'email' => $this->user->email,
            ] : null),
        ];
    }
}
