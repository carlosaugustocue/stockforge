<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: recepciones
 *
 * Registro de cada evento de entrada física de materias primas al almacén.
 * Una misma orden de pedido puede tener múltiples recepciones (parciales).
 *
 * TABLA INMUTABLE: solo tiene created_at, sin updated_at.
 * Una recepción registrada no se modifica ni se elimina.
 * Si hay error, se registra una recepción compensatoria (HU-027).
 *
 * RF: RFREC — toda recepción referencia su orden de pedido.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recepciones', function (Blueprint $table) {
            $table->id();

            // Orden de pedido que origina esta recepción (obligatorio — RFREC)
            $table->foreignId('orden_pedido_id')
                ->constrained('ordenes_pedido')
                ->comment('Orden de pedido a la que corresponde esta recepción');

            // Usuario que registró físicamente la entrada de materiales
            $table->foreignId('user_id')
                ->nullable()
                ->nullOnDelete()
                ->constrained('users')
                ->comment('Usuario que registró la recepción en el sistema');

            // Notas del momento de recepción (estado del embalaje, discrepancias, etc.)
            $table->string('observaciones', 500)->nullable()
                ->comment('Observaciones al momento de recibir: estado del embalaje, discrepancias, etc.');

            // Tabla inmutable — solo created_at, sin updated_at (HU-027)
            $table->timestamp('created_at')->useCurrent()
                ->comment('Fecha y hora exacta del registro de la recepción');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recepciones');
    }
};
