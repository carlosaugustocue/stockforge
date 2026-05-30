<?php

namespace App\Modules\Produccion\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateOrdenProduccionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'producto_terminado_id' => ['required', 'integer', 'exists:productos_terminados,id'],
            'cantidad_planificada'  => ['required', 'numeric', 'gt:0'],
            'fecha_planificada'     => ['required', 'date', 'after_or_equal:today'],
            'observaciones'         => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'producto_terminado_id.required' => 'El producto terminado es obligatorio.',
            'producto_terminado_id.exists'   => 'El producto terminado no existe en el catálogo.',
            'cantidad_planificada.required'  => 'La cantidad a producir es obligatoria.',
            'cantidad_planificada.gt'        => 'La cantidad debe ser mayor a cero.',
            'fecha_planificada.required'     => 'La fecha de producción es obligatoria.',
            'fecha_planificada.after_or_equal' => 'La fecha debe ser hoy o una fecha futura.',
        ];
    }
}
