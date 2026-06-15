<?php

namespace Database\Seeders;

use App\Models\Cliente;
use Illuminate\Database\Seeder;

/**
 * ClienteSeeder — Clientes representativos del sector pastelero/distribución colombiano.
 *
 * Incluye una mezcla de empresas distribuidoras, supermercados, cafeterías
 * y personas naturales que compran producto terminado directamente.
 */
class ClienteSeeder extends Seeder
{
    public function run(): void
    {
        $clientes = [

            // ── Empresas distribuidoras ──────────────────────────────────────
            [
                'tipo'            => 'empresa',
                'nombre'          => 'Distribuidora El Trigal S.A.S.',
                'nit_cedula'      => '900.234.567-1',
                'telefono'        => '3112345678',
                'email'           => 'pedidos@eltrigal.com.co',
                'direccion'       => 'Calle 15 # 22-45, Bogotá',
                'contacto_nombre' => 'Andrés Moreno',
                'activo'          => true,
            ],
            [
                'tipo'            => 'empresa',
                'nombre'          => 'Pastelería y Confitería La Abuela Ltda.',
                'nit_cedula'      => '800.456.789-3',
                'telefono'        => '3187654321',
                'email'           => 'compras@laabuela.co',
                'direccion'       => 'Carrera 8 # 12-30, Medellín',
                'contacto_nombre' => 'Carmen Isaza',
                'activo'          => true,
            ],
            [
                'tipo'            => 'empresa',
                'nombre'          => 'Supermercado Mercacentro',
                'nit_cedula'      => '890.123.456-2',
                'telefono'        => '3205678901',
                'email'           => 'proveedores@mercacentro.com',
                'direccion'       => 'Av. 30 de Agosto # 46-20, Pereira',
                'contacto_nombre' => 'Gloria Henao',
                'activo'          => true,
            ],
            [
                'tipo'            => 'empresa',
                'nombre'          => 'Cafetería y Panadería San Honoré S.A.S.',
                'nit_cedula'      => '901.345.678-5',
                'telefono'        => '3143456789',
                'email'           => 'gerencia@sanhonore.com.co',
                'direccion'       => 'Calle 93 # 13-44, Bogotá',
                'contacto_nombre' => 'Felipe Arango',
                'activo'          => true,
            ],
            [
                'tipo'            => 'empresa',
                'nombre'          => 'Grupo Alimentario del Pacífico S.A.',
                'nit_cedula'      => '800.789.012-8',
                'telefono'        => '3229012345',
                'email'           => 'logistica@grupopacifico.com.co',
                'direccion'       => 'Zona Franca, Cali',
                'contacto_nombre' => 'Lucía Caicedo',
                'activo'          => true,
            ],
            [
                'tipo'            => 'empresa',
                'nombre'          => 'Mini-Mercado La Canasta Familiar',
                'nit_cedula'      => '900.567.890-4',
                'telefono'        => '3168901234',
                'email'           => 'lacanasta@hotmail.com',
                'direccion'       => 'Cra 15 # 45-10, Bucaramanga',
                'contacto_nombre' => 'Hernán Castillo',
                'activo'          => true,
            ],
            [
                'tipo'            => 'empresa',
                'nombre'          => 'Hotel y Centro de Eventos El Jardín',
                'nit_cedula'      => '891.234.567-6',
                'telefono'        => '3201234567',
                'email'           => 'eventos@hoteljardin.com.co',
                'direccion'       => 'Km 3 Vía al Aeropuerto, Manizales',
                'contacto_nombre' => 'Natalia Ospina',
                'activo'          => true,
            ],
            [
                'tipo'            => 'empresa',
                'nombre'          => 'Tiendas Ara (Proveedor Regional)',
                'nit_cedula'      => '900.890.123-9',
                'telefono'        => '3174567890',
                'email'           => 'proveedores.ara@jeronimoMartins.co',
                'direccion'       => 'Calle 80 # 69B-31, Bogotá',
                'contacto_nombre' => 'Sebastián Leal',
                'activo'          => true,
            ],

            // ── Personas naturales ──────────────────────────────────────────
            [
                'tipo'            => 'persona',
                'nombre'          => 'María Elena Vargas Ríos',
                'nit_cedula'      => '52.456.789',
                'telefono'        => '3112223334',
                'email'           => 'mvargas@gmail.com',
                'direccion'       => 'Calle 68 # 10-25, Bogotá',
                'contacto_nombre' => null,
                'activo'          => true,
            ],
            [
                'tipo'            => 'persona',
                'nombre'          => 'Jorge Luis Peña Gutiérrez',
                'nit_cedula'      => '79.123.456',
                'telefono'        => '3195556677',
                'email'           => null,
                'direccion'       => 'Carrera 20 # 33-12, Ibagué',
                'contacto_nombre' => null,
                'activo'          => true,
            ],
            [
                'tipo'            => 'persona',
                'nombre'          => 'Rosa Helena Bermúdez',
                'nit_cedula'      => '43.789.012',
                'telefono'        => '3006789012',
                'email'           => 'rosahbermudez@yahoo.com',
                'direccion'       => 'Av. El Poblado # 8-30, Medellín',
                'contacto_nombre' => null,
                'activo'          => true,
            ],
            [
                'tipo'            => 'persona',
                'nombre'          => 'Carlos Arturo Díaz Molina',
                'nit_cedula'      => '1.020.345.678',
                'telefono'        => '3135678901',
                'email'           => 'cadiaz@outlook.com',
                'direccion'       => null,
                'contacto_nombre' => null,
                'activo'          => true,
            ],
        ];

        foreach ($clientes as $data) {
            Cliente::firstOrCreate(
                ['nombre' => $data['nombre']],
                $data
            );
        }

        $this->command->info('ClienteSeeder: ' . count($clientes) . ' clientes creados.');
    }
}
