<?php

namespace App\Modules\Catalogo\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductoTerminadoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'nombre'           => ['sometimes', 'string', 'max:150', Rule::unique('productos_terminados', 'nombre')->ignore($id)],
            'descripcion'      => ['sometimes', 'nullable', 'string'],
            'unidad_medida_id' => ['sometimes', 'exists:unidades_medida,id'],
            'precio_venta'     => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'activo'           => ['sometimes', 'boolean'],
        ];
    }
}
