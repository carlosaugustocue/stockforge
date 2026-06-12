<?php

namespace App\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * UpdateUserRequest — Validación de entrada para la edición de usuarios
 *
 * Permite actualizar nombre, email, rol y estado activo de un usuario.
 * La autorización por rol se delega al middleware CheckRole (role:administrador).
 *
 * Todos los campos son opcionales (PATCH semántico):
 * solo se actualizan los campos enviados en la petición.
 */
class UpdateUserRequest extends FormRequest
{
    /**
     * La autorización por rol se delega al middleware CheckRole.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Reglas de validación para la edición de usuario.
     * El email debe ser único excepto para el propio usuario que se edita.
     */
    public function rules(): array
    {
        $userId = $this->route('id');

        return [
            'name'    => ['sometimes', 'string', 'max:255'],
            'email'   => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'role_id' => ['sometimes', 'exists:roles,id'],
            'activo'  => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Mensajes de validación en español.
     */
    public function messages(): array
    {
        return [
            'name.max'        => 'El nombre no puede superar los 255 caracteres.',
            'email.email'     => 'El correo electrónico no tiene un formato válido.',
            'email.max'       => 'El correo electrónico no puede superar los 255 caracteres.',
            'email.unique'    => 'Ya existe un usuario registrado con ese correo electrónico.',
            'role_id.exists'  => 'El rol seleccionado no existe en el sistema.',
            'activo.boolean'  => 'El campo activo debe ser verdadero o falso.',
        ];
    }
}
