<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: orden_pedido_items
 *
 * Ítems formales de una orden de pedido — qué materias primas se solicitan
 * y en qué cantidad. Son el "detalle" de la orden de compra.
 *
 * Esta tabla es INMUTABLE: una vez registrada la orden, los ítems
 * no se modifican (solo created_at, sin updated_at).
 *
 * La recepción real (lo que llegó físicamente) se registra en lotes_materia_prima
 * a través de la tabla recepciones.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orden_pedido_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('orden_pedido_id')
                ->constrained('ordenes_pedido')
                ->cascadeOnDelete()
                ->comment('Orden de pedido a la que pertenece este ítem');

            $table->foreignId('materia_prima_id')
                ->constrained('materias_primas')
                ->comment('Materia prima solicitada');

            // Cantidad solicitada al proveedor (puede diferir de lo recibido)
            $table->decimal('cantidad_solicitada', 12, 3)
                ->comment('Cantidad solicitada al proveedor en la orden de compra');

            // Inmutable — solo created_at
            $table->timestamp('created_at')->useCurrent()
                ->comment('Fecha de creación del ítem de la orden');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orden_pedido_items');
    }
};
