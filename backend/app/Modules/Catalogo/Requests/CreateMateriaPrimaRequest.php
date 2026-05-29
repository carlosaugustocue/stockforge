<?php

namespace App\Modules\Catalogo\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateMateriaPrimaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre'          => ['required', 'string', 'max:150', 'unique:materias_primas,nombre'],
            'descripcion'     => ['nullable', 'string'],
            'unidad_medida_id' => ['required', 'exists:unidades_medida,id'],
            'costo_unitario'  => ['nullable', 'numeric', 'min:0'],
            'punto_reorden'   => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required'           => 'El nombre de la materia prima es obligatorio.',
            'nombre.unique'             => 'Ya existe una materia prima con ese nombre.',
            'unidad_medida_id.required' => 'La unidad de medida es obligatoria.',
            'unidad_medida_id.exists'   => 'La unidad de medida seleccionada no existe.',
            'costo_unitario.numeric'    => 'El costo unitario debe ser un número.',
            'punto_reorden.numeric'     => 'El punto de reorden debe ser un número.',
        ];
    }
}
