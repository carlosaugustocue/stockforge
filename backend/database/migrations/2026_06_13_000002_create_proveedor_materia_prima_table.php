<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla pivot: proveedor_materia_prima
 *
 * Registra qué materias primas suministra cada proveedor.
 * Permite sugerir el proveedor correcto al crear una orden de pedido
 * desde una alerta de reorden (UX intuitivo).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proveedor_materia_prima', function (Blueprint $table) {
            $table->foreignId('proveedor_id')
                ->constrained('proveedores')
                ->cascadeOnDelete()
                ->comment('Proveedor que suministra la MP');

            $table->foreignId('materia_prima_id')
                ->constrained('materias_primas')
                ->cascadeOnDelete()
                ->comment('Materia prima que suministra el proveedor');

            $table->primary(['proveedor_id', 'materia_prima_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proveedor_materia_prima');
    }
};
