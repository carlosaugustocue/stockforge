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
     * 1. RoleSeeder primero — crea los roles que necesitan los usuarios
     * 2. UserSeeder segundo — asigna role_id a cada usuario
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            UserSeeder::class,
            UnidadMedidaSeeder::class,
            BodegaSeeder::class,
        ]);
    }
}
