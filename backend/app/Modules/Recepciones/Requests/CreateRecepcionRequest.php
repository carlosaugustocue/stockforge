<?php

namespace App\Modules\Recepciones\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateRecepcionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'observaciones'                    => ['nullable', 'string', 'max:500'],
            'items'                            => ['required', 'array', 'min:1'],
            'items.*.materia_prima_id'         => ['required', 'integer', 'exists:materias_primas,id'],
            'items.*.cantidad'                 => ['required', 'numeric', 'gt:0'],
            'items.*.fecha_vencimiento'        => ['nullable', 'date', 'after:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required'                      => 'Debe incluir al menos un ítem en la recepción.',
            'items.min'                           => 'Debe incluir al menos un ítem en la recepción.',
            'items.*.materia_prima_id.required'   => 'Cada ítem debe especificar una materia prima.',
            'items.*.materia_prima_id.exists'     => 'La materia prima indicada no existe en el catálogo.',
            'items.*.cantidad.required'           => 'La cantidad de cada ítem es obligatoria.',
            'items.*.cantidad.gt'                 => 'La cantidad debe ser mayor a cero.',
            'items.*.fecha_vencimiento.date'      => 'La fecha de vencimiento no tiene formato válido.',
            'items.*.fecha_vencimiento.after'     => 'La fecha de vencimiento debe ser posterior a hoy.',
        ];
    }
}
