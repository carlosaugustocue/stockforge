<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: relaciones_mp_pt
 *
 * Asociación entre materias primas y productos terminados.
 * Define CUÁNTA cantidad de una materia prima se consume para producir
 * UNA unidad de un producto terminado.
 *
 * ACLARACIÓN DE ALCANCE (RNF-SEC-06):
 * Esta tabla NO almacena recetas ni fórmulas paso a paso.
 * Solo registra la relación de consumo agregado (MP → PT + cantidad),
 * que el sistema necesita para descontar stock en producción (RFPROD01-05).
 *
 * HU-006 — Asociación MP ↔ PT.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('relaciones_mp_pt', function (Blueprint $table) {
            $table->id();

            // Materia prima consumida en este producto
            $table->foreignId('materia_prima_id')
                ->constrained('materias_primas')
                ->comment('Materia prima consumida al producir este producto terminado');

            // Producto terminado que consume esta materia prima
            $table->foreignId('producto_terminado_id')
                ->constrained('productos_terminados')
                ->comment('Producto terminado que consume esta materia prima');

            // Cantidad de la materia prima necesaria por unidad de producto terminado
            $table->decimal('cantidad_requerida', 10, 4)
                ->comment('Cantidad de MP necesaria para producir 1 unidad del PT');

            // Unidad de medida de la cantidad requerida (puede diferir de la MP base)
            $table->foreignId('unidad_medida_id')
                ->constrained('unidades_medida')
                ->comment('Unidad de medida de la cantidad requerida');

            $table->timestamps();

            // Una materia prima solo puede aparecer una vez por producto terminado
            $table->unique(
                ['materia_prima_id', 'producto_terminado_id'],
                'uq_mp_por_pt'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('relaciones_mp_pt');
    }
};
