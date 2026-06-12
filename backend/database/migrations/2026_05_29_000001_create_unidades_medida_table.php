<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: unidades_medida
 *
 * Catálogo de unidades de medida reutilizables por materias primas
 * y productos terminados (kg, g, L, ml, unidad, caja, etc.).
 * Esta tabla es de referencia — no se elimina, solo se desactiva.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unidades_medida', function (Blueprint $table) {
            $table->id();

            // Nombre corto de la unidad — ej: "kg", "L", "unidad"
            $table->string('nombre', 50)->unique()
                ->comment('Nombre corto de la unidad: kg, g, L, ml, unidad, caja…');

            // Descripción larga — ej: "Kilogramos"
            $table->string('descripcion', 100)->nullable()
                ->comment('Descripción legible de la unidad: Kilogramos, Litros…');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unidades_medida');
    }
};
