<?php

namespace App\Modules\Recepciones\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOrdenPedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'proveedor'      => ['sometimes', 'string', 'max:255'],
            'estado'         => ['sometimes', Rule::in(['cerrada', 'anulada'])],
            'fecha_esperada' => ['sometimes', 'nullable', 'date'],
            'observaciones'  => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'estado.in' => 'El estado solo puede actualizarse a "cerrada" o "anulada".',
        ];
    }
}
