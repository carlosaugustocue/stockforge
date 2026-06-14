<?php

namespace Database\Seeders;

use App\Models\MateriaPrima;
use App\Models\Proveedor;
use Illuminate\Database\Seeder;

/**
 * ProveedorSeeder — Proveedores reales del sector pastelero colombiano.
 * Cada proveedor queda vinculado a las materias primas que suministra
 * a través del pivot proveedor_materia_prima.
 *
 * Debe ejecutarse DESPUÉS de MateriaPrimaSeeder.
 */
class ProveedorSeeder extends Seeder
{
    public function run(): void
    {
        $proveedores = [
            // ── Harinas y féculas ────────────────────────────────────────────
            [
                'proveedor' => [
                    'nombre'          => 'Harinera del Valle S.A.',
                    'contacto_nombre' => 'Carlos Bermúdez',
                    'telefono'        => '3124561890',
                    'email'           => 'ventas@harineradelvalle.com.co',
                    'activo'          => true,
                ],
                'materias_primas' => [
                    'Harina de Trigo',
                    'Harina Farallones',
                    'Fécula de Maíz',
                    'Salvado de Trigo',
                ],
            ],

            // ── Grasas, margarinas y aceites ─────────────────────────────────
            [
                'proveedor' => [
                    'nombre'          => 'Grasco S.A.',
                    'contacto_nombre' => 'Paola Restrepo',
                    'telefono'        => '3208745623',
                    'email'           => 'clientes@grasco.com.co',
                    'activo'          => true,
                ],
                'materias_primas' => [
                    'Margarina Astra',
                    'Margarina Tulipán',
                    'Aceite',
                    'Aceite Sólido Desengrasante',
                ],
            ],

            // ── Lácteos y derivados ──────────────────────────────────────────
            [
                'proveedor' => [
                    'nombre'          => 'Colanta Ltda.',
                    'contacto_nombre' => 'Andrés Sánchez',
                    'telefono'        => '3154789632',
                    'email'           => 'distribuciones@colanta.com.co',
                    'activo'          => true,
                ],
                'materias_primas' => [
                    'Leche Líquida',
                    'Leche en Polvo',
                    'Leche Condensada',
                    'Crema de Leche',
                    'Queso Costeño',
                    'Queso Costeño Molido',
                    'Queso Crema',
                    'Queso Crema Colanta',
                    'Queso Criollo',
                    'Arequipe',
                    'Dulce de Leche',
                ],
            ],

            // ── Rellenos y pulpas de fruta ───────────────────────────────────
            [
                'proveedor' => [
                    'nombre'          => 'Distribuidora Frutty Colombia',
                    'contacto_nombre' => 'Marcela Torres',
                    'telefono'        => '3001236547',
                    'email'           => 'pedidos@frutty.com.co',
                    'activo'          => true,
                ],
                'materias_primas' => [
                    'Pulpa de Mora',
                    'Pulpa de Maracuyá',
                    'Relleno de Mora Frutty',
                    'Relleno de Fresa Frutty',
                    'Relleno de Maracuyá Frutty',
                    'Cernido de Guayaba',
                ],
            ],

            // ── Cacao y chocolates ───────────────────────────────────────────
            [
                'proveedor' => [
                    'nombre'          => 'Casa Luker S.A.',
                    'contacto_nombre' => 'Hernán Castillo',
                    'telefono'        => '3187456321',
                    'email'           => 'ventas.industrial@casaluker.com',
                    'activo'          => true,
                ],
                'materias_primas' => [
                    'Cocoa',
                    'Cobertura de Chocolate',
                    'Cobertura Blanca',
                    'Chips de Chocolate Corona',
                    'Chips de Chocolate Blanco',
                    'Chococubierta Nacional',
                ],
            ],

            // ── Aditivos, conservantes y estabilizantes ──────────────────────
            [
                'proveedor' => [
                    'nombre'          => 'Tecnas S.A.',
                    'contacto_nombre' => 'Diana Molina',
                    'telefono'        => '3042589631',
                    'email'           => 'info@tecnas.com.co',
                    'activo'          => true,
                ],
                'materias_primas' => [
                    'Polvo de Horneo',
                    'Bicarbonato de Sodio',
                    'Ácido Sórbico',
                    'Propionato de Calcio',
                    'CMC',
                    'Dióxido de Titanio',
                    'Glucosa',
                    'Glicerina',
                ],
            ],

            // ── Premezclas y bases industriales ──────────────────────────────
            [
                'proveedor' => [
                    'nombre'          => 'Rich Products Colombia S.A.S.',
                    'contacto_nombre' => 'Juliana Ospina',
                    'telefono'        => '3113698745',
                    'email'           => 'ventas.co@richproducts.com',
                    'activo'          => true,
                ],
                'materias_primas' => [
                    'Premezcla Bizcocho Rich',
                    'Premezcla Bizcochuelo',
                    'Premezcla Brownie',
                    'Grand America Base',
                    'Whip Topping Base',
                    'Tres Leches Rich',
                    'Bettercream Nata',
                    'Bettercream Chocolate',
                    'Crema Chantilly',
                ],
            ],

            // ── Azúcares, sal y endulzantes ──────────────────────────────────
            [
                'proveedor' => [
                    'nombre'          => 'Distribuidora Merka S.A.S.',
                    'contacto_nombre' => 'Roberto Vargas',
                    'telefono'        => '3226541230',
                    'email'           => 'pedidos@distribuidoramerka.com',
                    'activo'          => true,
                ],
                'materias_primas' => [
                    'Azúcar',
                    'Azúcar Pulverizada',
                    'Sal',
                    'Stevia',
                    'Huevos',
                ],
            ],

            // ── Frutas, semillas y naturales ─────────────────────────────────
            [
                'proveedor' => [
                    'nombre'          => 'Naturales del Valle Ltda.',
                    'contacto_nombre' => 'Luz Adriana Herrera',
                    'telefono'        => '3059874123',
                    'email'           => 'naturales@naturalesdelvalle.co',
                    'activo'          => true,
                ],
                'materias_primas' => [
                    'Fresa',
                    'Zanahoria',
                    'Uvas Pasas',
                    'Nueces Trituradas',
                    'Maní Triturado',
                    'Semillas de Chía',
                    'Canela en Polvo',
                    'Café Molido',
                ],
            ],

            // ── Esencias y colorantes ─────────────────────────────────────────
            [
                'proveedor' => [
                    'nombre'          => 'Esencias & Colorantes Ltda.',
                    'contacto_nombre' => 'Felipe Arango',
                    'telefono'        => '3168523690',
                    'email'           => 'ventas@esenciasycolorantes.com.co',
                    'activo'          => true,
                ],
                'materias_primas' => [
                    'Esencia de Vainilla',
                    'Esencia de Naranja',
                    'Esencia Mantequilla',
                    'Esencia Queso',
                    'Esencia Arequipe',
                    'Esencia Ron con Pasas',
                    'Esencia Flavor Cake',
                    'Color Amarillo Huevo',
                    'Color Caramelo',
                    'Color Rojo Escarlata',
                    'Color Café',
                    'Brillo Harmony',
                ],
            ],

            // ── Licores y vinagres ────────────────────────────────────────────
            [
                'proveedor' => [
                    'nombre'          => 'Distribuciones Gourmet S.A.S.',
                    'contacto_nombre' => 'Camilo Pedraza',
                    'telefono'        => '3174125896',
                    'email'           => 'gourmet@distribgourmet.com.co',
                    'activo'          => true,
                ],
                'materias_primas' => [
                    'Brandy',
                    'Crema Baileys',
                    'Vinagre',
                ],
            ],

            // ── Empaques ──────────────────────────────────────────────────────
            [
                'proveedor' => [
                    'nombre'          => 'Superempaques S.A.S.',
                    'contacto_nombre' => 'Sandra Loaiza',
                    'telefono'        => '3096325874',
                    'email'           => 'ventas@superempaques.com.co',
                    'activo'          => true,
                ],
                'materias_primas' => [
                    'Empaque de Palitos',
                    'Bolsa 4x6',
                    'Bolsa Aluminio',
                    'Capacillos Cupcake',
                ],
            ],
        ];

        foreach ($proveedores as $entry) {
            $proveedor = Proveedor::firstOrCreate(
                ['nombre' => $entry['proveedor']['nombre']],
                $entry['proveedor']
            );

            $ids = MateriaPrima::whereIn('nombre', $entry['materias_primas'])
                ->pluck('id')
                ->toArray();

            $proveedor->materiasPrimas()->sync($ids);
        }
    }
}
