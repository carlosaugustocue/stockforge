<?php

namespace App\Modules\Permisos\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AsignarPermisoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // La autorización la hace el middleware 'role:administrador'
    }

    public function rules(): array
    {
        return [
            'permission_id' => ['required', 'integer', 'exists:permissions,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'permission_id.required' => 'El ID del permiso es obligatorio.',
            'permission_id.exists'   => 'El permiso especificado no existe.',
        ];
    }
}
