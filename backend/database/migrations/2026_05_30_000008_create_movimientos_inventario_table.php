<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: movimientos_inventario
 *
 * Registro append-only de TODA operación que modifica el stock.
 * Es el libro contable del inventario: cada entrada es permanente e inmutable.
 *
 * TABLA INMUTABLE: solo created_at, sin updated_at (HU-027).
 * Las correcciones NO modifican filas existentes — se insertan movimientos compensatorios
 * que referencian el movimiento original via movimiento_origen_id.
 *
 * Tipos de movimiento:
 *   RECEPCION_ENTRADA   → MP ingresa al sistema desde un proveedor (Etapa recepción)
 *   CONSUMO_MP          → MP consumida al ejecutar producción (Etapa 2)
 *   PRODUCCION_ENTRADA  → PT creado al ejecutar producción (Etapa 2)
 *   TRASLADO_SALIDA     → ítem sale de una bodega (traslado PT Etapa 3, o traslado MP independiente)
 *   TRASLADO_ENTRADA    → ítem entra a una bodega (par del TRASLADO_SALIDA)
 *   DESPACHO_SALIDA     → PT despachado a cliente (Etapa 4)
 *   AJUSTE_ENTRADA      → ajuste manual positivo de inventario
 *   AJUSTE_SALIDA       → ajuste manual negativo de inventario
 *
 * La dirección del movimiento (entrada/salida) se deduce del tipo; cantidad es siempre positivo.
 *
 * RFINV02 — Trazabilidad por lote: proveedor → recepción → lote → consumo → PT → despacho → cliente.
 * RFINV04 — Atomicidad: los movimientos de traslado (SALIDA+ENTRADA) se insertan en la misma transacción.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimientos_inventario', function (Blueprint $table) {
            $table->id();

            // Tipo de operación — determina la dirección e interpretación del movimiento
            $table->enum('tipo', [
                'RECEPCION_ENTRADA',
                'CONSUMO_MP',
                'PRODUCCION_ENTRADA',
                'TRASLADO_SALIDA',
                'TRASLADO_ENTRADA',
                'DESPACHO_SALIDA',
                'AJUSTE_ENTRADA',
                'AJUSTE_SALIDA',
            ])->comment('Tipo de operación que originó el movimiento');

            // Tipo de entidad afectada — relación polimórfica manual (MP o PT)
            $table->enum('entidad_tipo', ['materia_prima', 'producto_terminado'])
                ->comment('Tipo de ítem afectado: materia_prima (lote_mp) o producto_terminado (lote_pt)');

            // ID del lote afectado (lotes_materia_prima.id o lotes_producto_terminado.id)
            $table->unsignedBigInteger('entidad_id')
                ->comment('ID del lote afectado — lote de MP o de PT según entidad_tipo');

            // Bodega donde ocurrió el movimiento
            $table->foreignId('bodega_id')
                ->constrained('bodegas')
                ->comment('Bodega donde ocurrió físicamente el movimiento');

            // Cantidad siempre positiva — la dirección la indica el tipo
            $table->decimal('cantidad', 12, 3)
                ->comment('Cantidad involucrada en el movimiento — siempre positivo; dirección según tipo');

            // Contexto: orden de producción asociada (nullable para movimientos de recepción/ajuste)
            $table->foreignId('orden_produccion_id')
                ->nullable()
                ->nullOnDelete()
                ->constrained('ordenes_produccion')
                ->comment('Orden de producción asociada — aplica para CONSUMO_MP, PRODUCCION_ENTRADA y traslados de PT');

            // Contexto: recepción asociada (solo aplica para RECEPCION_ENTRADA)
            $table->foreignId('recepcion_id')
                ->nullable()
                ->nullOnDelete()
                ->constrained('recepciones')
                ->comment('Recepción asociada — solo aplica para movimientos de tipo RECEPCION_ENTRADA');

            // Referencia al movimiento original (solo en movimientos compensatorios — HU-027)
            $table->foreignId('movimiento_origen_id')
                ->nullable()
                ->nullOnDelete()
                ->constrained('movimientos_inventario')
                ->comment('Movimiento original que este movimiento compensa — null si no es compensatorio (HU-027)');

            // Usuario que ejecutó la operación
            $table->foreignId('user_id')
                ->nullable()
                ->nullOnDelete()
                ->constrained('users')
                ->comment('Usuario que ejecutó la operación');

            // Notas opcionales (especialmente útil en ajustes manuales)
            $table->string('observaciones', 500)->nullable()
                ->comment('Motivo del ajuste, incidencia, o nota sobre el movimiento');

            // Tabla inmutable — solo created_at (HU-027)
            $table->timestamp('created_at')->useCurrent()
                ->comment('Fecha y hora exacta del movimiento — inmutable');

            // Índices para consultas de trazabilidad y reporte por lote
            $table->index(['entidad_tipo', 'entidad_id'], 'idx_mov_entidad');
            $table->index('tipo', 'idx_mov_tipo');
            $table->index('orden_produccion_id', 'idx_mov_orden');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_inventario');
    }
};
