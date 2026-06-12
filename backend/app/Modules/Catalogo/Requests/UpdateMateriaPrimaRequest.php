<?php

namespace App\Modules\Catalogo\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMateriaPrimaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'nombre'           => ['sometimes', 'string', 'max:150', Rule::unique('materias_primas', 'nombre')->ignore($id)],
            'descripcion'      => ['sometimes', 'nullable', 'string'],
            'unidad_medida_id' => ['sometimes', 'exists:unidades_medida,id'],
            'costo_unitario'   => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'punto_reorden'    => ['sometimes', 'numeric', 'min:0'],
            'activa'           => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.unique'           => 'Ya existe una materia prima con ese nombre.',
            'unidad_medida_id.exists' => 'La unidad de medida seleccionada no existe.',
            'costo_unitario.numeric'  => 'El costo unitario debe ser un número.',
            'punto_reorden.numeric'   => 'El punto de reorden debe ser un número.',
        ];
    }
}
