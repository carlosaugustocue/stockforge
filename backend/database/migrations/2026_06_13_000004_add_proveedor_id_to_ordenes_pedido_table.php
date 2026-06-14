<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega proveedor_id FK a ordenes_pedido.
 *
 * Se mantiene el campo varchar 'proveedor' por compatibilidad retroactiva.
 * Nuevas órdenes usan proveedor_id; el nombre se copia automáticamente
 * en el servicio para que el campo 'proveedor' quede consistente.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordenes_pedido', function (Blueprint $table) {
            $table->foreignId('proveedor_id')
                ->nullable()
                ->after('proveedor')
                ->nullOnDelete()
                ->constrained('proveedores')
                ->comment('FK al catálogo de proveedores; nullable para órdenes históricas');
        });
    }

    public function down(): void
    {
        Schema::table('ordenes_pedido', function (Blueprint $table) {
            $table->dropForeign(['proveedor_id']);
            $table->dropColumn('proveedor_id');
        });
    }
};
