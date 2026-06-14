<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla: proveedores
 *
 * Catálogo de proveedores que suministran materias primas.
 * Cada proveedor puede estar asociado a una o más materias primas
 * a través de la tabla pivot proveedor_materia_prima.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proveedores', function (Blueprint $table) {
            $table->id();

            $table->string('nombre', 255)
                ->comment('Razón social o nombre del proveedor');

            $table->string('contacto_nombre', 150)->nullable()
                ->comment('Nombre de la persona de contacto en el proveedor');

            $table->string('telefono', 30)->nullable()
                ->comment('Teléfono de contacto del proveedor');

            $table->string('email', 150)->nullable()
                ->comment('Correo electrónico del proveedor');

            $table->boolean('activo')->default(true)
                ->comment('Indica si el proveedor está activo para nuevas órdenes');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proveedores');
    }
};
