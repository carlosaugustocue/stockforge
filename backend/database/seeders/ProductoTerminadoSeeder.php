<?php

namespace Database\Seeders;

use App\Models\MateriaPrima;
use App\Models\ProductoTerminado;
use App\Models\RelacionMpPt;
use App\Models\UnidadMedida;
use Illuminate\Database\Seeder;

/**
 * ProductoTerminadoSeeder — Productos reales de Daluzed Pastelería con sus recetas de consumo.
 * Ingredientes y cantidades (en gramos/ml) extraídos de: COSTEOS TOTALES DE PRODUCCION.xlsx.
 * NO se almacenan fórmulas paso a paso (RNF-SEC-06).
 */
class ProductoTerminadoSeeder extends Seeder
{
    private int $g;
    private int $unidad;

    public function run(): void
    {
        $this->g      = UnidadMedida::where('nombre', 'g')->first()->id;
        $this->unidad = UnidadMedida::where('nombre', 'unidad')->first()->id;

        $this->crearProducto('Palitos de Queso', $this->unidad, [
            ['Harina de Trigo',      6000],
            ['Azúcar',               1200],
            ['Margarina Astra',      1875],
            ['Fécula de Maíz',       1500],
            ['Queso Costeño',        1500],
            ['Huevos',                900],
            ['Polvo de Horneo',       225],
            ['Sal',                   100],
            ['Esencia Mantequilla',    80],
            ['Esencia Queso',          40],
            ['Color Amarillo Huevo',   15],
        ]);

        $this->crearProducto('Torta de Chía con Ganache', $this->unidad, [
            ['Huevos',                2600],
            ['Harina de Trigo',       2500],
            ['Margarina Astra',       2000],
            ['Azúcar',                2000],
            ['Semillas de Chía',       220],
            ['Polvo de Horneo',         30],
            ['Sal',                     20],
            ['Esencia de Vainilla',     20],
            ['Ácido Sórbico',            9],
            ['Propionato de Calcio',   7.5],
            ['Cobertura de Chocolate', 500],
        ]);

        $this->crearProducto('Torta de Mora', $this->unidad, [
            ['Huevos',                2600],
            ['Harina de Trigo',       2500],
            ['Margarina Astra',       2000],
            ['Azúcar',                2000],
            ['Polvo de Horneo',         30],
            ['Sal',                     20],
            ['Esencia de Vainilla',     20],
            ['Ácido Sórbico',            9],
            ['Propionato de Calcio',   7.5],
            ['Pulpa de Mora',          800],
        ]);

        $this->crearProducto('Torta de Arequipe', $this->unidad, [
            ['Huevos',                2600],
            ['Harina de Trigo',       2500],
            ['Margarina Astra',       2000],
            ['Azúcar',                2000],
            ['Polvo de Horneo',         30],
            ['Sal',                     20],
            ['Esencia de Vainilla',     20],
            ['Ácido Sórbico',            9],
            ['Propionato de Calcio',   7.5],
            ['Arequipe',             1000],
        ]);

        $this->crearProducto('Torta de Chocolate', $this->unidad, [
            ['Huevos',                1100],
            ['Harina de Trigo',       2000],
            ['Leche Líquida',         1660],
            ['Azúcar',                2000],
            ['Aceite',                1600],
            ['Sal',                      8],
            ['Esencia de Vainilla',     40],
            ['Color Caramelo',          40],
            ['Ácido Sórbico',            8],
            ['Propionato de Calcio',     6],
            ['Bicarbonato de Sodio',    60],
            ['Cocoa',                  360],
            ['Vinagre',                 60],
        ]);

        $this->crearProducto('Torta de Naranja', $this->unidad, [
            ['Huevos',                2600],
            ['Harina de Trigo',       2500],
            ['Margarina Astra',       2000],
            ['Azúcar',                2000],
            ['Polvo de Horneo',         30],
            ['Sal',                     20],
            ['Esencia de Naranja',      40],
            ['Ácido Sórbico',            9],
            ['Propionato de Calcio',   7.5],
        ]);

        $this->crearProducto('Torta Envinada', $this->unidad, [
            ['Huevos',                2400],
            ['Harina de Trigo',       2500],
            ['Margarina Astra',       2000],
            ['Azúcar',                2000],
            ['Polvo de Horneo',         30],
            ['Sal',                     20],
            ['Esencia Ron con Pasas',   12],
            ['Ácido Sórbico',           10],
            ['Propionato de Calcio',   7.5],
            ['Uvas Pasas',             500],
            ['Nueces Trituradas',      220],
            ['Color Caramelo',         225],
        ]);

        $this->crearProducto('Torta de Zanahoria', $this->unidad, [
            ['Huevos',                1300],
            ['Harina de Trigo',       1800],
            ['Zanahoria',             2000],
            ['Azúcar',                1700],
            ['Aceite',                 900],
            ['Nueces Trituradas',      200],
            ['Sal',                     16],
            ['Esencia de Vainilla',     20],
            ['Ácido Sórbico',            8],
            ['Propionato de Calcio',     5],
            ['Canela en Polvo',          5],
            ['Bicarbonato de Sodio',    60],
        ]);

        $this->crearProducto('Torta Genovesa Tradicional', $this->unidad, [
            ['Huevos',                2400],
            ['Premezcla Bizcocho Rich', 2100],
            ['Harina de Trigo',        500],
            ['Azúcar',                 150],
            ['Polvo de Horneo',         25],
            ['Sal',                     20],
            ['Esencia de Vainilla',     20],
            ['Ácido Sórbico',            6],
            ['Propionato de Calcio',     7],
        ]);

        $this->crearProducto('Torta de Moca', $this->unidad, [
            ['Huevos',                1800],
            ['Harina de Trigo',       1625],
            ['Margarina Astra',       1275],
            ['Azúcar',                1130],
            ['Premezcla Brownie',     1000],
            ['Sal',                     15],
            ['Esencia de Vainilla',      5],
            ['Color Caramelo',          30],
            ['Ácido Sórbico',            7],
            ['Propionato de Calcio',     7],
            ['Bicarbonato de Sodio',    15],
            ['Café Molido',            200],
        ]);

        $this->crearProducto('Torta Red Velvet', $this->unidad, [
            ['Huevos',                 300],
            ['Harina de Trigo',        500],
            ['Leche Líquida',          400],
            ['Azúcar',                 600],
            ['Aceite',                 325],
            ['Color Rojo Escarlata',     8],
            ['Ácido Sórbico',            2],
            ['Propionato de Calcio',     2],
            ['Bicarbonato de Sodio',     8],
            ['Cocoa',                   75],
            ['Vinagre',                 20],
        ]);

        $this->crearProducto('Torta Cero', $this->unidad, [
            ['Huevos',                 184],
            ['Harina de Trigo',        130],
            ['Aceite',                 130],
            ['Leche Líquida',          123],
            ['Salvado de Trigo',        56],
            ['Stevia',                  20],
            ['Nueces Trituradas',       14],
            ['Bicarbonato de Sodio',     4],
            ['Canela en Polvo',          1],
            ['Ácido Sórbico',            1],
            ['Propionato de Calcio',     1],
        ]);

        $this->crearProducto('Torta de Almojábana', $this->unidad, [
            ['Queso Crema Colanta',   3000],
            ['Harina Farallones',      360],
            ['Azúcar',                 150],
            ['Leche en Polvo',         180],
            ['Fécula de Maíz',         150],
            ['Polvo de Horneo',         30],
            ['Propionato de Calcio',     1],
        ]);

        $this->crearProducto('Galleta de Vainilla', $this->unidad, [
            ['Harina de Trigo',       1000],
            ['Azúcar',                 600],
            ['Margarina Astra',        500],
            ['Esencia de Vainilla',     10],
        ]);

        $this->crearProducto('Galleta de Naranja', $this->unidad, [
            ['Harina de Trigo',       1000],
            ['Azúcar',                 600],
            ['Margarina Astra',        500],
            ['Esencia de Naranja',      10],
            ['Color Amarillo Huevo',     2],
        ]);

        $this->crearProducto('Galleta de Café', $this->unidad, [
            ['Harina de Trigo',       1000],
            ['Azúcar',                 600],
            ['Margarina Astra',        500],
            ['Café Molido',             10],
            ['Color Caramelo',           2],
        ]);

        $this->crearProducto('Galleta de Leche', $this->unidad, [
            ['Harina de Trigo',       1000],
            ['Azúcar',                 600],
            ['Margarina Astra',        500],
            ['Leche en Polvo',          50],
            ['Esencia de Vainilla',      5],
        ]);
    }

    private function crearProducto(string $nombre, int $unidadId, array $ingredientes): void
    {
        $pt = ProductoTerminado::firstOrCreate(
            ['nombre' => $nombre],
            ['unidad_medida_id' => $unidadId, 'activo' => true]
        );

        foreach ($ingredientes as [$mpNombre, $cantidad]) {
            $mp = MateriaPrima::where('nombre', $mpNombre)->first();
            if (! $mp) {
                $this->command?->warn("MP no encontrada: {$mpNombre}");
                continue;
            }
            RelacionMpPt::firstOrCreate(
                ['producto_terminado_id' => $pt->id, 'materia_prima_id' => $mp->id],
                ['cantidad_requerida' => $cantidad, 'unidad_medida_id' => $this->g]
            );
        }
    }
}
