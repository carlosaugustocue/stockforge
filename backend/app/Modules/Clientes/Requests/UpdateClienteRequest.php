<?php

namespace App\Modules\Clientes\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClienteRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'tipo'            => ['sometimes', 'in:persona,empresa'],
            'nombre'          => ['sometimes', 'string', 'max:200'],
            'nit_cedula'      => ['nullable', 'string', 'max:50'],
            'telefono'        => ['nullable', 'string', 'max:50'],
            'email'           => ['nullable', 'email', 'max:150'],
            'direccion'       => ['nullable', 'string', 'max:255'],
            'contacto_nombre' => ['nullable', 'string', 'max:150'],
            'activo'          => ['nullable', 'boolean'],
        ];
    }
}
