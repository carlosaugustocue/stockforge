<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: ordenes_produccion
 *
 * Representa la planificación y ejecución de un lote de producción.
 * Ciclo de vida: pendiente → producido → completada (o anulada).
 *
 * Etapa 1 — Crear orden (estado: pendiente):
 *   El sistema calcula los materiales requeridos y los persiste en requerimientos_materiales.
 *
 * Etapa 2 — Ejecutar producción (estado: producido):
 *   Se descuenta la MP de Bodega Principal y se crea el lote de PT en Planta de Producción.
 *   cantidad_producida puede diferir de cantidad_planificada; el consumo se ajusta a lo real.
 *
 * Etapa 3 — Trasladar PT a Ventas (estado: completada):
 *   El PT sale de Planta de Producción y queda disponible para despacho en Ventas/Despacho.
 *
 * RFPROD01-05 — Ciclo productivo completo con trazabilidad y FEFO.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ordenes_produccion', function (Blueprint $table) {
            $table->id();

            // Producto terminado que se va a fabricar
            $table->foreignId('producto_terminado_id')
                ->constrained('productos_terminados')
                ->comment('Producto terminado que se planifica fabricar en esta orden');

            // Usuario que creó la orden de producción
            $table->foreignId('user_id')
                ->nullable()
                ->nullOnDelete()
                ->constrained('users')
                ->comment('Usuario que registró la orden de producción');

            // Cantidad planificada al crear la orden
            $table->decimal('cantidad_planificada', 12, 3)
                ->comment('Cantidad de unidades de PT que se planificó producir al crear la orden');

            // Cantidad real producida — se llena al ejecutar (Etapa 2), puede diferir de la planificada
            $table->decimal('cantidad_producida', 12, 3)->nullable()
                ->comment('Cantidad real producida — puede diferir de la planificada. Null hasta ejecutar.');

            // Fecha en que se planificó la producción
            $table->date('fecha_planificada')
                ->comment('Fecha en que se planificó ejecutar la producción');

            // Estado del ciclo de vida de la orden
            $table->enum('estado', ['pendiente', 'producido', 'completada', 'anulada'])
                ->default('pendiente')
                ->comment('pendiente: planificada; producido: MP consumida y PT en planta; completada: PT en ventas; anulada');

            // Observaciones opcionales sobre el lote de producción
            $table->string('observaciones', 500)->nullable()
                ->comment('Notas sobre el lote: incidencias, variaciones de cantidad, etc.');

            $table->timestamps();

            // Índice para consultas por estado (listar pendientes, producidas, etc.)
            $table->index('estado', 'idx_op_estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordenes_produccion');
    }
};
