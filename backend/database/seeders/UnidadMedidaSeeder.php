<?php

namespace Database\Seeders;

use App\Models\UnidadMedida;
use Illuminate\Database\Seeder;

class UnidadMedidaSeeder extends Seeder
{
    public function run(): void
    {
        $unidades = [
            ['nombre' => 'kg',      'descripcion' => 'Kilogramos'],
            ['nombre' => 'g',       'descripcion' => 'Gramos'],
            ['nombre' => 'L',       'descripcion' => 'Litros'],
            ['nombre' => 'ml',      'descripcion' => 'Mililitros'],
            ['nombre' => 'unidad',  'descripcion' => 'Unidad'],
            ['nombre' => 'caja',    'descripcion' => 'Caja'],
            ['nombre' => 'docena',  'descripcion' => 'Docena'],
            ['nombre' => 'paquete', 'descripcion' => 'Paquete'],
        ];

        foreach ($unidades as $unidad) {
            UnidadMedida::firstOrCreate(['nombre' => $unidad['nombre']], $unidad);
        }
    }
}
