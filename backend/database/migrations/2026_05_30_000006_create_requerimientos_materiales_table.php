<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: requerimientos_materiales
 *
 * Snapshot inmutable de las materias primas calculadas al crear una orden de producción.
 * Responde a la pregunta: "¿qué materiales se necesitaban cuando se planificó este lote?"
 *
 * El cálculo es: cantidad_requerida = relacion_mp_pt.cantidad_requerida × cantidad_planificada
 * El lote sugerido es el que FEFO indicó al momento de planificar (puede no ser el que
 * finalmente se consume si el stock cambia antes de ejecutar la producción).
 *
 * TABLA INMUTABLE: solo created_at, sin updated_at.
 * Estos registros son el "documento de planificación" de la orden — no se modifican.
 *
 * RFPROD01 — Requerimiento de materiales para trazabilidad de planificación vs. ejecución.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('requerimientos_materiales', function (Blueprint $table) {
            $table->id();

            // Orden de producción a la que pertenece este requerimiento
            $table->foreignId('orden_produccion_id')
                ->constrained('ordenes_produccion')
                ->cascadeOnDelete()
                ->comment('Orden de producción que generó este requerimiento');

            // Materia prima requerida
            $table->foreignId('materia_prima_id')
                ->constrained('materias_primas')
                ->comment('Materia prima requerida para la producción planificada');

            // Cantidad calculada al planificar: relacion.cantidad_requerida × cantidad_planificada
            $table->decimal('cantidad_requerida', 12, 3)
                ->comment('Cantidad calculada al planificar: cantidad_por_unidad × cantidad_planificada');

            // Lote sugerido por FEFO al momento de planificar (referencia informativa)
            $table->foreignId('lote_sugerido_id')
                ->nullable()
                ->nullOnDelete()
                ->constrained('lotes_materia_prima')
                ->comment('Lote sugerido por FEFO al planificar — puede diferir del lote realmente consumido');

            // Tabla inmutable — solo created_at (HU-027)
            $table->timestamp('created_at')->useCurrent()
                ->comment('Fecha y hora en que se generó el requerimiento');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requerimientos_materiales');
    }
};
