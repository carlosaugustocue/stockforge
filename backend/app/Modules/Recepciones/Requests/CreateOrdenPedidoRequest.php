<?php

namespace App\Modules\Recepciones\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateOrdenPedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'proveedor'      => ['required', 'string', 'max:255'],
            'fecha_esperada' => ['nullable', 'date', 'after_or_equal:today'],
            'observaciones'  => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'proveedor.required'          => 'El nombre del proveedor es obligatorio.',
            'proveedor.max'               => 'El nombre del proveedor no puede superar 255 caracteres.',
            'fecha_esperada.date'         => 'La fecha esperada no tiene un formato válido.',
            'fecha_esperada.after_or_equal' => 'La fecha esperada debe ser hoy o una fecha futura.',
        ];
    }
}
