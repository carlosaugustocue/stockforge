<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * PermissionSeeder — Matriz inicial de permisos del sistema (RBAC dinámico).
 *
 * Crea los permisos en la tabla `permissions` y los asigna a los roles
 * correspondientes via `role_permissions`. Esta es la fuente de verdad
 * inicial; puede modificarse después desde la API (solo administrador).
 *
 * Referencia: CLAUDE.md §7.2 — Matriz de permisos.
 */
class PermissionSeeder extends Seeder
{
    /**
     * Definición de todos los permisos del sistema.
     * Formato: ['nombre' => slug, 'descripcion' => ..., 'recurso' => ..., 'accion' => ...]
     */
    private array $permisos = [
        // Catálogo — Materias primas
        ['nombre' => 'materias_primas.leer',    'descripcion' => 'Ver listado y detalle de materias primas',    'recurso' => 'materias_primas',    'accion' => 'leer'],
        ['nombre' => 'materias_primas.escribir', 'descripcion' => 'Crear, editar y desactivar materias primas', 'recurso' => 'materias_primas',    'accion' => 'escribir'],

        // Catálogo — Productos terminados
        ['nombre' => 'productos_terminados.leer',    'descripcion' => 'Ver listado y detalle de productos terminados',    'recurso' => 'productos_terminados', 'accion' => 'leer'],
        ['nombre' => 'productos_terminados.escribir', 'descripcion' => 'Crear, editar y desactivar productos terminados', 'recurso' => 'productos_terminados', 'accion' => 'escribir'],

        // Catálogo — Bodegas
        ['nombre' => 'bodegas.leer',    'descripcion' => 'Ver listado y detalle de bodegas',    'recurso' => 'bodegas', 'accion' => 'leer'],
        ['nombre' => 'bodegas.escribir', 'descripcion' => 'Crear y editar bodegas',              'recurso' => 'bodegas', 'accion' => 'escribir'],

        // Inventario
        ['nombre' => 'inventario.leer',    'descripcion' => 'Consultar stock por lote y bodega',           'recurso' => 'inventario', 'accion' => 'leer'],
        ['nombre' => 'inventario.escribir', 'descripcion' => 'Registrar ajustes y movimientos de inventario', 'recurso' => 'inventario', 'accion' => 'escribir'],

        // Producción
        ['nombre' => 'produccion.leer',    'descripcion' => 'Ver lotes de producción registrados',  'recurso' => 'produccion', 'accion' => 'leer'],
        ['nombre' => 'produccion.escribir', 'descripcion' => 'Registrar lotes de producción',        'recurso' => 'produccion', 'accion' => 'escribir'],

        // Recepciones
        ['nombre' => 'recepciones.leer',    'descripcion' => 'Ver recepciones de mercancía',   'recurso' => 'recepciones', 'accion' => 'leer'],
        ['nombre' => 'recepciones.escribir', 'descripcion' => 'Registrar recepciones de mercancía', 'recurso' => 'recepciones', 'accion' => 'escribir'],

        // Despachos
        ['nombre' => 'despachos.leer',    'descripcion' => 'Ver despachos registrados',  'recurso' => 'despachos', 'accion' => 'leer'],
        ['nombre' => 'despachos.escribir', 'descripcion' => 'Registrar y autorizar despachos', 'recurso' => 'despachos', 'accion' => 'escribir'],

        // Alertas y reportes
        ['nombre' => 'alertas.leer',   'descripcion' => 'Ver alertas activas de stock y vencimiento', 'recurso' => 'alertas',   'accion' => 'leer'],
        ['nombre' => 'reportes.leer',  'descripcion' => 'Generar y exportar reportes',                'recurso' => 'reportes',  'accion' => 'leer'],

        // Administración del sistema
        ['nombre' => 'permisos.gestionar', 'descripcion' => 'Asignar y revocar permisos a roles',  'recurso' => 'permisos',  'accion' => 'gestionar'],
        ['nombre' => 'usuarios.gestionar', 'descripcion' => 'Crear, editar y desactivar usuarios', 'recurso' => 'usuarios',  'accion' => 'gestionar'],
    ];

    /**
     * Asignación de permisos por rol.
     * Clave: constante del rol. Valor: array de slugs de permisos.
     */
    private array $asignaciones = [
        Role::ADMINISTRADOR => [
            'permisos.gestionar',
            'usuarios.gestionar',
        ],
        Role::GERENCIA => [
            'materias_primas.leer',
            'materias_primas.escribir',
            'productos_terminados.leer',
            'productos_terminados.escribir',
            'bodegas.leer',
            'bodegas.escribir',
            'inventario.leer',
            'produccion.leer',
            'recepciones.leer',
            'despachos.leer',
            'alertas.leer',
            'reportes.leer',
        ],
        Role::JEFE_PRODUCCION => [
            'materias_primas.leer',
            'productos_terminados.leer',
            'bodegas.leer',
            'inventario.leer',
            'inventario.escribir',
            'produccion.leer',
            'produccion.escribir',
            'recepciones.leer',
            'despachos.leer',
            'despachos.escribir',
            'alertas.leer',
            'reportes.leer',
        ],
        Role::ENCARGADO_INVENTARIOS => [
            'materias_primas.leer',
            'materias_primas.escribir',
            'productos_terminados.leer',
            'productos_terminados.escribir',
            'bodegas.leer',
            'bodegas.escribir',
            'inventario.leer',
            'inventario.escribir',
            'produccion.leer',
            'produccion.escribir',
            'recepciones.leer',
            'recepciones.escribir',
            'despachos.leer',
            'despachos.escribir',
            'alertas.leer',
            'reportes.leer',
        ],
    ];

    public function run(): void
    {
        // Crear permisos (idempotente — no duplica si ya existen)
        foreach ($this->permisos as $datos) {
            Permission::firstOrCreate(['nombre' => $datos['nombre']], $datos);
        }

        // Asignar permisos a roles
        foreach ($this->asignaciones as $rolNombre => $slugs) {
            $role = Role::where('nombre', $rolNombre)->first();

            if (! $role) {
                continue;
            }

            $permissionIds = Permission::whereIn('nombre', $slugs)->pluck('id');

            // sync() reemplaza las asignaciones actuales — idempotente
            $role->permissions()->sync($permissionIds);
        }
    }
}
