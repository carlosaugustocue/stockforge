<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: despachos
 *
 * Registro de salida de productos terminados hacia clientes.
 * Un despacho solo puede realizarse sobre lotes de PT ubicados en la bodega de tipo 'ventas'.
 * El despacho crea un movimiento DESPACHO_SALIDA en movimientos_inventario y reduce
 * cantidad_actual del lote de PT correspondiente.
 *
 * TABLA INMUTABLE: solo created_at, sin updated_at (HU-027).
 * La anulación de un despacho se registra como movimiento compensatorio (AJUSTE_ENTRADA).
 *
 * HU-027 — Trazabilidad completa: proveedor → MP → producción → PT → cliente.
 * RFPROD03 — El PT solo es dispatchable tras el traslado a Ventas/Despacho (Etapa 3).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('despachos', function (Blueprint $table) {
            $table->id();

            // Lote de PT despachado — debe estar en bodega de tipo 'ventas'
            $table->foreignId('lote_pt_id')
                ->constrained('lotes_producto_terminado')
                ->comment('Lote de producto terminado despachado — debe estar en bodega de tipo ventas');

            // Usuario que ejecutó el despacho
            $table->foreignId('user_id')
                ->nullable()
                ->nullOnDelete()
                ->constrained('users')
                ->comment('Usuario que registró el despacho');

            // Cantidad despachada en esta operación
            $table->decimal('cantidad', 12, 3)
                ->comment('Cantidad de unidades de PT despachadas al cliente');

            // Referencia al cliente o pedido externo (sin tabla de clientes por ahora — YAGNI)
            $table->string('referencia_cliente', 255)->nullable()
                ->comment('Nombre del cliente o número de pedido externo para trazabilidad');

            // Movimiento de inventario generado por este despacho (DESPACHO_SALIDA)
            $table->foreignId('movimiento_id')
                ->constrained('movimientos_inventario')
                ->comment('Movimiento DESPACHO_SALIDA generado en movimientos_inventario');

            // Tabla inmutable — solo created_at (HU-027)
            $table->timestamp('created_at')->useCurrent()
                ->comment('Fecha y hora exacta del despacho');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('despachos');
    }
};
