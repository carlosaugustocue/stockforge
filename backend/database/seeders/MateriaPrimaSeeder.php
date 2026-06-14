<?php

namespace Database\Seeders;

use App\Models\MateriaPrima;
use App\Models\UnidadMedida;
use Illuminate\Database\Seeder;

/**
 * MateriaPrimaSeeder — Materias primas reales de Daluzed Pastelería.
 * Datos extraídos de: COSTEOS TOTALES DE PRODUCCION.xlsx / hoja MATERIAS PRIMAS.
 */
class MateriaPrimaSeeder extends Seeder
{
    public function run(): void
    {
        $g      = UnidadMedida::where('nombre', 'g')->first()->id;
        $ml     = UnidadMedida::where('nombre', 'ml')->first()->id;
        $unidad = UnidadMedida::where('nombre', 'unidad')->first()->id;

        $materias = [
            // ── Ingredientes base ──────────────────────────────────────────────
            ['nombre' => 'Harina de Trigo',          'unidad_medida_id' => $g,      'punto_reorden' => 25000],
            ['nombre' => 'Harina Farallones',         'unidad_medida_id' => $g,      'punto_reorden' => 5000],
            ['nombre' => 'Azúcar',                    'unidad_medida_id' => $g,      'punto_reorden' => 20000],
            ['nombre' => 'Azúcar Pulverizada',        'unidad_medida_id' => $g,      'punto_reorden' => 3000],
            ['nombre' => 'Margarina Astra',           'unidad_medida_id' => $g,      'punto_reorden' => 10000],
            ['nombre' => 'Margarina Tulipán',         'unidad_medida_id' => $g,      'punto_reorden' => 5000],
            ['nombre' => 'Fécula de Maíz',            'unidad_medida_id' => $g,      'punto_reorden' => 10000],
            ['nombre' => 'Sal',                       'unidad_medida_id' => $g,      'punto_reorden' => 2000],
            ['nombre' => 'Huevos',                    'unidad_medida_id' => $g,      'punto_reorden' => 5000],
            ['nombre' => 'Leche Líquida',             'unidad_medida_id' => $ml,     'punto_reorden' => 5000],
            ['nombre' => 'Leche en Polvo',            'unidad_medida_id' => $g,      'punto_reorden' => 2000],
            ['nombre' => 'Leche Condensada',          'unidad_medida_id' => $g,      'punto_reorden' => 2000],
            ['nombre' => 'Aceite',                    'unidad_medida_id' => $ml,     'punto_reorden' => 5000],
            ['nombre' => 'Aceite Sólido Desengrasante','unidad_medida_id' => $g,     'punto_reorden' => 3000],
            ['nombre' => 'Vinagre',                   'unidad_medida_id' => $ml,     'punto_reorden' => 1000],
            ['nombre' => 'Crema de Leche',            'unidad_medida_id' => $g,      'punto_reorden' => 3000],
            ['nombre' => 'Crema Chantilly',           'unidad_medida_id' => $g,      'punto_reorden' => 2000],

            // ── Quesos ─────────────────────────────────────────────────────────
            ['nombre' => 'Queso Costeño',             'unidad_medida_id' => $g,      'punto_reorden' => 5000],
            ['nombre' => 'Queso Costeño Molido',      'unidad_medida_id' => $g,      'punto_reorden' => 2000],
            ['nombre' => 'Queso Crema',               'unidad_medida_id' => $g,      'punto_reorden' => 2000],
            ['nombre' => 'Queso Crema Colanta',       'unidad_medida_id' => $g,      'punto_reorden' => 2000],
            ['nombre' => 'Queso Criollo',             'unidad_medida_id' => $g,      'punto_reorden' => 2000],

            // ── Levaduras, conservantes y aditivos ────────────────────────────
            ['nombre' => 'Polvo de Horneo',           'unidad_medida_id' => $g,      'punto_reorden' => 1000],
            ['nombre' => 'Bicarbonato de Sodio',      'unidad_medida_id' => $g,      'punto_reorden' => 500],
            ['nombre' => 'Ácido Sórbico',             'unidad_medida_id' => $g,      'punto_reorden' => 200],
            ['nombre' => 'Propionato de Calcio',      'unidad_medida_id' => $g,      'punto_reorden' => 200],
            ['nombre' => 'CMC',                       'unidad_medida_id' => $g,      'punto_reorden' => 300],
            ['nombre' => 'Dióxido de Titanio',        'unidad_medida_id' => $g,      'punto_reorden' => 200],

            // ── Cacao y chocolate ─────────────────────────────────────────────
            ['nombre' => 'Cocoa',                     'unidad_medida_id' => $g,      'punto_reorden' => 5000],
            ['nombre' => 'Cobertura de Chocolate',    'unidad_medida_id' => $g,      'punto_reorden' => 5000],
            ['nombre' => 'Cobertura Blanca',          'unidad_medida_id' => $g,      'punto_reorden' => 3000],
            ['nombre' => 'Chips de Chocolate Corona', 'unidad_medida_id' => $g,      'punto_reorden' => 500],
            ['nombre' => 'Chips de Chocolate Blanco', 'unidad_medida_id' => $g,      'punto_reorden' => 500],
            ['nombre' => 'Chococubierta Nacional',    'unidad_medida_id' => $g,      'punto_reorden' => 2000],

            // ── Frutas, rellenos y complementos ──────────────────────────────
            ['nombre' => 'Pulpa de Mora',             'unidad_medida_id' => $g,      'punto_reorden' => 3000],
            ['nombre' => 'Pulpa de Maracuyá',         'unidad_medida_id' => $g,      'punto_reorden' => 3000],
            ['nombre' => 'Arequipe',                  'unidad_medida_id' => $g,      'punto_reorden' => 3000],
            ['nombre' => 'Dulce de Leche',            'unidad_medida_id' => $g,      'punto_reorden' => 2000],
            ['nombre' => 'Relleno de Mora Frutty',    'unidad_medida_id' => $g,      'punto_reorden' => 2000],
            ['nombre' => 'Relleno de Fresa Frutty',   'unidad_medida_id' => $g,      'punto_reorden' => 2000],
            ['nombre' => 'Relleno de Maracuyá Frutty','unidad_medida_id' => $g,      'punto_reorden' => 2000],
            ['nombre' => 'Fresa',                     'unidad_medida_id' => $g,      'punto_reorden' => 1000],
            ['nombre' => 'Zanahoria',                 'unidad_medida_id' => $g,      'punto_reorden' => 2000],
            ['nombre' => 'Uvas Pasas',                'unidad_medida_id' => $g,      'punto_reorden' => 500],
            ['nombre' => 'Nueces Trituradas',         'unidad_medida_id' => $g,      'punto_reorden' => 500],
            ['nombre' => 'Maní Triturado',            'unidad_medida_id' => $g,      'punto_reorden' => 500],
            ['nombre' => 'Semillas de Chía',          'unidad_medida_id' => $g,      'punto_reorden' => 5000],
            ['nombre' => 'Cernido de Guayaba',        'unidad_medida_id' => $g,      'punto_reorden' => 1000],
            ['nombre' => 'Salvado de Trigo',          'unidad_medida_id' => $g,      'punto_reorden' => 500],
            ['nombre' => 'Stevia',                    'unidad_medida_id' => $g,      'punto_reorden' => 200],
            ['nombre' => 'Canela en Polvo',           'unidad_medida_id' => $g,      'punto_reorden' => 200],
            ['nombre' => 'Glucosa',                   'unidad_medida_id' => $g,      'punto_reorden' => 1000],
            ['nombre' => 'Glicerina',                 'unidad_medida_id' => $g,      'punto_reorden' => 1000],

            // ── Premezclas ────────────────────────────────────────────────────
            ['nombre' => 'Premezcla Bizcocho Rich',   'unidad_medida_id' => $g,      'punto_reorden' => 5000],
            ['nombre' => 'Premezcla Bizcochuelo',     'unidad_medida_id' => $g,      'punto_reorden' => 5000],
            ['nombre' => 'Premezcla Brownie',         'unidad_medida_id' => $g,      'punto_reorden' => 5000],

            // ── Esencias y colorantes ─────────────────────────────────────────
            ['nombre' => 'Esencia de Vainilla',       'unidad_medida_id' => $ml,     'punto_reorden' => 2000],
            ['nombre' => 'Esencia de Naranja',        'unidad_medida_id' => $ml,     'punto_reorden' => 200],
            ['nombre' => 'Esencia Mantequilla',       'unidad_medida_id' => $ml,     'punto_reorden' => 500],
            ['nombre' => 'Esencia Queso',             'unidad_medida_id' => $ml,     'punto_reorden' => 200],
            ['nombre' => 'Esencia Arequipe',          'unidad_medida_id' => $ml,     'punto_reorden' => 500],
            ['nombre' => 'Esencia Ron con Pasas',     'unidad_medida_id' => $ml,     'punto_reorden' => 200],
            ['nombre' => 'Esencia Flavor Cake',       'unidad_medida_id' => $ml,     'punto_reorden' => 500],
            ['nombre' => 'Color Amarillo Huevo',      'unidad_medida_id' => $ml,     'punto_reorden' => 100],
            ['nombre' => 'Color Caramelo',            'unidad_medida_id' => $ml,     'punto_reorden' => 500],
            ['nombre' => 'Color Rojo Escarlata',      'unidad_medida_id' => $g,      'punto_reorden' => 100],
            ['nombre' => 'Color Café',                'unidad_medida_id' => $ml,     'punto_reorden' => 100],
            ['nombre' => 'Café Molido',               'unidad_medida_id' => $g,      'punto_reorden' => 500],
            ['nombre' => 'Brillo Harmony',            'unidad_medida_id' => $g,      'punto_reorden' => 500],
            ['nombre' => 'Brandy',                    'unidad_medida_id' => $ml,     'punto_reorden' => 300],
            ['nombre' => 'Crema Baileys',             'unidad_medida_id' => $ml,     'punto_reorden' => 300],
            ['nombre' => 'Grand America Base',        'unidad_medida_id' => $g,      'punto_reorden' => 1000],
            ['nombre' => 'Whip Topping Base',         'unidad_medida_id' => $g,      'punto_reorden' => 2000],
            ['nombre' => 'Bettercream Nata',          'unidad_medida_id' => $g,      'punto_reorden' => 1000],
            ['nombre' => 'Bettercream Chocolate',     'unidad_medida_id' => $g,      'punto_reorden' => 1000],
            ['nombre' => 'Tres Leches Rich',          'unidad_medida_id' => $g,      'punto_reorden' => 1000],

            // ── Empaque ───────────────────────────────────────────────────────
            ['nombre' => 'Empaque de Palitos',        'unidad_medida_id' => $unidad, 'punto_reorden' => 500],
            ['nombre' => 'Bolsa 4x6',                 'unidad_medida_id' => $unidad, 'punto_reorden' => 1000],
            ['nombre' => 'Bolsa Aluminio',            'unidad_medida_id' => $unidad, 'punto_reorden' => 50],
            ['nombre' => 'Capacillos Cupcake',        'unidad_medida_id' => $unidad, 'punto_reorden' => 200],
        ];

        foreach ($materias as $mp) {
            MateriaPrima::firstOrCreate(
                ['nombre' => $mp['nombre']],
                array_merge($mp, ['activa' => true])
            );
        }
    }
}
