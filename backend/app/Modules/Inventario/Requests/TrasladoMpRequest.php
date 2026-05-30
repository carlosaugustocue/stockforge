<?php

namespace App\Modules\Inventario\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Valida la solicitud de traslado de un lote de MP entre bodegas.
 *
 * La validación de stock suficiente y bodega destino ≠ origen
 * ocurre en el servicio — es lógica de negocio, no de formato.
 */
class TrasladoMpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lote_id'          => ['required', 'integer', 'exists:lotes_materia_prima,id'],
            'bodega_destino_id'=> ['required', 'integer', 'exists:bodegas,id'],
            'cantidad'         => ['required', 'numeric', 'gt:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'lote_id.required'           => 'El lote de materia prima es obligatorio.',
            'lote_id.exists'             => 'El lote de materia prima no existe.',
            'bodega_destino_id.required' => 'La bodega destino es obligatoria.',
            'bodega_destino_id.exists'   => 'La bodega destino no existe.',
            'cantidad.required'          => 'La cantidad a trasladar es obligatoria.',
            'cantidad.gt'                => 'La cantidad debe ser mayor a cero.',
        ];
    }
}
