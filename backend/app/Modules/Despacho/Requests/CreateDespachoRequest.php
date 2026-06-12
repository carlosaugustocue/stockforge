<?php

namespace App\Modules\Despacho\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Valida la solicitud de despacho de un lote de PT.
 *
 * El lote debe existir y la cantidad debe ser positiva.
 * La validación de disponibilidad (bodega tipo 'ventas', stock suficiente)
 * ocurre en el servicio, no aquí — es lógica de negocio, no de formato.
 */
class CreateDespachoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lote_pt_id'         => ['required', 'integer', 'exists:lotes_producto_terminado,id'],
            'cantidad'           => ['required', 'numeric', 'gt:0'],
            'referencia_cliente' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'lote_pt_id.required' => 'El lote de producto terminado es obligatorio.',
            'lote_pt_id.exists'   => 'El lote de producto terminado no existe.',
            'cantidad.required'   => 'La cantidad a despachar es obligatoria.',
            'cantidad.gt'         => 'La cantidad debe ser mayor a cero.',
        ];
    }
}
