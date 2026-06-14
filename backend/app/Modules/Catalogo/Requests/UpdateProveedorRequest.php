<?php

namespace App\Modules\Catalogo\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProveedorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre'           => ['sometimes', 'string', 'max:255'],
            'contacto_nombre'  => ['nullable', 'string', 'max:150'],
            'telefono'         => ['nullable', 'string', 'max:30'],
            'email'            => ['nullable', 'email', 'max:150'],
            'activo'           => ['nullable', 'boolean'],
            'materias_primas'  => ['nullable', 'array'],
            'materias_primas.*'=> ['integer', 'exists:materias_primas,id'],
        ];
    }
}
