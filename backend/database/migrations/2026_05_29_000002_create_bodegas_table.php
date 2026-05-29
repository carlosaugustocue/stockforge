<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: bodegas
 *
 * Espacios físicos de almacenamiento del centro de distribución.
 * El sistema opera con dos bodegas: Bodega Principal y Planta de Producción.
 * La visibilidad del stock es global para todos los roles autorizados (HU-002).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bodegas', function (Blueprint $table) {
            $table->id();

            // Nombre único de la bodega — ej: "Bodega Principal"
            $table->string('nombre', 100)->unique()
                ->comment('Nombre único de la bodega: Bodega Principal, Planta de Producción…');

            // Descripción opcional del espacio físico
            $table->string('descripcion', 255)->nullable()
                ->comment('Descripción del espacio físico y su propósito');

            // Tipo de bodega — controla reglas de negocio de traslado (RFINV04)
            $table->enum('tipo', ['principal', 'produccion', 'otro'])
                ->default('otro')
                ->comment('Tipo de bodega: principal (recepción), produccion (planta), otro');

            // Estado activo — no se elimina físicamente si tiene movimientos
            $table->boolean('activa')->default(true)
                ->comment('Indica si la bodega está operativa');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bodegas');
    }
};
