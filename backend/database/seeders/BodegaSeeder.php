<?php

namespace Database\Seeders;

use App\Models\Bodega;
use Illuminate\Database\Seeder;

/**
 * BodegaSeeder — Crea las dos bodegas operativas del sistema.
 *
 * El cliente piloto opera con dos espacios físicos:
 * - Bodega Principal: recepción de materias primas y despacho
 * - Planta de Producción: espacio donde se transforma la materia prima
 *
 * Los traslados entre estas dos bodegas son el núcleo de RFINV04.
 */
class BodegaSeeder extends Seeder
{
    public function run(): void
    {
        $bodegas = [
            [
                'nombre'      => 'Bodega Principal',
                'descripcion' => 'Almacén principal de materias primas y productos terminados. Punto de recepción y despacho.',
                'tipo'        => 'principal',
                'activa'      => true,
            ],
            [
                'nombre'      => 'Planta de Producción',
                'descripcion' => 'Espacio físico de producción. Recibe materias primas trasladadas desde la Bodega Principal.',
                'tipo'        => 'produccion',
                'activa'      => true,
            ],
        ];

        foreach ($bodegas as $bodega) {
            Bodega::firstOrCreate(['nombre' => $bodega['nombre']], $bodega);
        }
    }
}
