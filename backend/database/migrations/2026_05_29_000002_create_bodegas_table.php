<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: bodegas
 *
 * Espacios físicos de almacenamiento del centro de distribución.
 * El sistema opera con tres bodegas: Bodega Principal, Planta de Producción y Área de Ventas.
 * La visibilidad del stock es global para todos los roles autorizados (HU-002).
 *
 * Tipos:
 *   principal → recepción de MP desde proveedores
 *   produccion → donde se consume la MP y se genera el PT
 *   ventas → donde llegan los PT tras producción y desde donde se despacha (RFPROD03)
 *   otro → bodegas auxiliares
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
            $table->enum('tipo', ['principal', 'produccion', 'ventas', 'otro'])
                ->default('otro')
                ->comment('Tipo de bodega: principal (recepción MP), produccion (planta), ventas (PT disponibles para despacho), otro');

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
