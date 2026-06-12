<?php

namespace App\Modules\Catalogo\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AsociarMpRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'materia_prima_id'   => ['required', 'exists:materias_primas,id'],
            'cantidad_requerida' => ['required', 'numeric', 'min:0.0001'],
            'unidad_medida_id'   => ['required', 'exists:unidades_medida,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'materia_prima_id.required'   => 'La materia prima es obligatoria.',
            'materia_prima_id.exists'     => 'La materia prima seleccionada no existe.',
            'cantidad_requerida.required' => 'La cantidad requerida es obligatoria.',
            'cantidad_requerida.numeric'  => 'La cantidad requerida debe ser un número.',
            'cantidad_requerida.min'      => 'La cantidad requerida debe ser mayor a 0.',
            'unidad_medida_id.required'   => 'La unidad de medida es obligatoria.',
            'unidad_medida_id.exists'     => 'La unidad de medida seleccionada no existe.',
        ];
    }
}
