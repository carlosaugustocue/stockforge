<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla pivot rol ↔ permiso (RBAC dinámico — RNFSEC-04).
 *
 * Determina qué permisos tiene asignados cada rol.
 * La modificación de esta tabla invalida la caché de permisos del rol afectado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_permissions', function (Blueprint $table) {
            // FK al rol — si se elimina el rol, sus asignaciones de permiso desaparecen
            $table->foreignId('role_id')
                ->constrained('roles')
                ->cascadeOnDelete()
                ->comment('Rol al que se asigna el permiso');

            // FK al permiso — si se elimina el permiso, la asignación desaparece
            $table->foreignId('permission_id')
                ->constrained('permissions')
                ->cascadeOnDelete()
                ->comment('Permiso asignado al rol');

            // Clave primaria compuesta — un rol no puede tener el mismo permiso dos veces
            $table->primary(['role_id', 'permission_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
    }
};
