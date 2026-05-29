<?php

namespace App\Modules\Catalogo\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreatePresentacionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre'                    => ['required', 'string', 'max:100'],
            'unidades_por_presentacion' => ['required', 'numeric', 'min:0.001'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required'                    => 'El nombre de la presentación es obligatorio.',
            'unidades_por_presentacion.required' => 'Las unidades por presentación son obligatorias.',
            'unidades_por_presentacion.numeric'  => 'Las unidades por presentación deben ser un número.',
            'unidades_por_presentacion.min'      => 'Las unidades por presentación deben ser mayor a 0.',
        ];
    }
}
