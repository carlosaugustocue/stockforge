<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: lotes_materia_prima
 *
 * Cada fila representa un lote físico de una materia prima recibido en una recepción.
 * Es la unidad de trazabilidad del inventario de MP: un lote sabe exactamente
 * cuánto llegó, cuánto queda, cuándo vence y en qué bodega está.
 *
 * FEFO (First Expired, First Out — RFINV03):
 * La selección del lote a consumir en producción se basa en fecha_vencimiento ASC,
 * con fecha_ingreso como criterio de desempate (el más antiguo primero).
 * Los índices sobre estas columnas son obligatorios para eficiencia de consultas FEFO.
 *
 * RFINV02 — Trazabilidad por lote: cada movimiento referencia el lote afectado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lotes_materia_prima', function (Blueprint $table) {
            $table->id();

            // Recepción que originó este lote (trazabilidad hacia el proveedor)
            $table->foreignId('recepcion_id')
                ->constrained('recepciones')
                ->comment('Recepción que dio origen a este lote');

            // Materia prima a la que pertenece este lote
            $table->foreignId('materia_prima_id')
                ->constrained('materias_primas')
                ->comment('Materia prima contenida en este lote');

            // Bodega donde se encuentra físicamente el lote
            $table->foreignId('bodega_id')
                ->constrained('bodegas')
                ->comment('Bodega donde está almacenado este lote actualmente');

            // Cantidad recibida originalmente — no cambia nunca (referencia histórica)
            $table->decimal('cantidad_inicial', 12, 3)
                ->comment('Cantidad recibida en la recepción — valor histórico inmutable');

            // Cantidad disponible actualmente — se actualiza con cada consumo o traslado
            $table->decimal('cantidad_actual', 12, 3)
                ->comment('Cantidad disponible en este momento — se reduce con consumos y traslados');

            // Fecha de vencimiento — columna clave para FEFO (RFINV03)
            $table->date('fecha_vencimiento')->nullable()
                ->comment('Fecha de vencimiento del lote — null si la MP no vence (ej. sal). Clave para FEFO');

            // Fecha de ingreso — desempate FEFO cuando dos lotes tienen la misma fecha de vencimiento
            $table->timestamp('fecha_ingreso')->useCurrent()
                ->comment('Fecha y hora de ingreso al sistema — desempate FEFO ante misma fecha_vencimiento');

            $table->timestamps();

            // Índices para consultas FEFO: buscar por MP + bodega ordenando por vencimiento e ingreso
            $table->index(['materia_prima_id', 'bodega_id', 'fecha_vencimiento', 'fecha_ingreso'], 'idx_fefo_mp');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lotes_materia_prima');
    }
};
