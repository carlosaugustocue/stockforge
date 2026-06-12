<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla de permisos del sistema (RBAC dinámico — RNFSEC-04).
 *
 * Cada fila representa un permiso atómico identificado por su slug `nombre`
 * en formato `{recurso}.{accion}` (ej. 'materias_primas.escribir').
 * Los permisos se asignan a roles vía la tabla pivot `role_permissions`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();

            // Slug único del permiso: formato '{recurso}.{accion}' — se usa como identificador en el middleware
            $table->string('nombre', 100)->unique()->comment('Slug único del permiso, ej. materias_primas.escribir');

            // Descripción legible para el frontend de administración
            $table->string('descripcion', 255)->nullable()->comment('Descripción legible del permiso para la UI');

            // Recurso y acción separados para facilitar agrupación en el frontend
            $table->string('recurso', 100)->comment('Recurso afectado, ej. materias_primas, inventario');
            $table->string('accion', 50)->comment('Acción permitida, ej. leer, escribir, gestionar');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
