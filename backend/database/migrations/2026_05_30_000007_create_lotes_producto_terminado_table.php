<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: lotes_producto_terminado
 *
 * Cada fila representa un lote físico de producto terminado generado por una orden de producción.
 * Un lote nace en Planta de Producción (Etapa 2) y se traslada a Ventas/Despacho (Etapa 3).
 * Solo cuando bodega_id apunta a la bodega de tipo 'ventas' el lote está disponible para despacho.
 *
 * La bodega_id refleja la ubicación ACTUAL del lote. Al hacer el traslado (Etapa 3),
 * se actualiza bodega_id de 'produccion' → 'ventas'.
 *
 * RFPROD03 — Ingreso de producto terminado al inventario.
 * HU-027 — Trazabilidad: cada despacho referencia el lote de PT que consume.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lotes_producto_terminado', function (Blueprint $table) {
            $table->id();

            // Orden de producción que generó este lote
            $table->foreignId('orden_produccion_id')
                ->constrained('ordenes_produccion')
                ->comment('Orden de producción que originó este lote de producto terminado');

            // Producto terminado contenido en el lote
            $table->foreignId('producto_terminado_id')
                ->constrained('productos_terminados')
                ->comment('Producto terminado que contiene este lote');

            // Bodega actual del lote — cambia al trasladar de Planta → Ventas (Etapa 3)
            $table->foreignId('bodega_id')
                ->constrained('bodegas')
                ->comment('Bodega donde está el lote actualmente: produccion (Etapa 2) o ventas (Etapa 3)');

            // Cantidad producida — valor histórico, no cambia
            $table->decimal('cantidad_inicial', 12, 3)
                ->comment('Cantidad producida originalmente — valor histórico inmutable');

            // Cantidad disponible actualmente — se reduce con cada despacho
            $table->decimal('cantidad_actual', 12, 3)
                ->comment('Cantidad disponible actualmente — se reduce con despachos');

            // Fecha en que se fabricó el lote
            $table->date('fecha_produccion')
                ->comment('Fecha en que se ejecutó la producción de este lote');

            $table->timestamps();

            // Índice para consultas de stock disponible por producto y bodega
            $table->index(['producto_terminado_id', 'bodega_id'], 'idx_lpt_producto_bodega');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lotes_producto_terminado');
    }
};
