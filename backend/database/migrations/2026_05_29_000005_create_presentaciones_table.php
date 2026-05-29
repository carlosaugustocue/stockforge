<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: presentaciones
 *
 * Presentaciones de empaque de los productos terminados.
 * Un producto puede tener múltiples presentaciones (ej: caja x6, caja x12, unidad).
 * Cada presentación define cuántas unidades del producto contiene.
 *
 * HU-007 — Gestión de presentaciones de empaque.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presentaciones', function (Blueprint $table) {
            $table->id();

            // Producto terminado al que pertenece esta presentación
            $table->foreignId('producto_terminado_id')
                ->constrained('productos_terminados')
                ->cascadeOnDelete()
                ->comment('Producto terminado al que pertenece esta presentación');

            // Nombre de la presentación — ej: "Caja x12", "Unidad", "Media docena"
            $table->string('nombre', 100)
                ->comment('Nombre de la presentación: Caja x12, Unidad, Media docena…');

            // Cantidad de unidades del producto por presentación
            $table->decimal('unidades_por_presentacion', 10, 3)
                ->comment('Número de unidades del producto que contiene esta presentación');

            // Estado activo — eliminación lógica
            $table->boolean('activa')->default(true)
                ->comment('Indica si la presentación está activa');

            $table->timestamps();

            // Un producto no puede tener dos presentaciones con el mismo nombre
            $table->unique(['producto_terminado_id', 'nombre'], 'uq_presentacion_por_producto');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presentaciones');
    }
};
