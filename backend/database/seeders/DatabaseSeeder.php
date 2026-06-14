<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * El orden de ejecución es crítico:
     * 1. RoleSeeder primero — crea los roles que necesitan los usuarios y permisos
     * 2. PermissionSeeder — crea los permisos y los asigna a los roles
     * 3. UserSeeder — asigna role_id a cada usuario
     * 4. Seeders de catálogo (sin dependencias entre sí)
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            PermissionSeeder::class,
            UserSeeder::class,
            UnidadMedidaSeeder::class,
            BodegaSeeder::class,
            MateriaPrimaSeeder::class,
            ProveedorSeeder::class,
            ProductoTerminadoSeeder::class,
            DemoDataSeeder::class,
        ]);
    }
}
