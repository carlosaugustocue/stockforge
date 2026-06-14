<?php

namespace App\Modules\Recepciones\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Valida la creación de una orden de pedido.
 *
 * Se acepta proveedor_id (nuevo, FK a proveedores) O proveedor (string, legado).
 * Los items son opcionales en la validación HTTP pero se recomienda incluirlos
 * para generar una orden de compra formal.
 */
class CreateOrdenPedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Nuevo: FK al catálogo de proveedores (requerido si no se envía 'proveedor')
            'proveedor_id'           => ['nullable', 'integer', 'exists:proveedores,id', 'required_without:proveedor'],
            // Legado / fallback: nombre libre (requerido si no se envía 'proveedor_id')
            'proveedor'              => ['nullable', 'string', 'max:255', 'required_without:proveedor_id'],

            'fecha_esperada'         => ['nullable', 'date', 'after_or_equal:today'],
            'observaciones'          => ['nullable', 'string', 'max:500'],

            // Ítems de la orden de compra
            'items'                  => ['nullable', 'array'],
            'items.*.materia_prima_id'   => ['required_with:items', 'integer', 'exists:materias_primas,id'],
            'items.*.cantidad_solicitada'=> ['required_with:items', 'numeric', 'gt:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'proveedor_id.exists'                    => 'El proveedor seleccionado no existe.',
            'proveedor.max'                          => 'El nombre del proveedor no puede superar 255 caracteres.',
            'fecha_esperada.date'                    => 'La fecha esperada no tiene un formato válido.',
            'fecha_esperada.after_or_equal'          => 'La fecha esperada debe ser hoy o una fecha futura.',
            'items.*.materia_prima_id.exists'        => 'Una o más materias primas del pedido no existen.',
            'items.*.cantidad_solicitada.gt'         => 'La cantidad solicitada debe ser mayor a cero.',
        ];
    }
}
