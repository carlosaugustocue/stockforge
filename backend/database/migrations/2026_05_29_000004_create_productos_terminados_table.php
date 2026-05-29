<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: productos_terminados
 *
 * Catálogo maestro de productos terminados del centro de distribución.
 * Un producto terminado se fabrica consumiendo materias primas (relaciones_mp_pt).
 * El precio de venta se cifra en reposo (RNF-SEC-05).
 *
 * IMPORTANTE: Esta tabla NO almacena recetas ni fórmulas de producción (RNF-SEC-06).
 * Solo almacena el producto y su precio — la relación con materias primas
 * (cantidades de consumo) vive en relaciones_mp_pt.
 *
 * HU-006, HU-007 — Gestión de catálogo de productos terminados.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('productos_terminados', function (Blueprint $table) {
            $table->id();

            // Nombre único del producto terminado — ej: "Torta de chocolate"
            $table->string('nombre', 150)->unique()
                ->comment('Nombre único del producto terminado');

            // Descripción opcional del producto
            $table->text('descripcion')->nullable()
                ->comment('Descripción o notas del producto terminado');

            // Unidad de medida en que se mide el producto (unidad, caja, docena…)
            $table->foreignId('unidad_medida_id')
                ->constrained('unidades_medida')
                ->comment('Unidad de medida base del producto terminado');

            // Precio de venta cifrado en reposo (RNF-SEC-05)
            $table->text('precio_venta')->nullable()
                ->comment('Precio de venta unitario — cifrado en reposo (RNF-SEC-05)');

            // Estado activo — eliminación lógica
            $table->boolean('activo')->default(true)
                ->comment('Indica si el producto está activo en el catálogo');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('productos_terminados');
    }
};
