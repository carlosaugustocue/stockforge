<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: ordenes_pedido
 *
 * Órdenes de compra emitidas a proveedores.
 * El sistema no acepta recepciones de materias primas sin una orden previa (RFREC).
 * Una orden puede recibirse en múltiples recepciones parciales (recepción parcial).
 * La orden permanece en estado 'en_recepcion' hasta que se cierra manualmente.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ordenes_pedido', function (Blueprint $table) {
            $table->id();

            // Nombre o razón social del proveedor — sin tabla de proveedores por ahora (YAGNI)
            $table->string('proveedor', 255)
                ->comment('Nombre o razón social del proveedor');

            // Estado del ciclo de vida de la orden
            $table->enum('estado', ['pendiente', 'en_recepcion', 'cerrada', 'anulada'])
                ->default('pendiente')
                ->comment('pendiente: emitida; en_recepcion: con al menos una recepción parcial; cerrada: completada; anulada');

            // Fecha esperada de entrega del proveedor
            $table->date('fecha_esperada')->nullable()
                ->comment('Fecha estimada de entrega pactada con el proveedor');

            // Observaciones o notas internas de la orden
            $table->string('observaciones', 500)->nullable()
                ->comment('Notas internas sobre la orden de compra');

            // Usuario que creó la orden (encargado o administrador)
            $table->foreignId('user_id')
                ->nullable()
                ->nullOnDelete()
                ->constrained('users')
                ->comment('Usuario que registró la orden de pedido');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordenes_pedido');
    }
};
