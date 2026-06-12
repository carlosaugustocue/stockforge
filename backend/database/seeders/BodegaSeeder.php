<?php

namespace Database\Seeders;

use App\Models\Bodega;
use Illuminate\Database\Seeder;

/**
 * BodegaSeeder — Crea las tres bodegas operativas del sistema.
 *
 * El cliente piloto opera con tres espacios físicos:
 * - Bodega Principal:     recepción de materias primas desde proveedores.
 * - Planta de Producción: donde se transforma la MP en productos terminados.
 * - Área de Ventas:       donde llegan los PT tras producción y desde donde se despacha.
 *
 * Flujo: Bodega Principal → [producción consume MP] → PT en Planta
 *        → [traslado Etapa 3] → Área de Ventas → [despacho] → cliente.
 * Los PT solo están disponibles para despacho cuando están en bodega tipo 'ventas' (RFPROD03).
 */
class BodegaSeeder extends Seeder
{
    public function run(): void
    {
        $bodegas = [
            [
                'nombre'      => 'Bodega Principal',
                'descripcion' => 'Almacén principal de materias primas. Punto de recepción de mercancía de proveedores.',
                'tipo'        => 'principal',
                'activa'      => true,
            ],
            [
                'nombre'      => 'Planta de Producción',
                'descripcion' => 'Espacio físico de producción. Aquí se consumen las materias primas y se generan los productos terminados.',
                'tipo'        => 'produccion',
                'activa'      => true,
            ],
            [
                'nombre'      => 'Área de Ventas',
                'descripcion' => 'Zona de almacenamiento de productos terminados listos para despacho. Los PT llegan aquí tras el traslado desde Planta.',
                'tipo'        => 'ventas',
                'activa'      => true,
            ],
        ];

        foreach ($bodegas as $bodega) {
            Bodega::firstOrCreate(['nombre' => $bodega['nombre']], $bodega);
        }
    }
}
