<?php

namespace App\Modules\Produccion\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EjecutarProduccionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'cantidad_producida' => ['required', 'numeric', 'gt:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'cantidad_producida.required' => 'La cantidad producida es obligatoria.',
            'cantidad_producida.gt'       => 'La cantidad producida debe ser mayor a cero.',
        ];
    }
}
