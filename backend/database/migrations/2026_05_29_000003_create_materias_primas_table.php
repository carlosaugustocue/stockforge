<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: materias_primas
 *
 * Catálogo maestro de materias primas del centro de distribución.
 * Cada materia prima tiene una unidad de medida, punto de reorden
 * y costo unitario cifrado en reposo (RNF-SEC-05).
 *
 * HU-004, HU-005 — Gestión de catálogo de materias primas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('materias_primas', function (Blueprint $table) {
            $table->id();

            // Nombre único de la materia prima — ej: "Harina de trigo"
            $table->string('nombre', 150)->unique()
                ->comment('Nombre único de la materia prima');

            // Descripción opcional con características del producto
            $table->text('descripcion')->nullable()
                ->comment('Características, especificaciones o notas del producto');

            // Relación con la unidad de medida base (kg, L, unidad…)
            $table->foreignId('unidad_medida_id')
                ->constrained('unidades_medida')
                ->comment('Unidad de medida base para stock y consumo');

            // Costo unitario cifrado en reposo (RNF-SEC-05)
            // Se usa TEXT para almacenar el valor cifrado de Laravel
            $table->text('costo_unitario')->nullable()
                ->comment('Costo por unidad — cifrado en reposo (RNF-SEC-05)');

            // Punto de reorden — cantidad mínima antes de generar alerta (HU-019)
            $table->decimal('punto_reorden', 10, 3)->default(0)
                ->comment('Cantidad mínima en stock antes de generar alerta de reabastecimiento');

            // Estado activo — eliminación lógica para preservar histórico
            $table->boolean('activa')->default(true)
                ->comment('Indica si la materia prima está activa en el catálogo');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('materias_primas');
    }
};
