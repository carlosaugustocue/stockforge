<?php

namespace App\Modules\Catalogo\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateBodegaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre'      => ['required', 'string', 'max:100', 'unique:bodegas,nombre'],
            'descripcion' => ['nullable', 'string', 'max:255'],
            'tipo'        => ['required', 'in:principal,produccion,otro'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre de la bodega es obligatorio.',
            'nombre.unique'   => 'Ya existe una bodega con ese nombre.',
            'tipo.required'   => 'El tipo de bodega es obligatorio.',
            'tipo.in'         => 'El tipo debe ser: principal, produccion u otro.',
        ];
    }
}
