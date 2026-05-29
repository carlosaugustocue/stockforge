<?php

namespace App\Modules\Catalogo\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateProductoTerminadoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre'           => ['required', 'string', 'max:150', 'unique:productos_terminados,nombre'],
            'descripcion'      => ['nullable', 'string'],
            'unidad_medida_id' => ['required', 'exists:unidades_medida,id'],
            'precio_venta'     => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required'           => 'El nombre del producto es obligatorio.',
            'nombre.unique'             => 'Ya existe un producto con ese nombre.',
            'unidad_medida_id.required' => 'La unidad de medida es obligatoria.',
            'unidad_medida_id.exists'   => 'La unidad de medida seleccionada no existe.',
            'precio_venta.numeric'      => 'El precio de venta debe ser un número.',
        ];
    }
}
