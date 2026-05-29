<?php

namespace App\Modules\Catalogo\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBodegaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'nombre'      => ['sometimes', 'string', 'max:100', Rule::unique('bodegas', 'nombre')->ignore($id)],
            'descripcion' => ['sometimes', 'nullable', 'string', 'max:255'],
            'tipo'        => ['sometimes', 'in:principal,produccion,otro'],
            'activa'      => ['sometimes', 'boolean'],
        ];
    }
}
