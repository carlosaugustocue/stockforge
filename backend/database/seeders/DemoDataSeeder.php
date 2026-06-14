<?php

namespace Database\Seeders;

use App\Models\Bodega;
use App\Models\Despacho;
use App\Models\LoteMateriaPrima;
use App\Models\LoteProductoTerminado;
use App\Models\MateriaPrima;
use App\Models\MovimientoInventario;
use App\Models\OrdenPedido;
use App\Models\OrdenProduccion;
use App\Models\ProductoTerminado;
use App\Models\Recepcion;
use App\Models\RequerimientoMaterial;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * DemoDataSeeder — Simula 3 meses de operación de Daluzed Pastelería.
 *
 * Flujo completo ejecutado:
 *   Recepción MP → Stock Bodega Principal → Producción (consume MP, FEFO)
 *   → PT en Bodega Producción → Traslado PT → Bodega Ventas → Despacho a clientes
 *
 * Se crean 2 rondas de compras, 5 órdenes de producción completadas y 4 despachos.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $encargado  = User::whereHas('role', fn($q) => $q->where('nombre', 'encargado_inventarios'))->first();
        $jefe       = User::whereHas('role', fn($q) => $q->where('nombre', 'jefe_produccion'))->first();

        $principal  = Bodega::where('tipo', 'principal')->first();
        $produccion = Bodega::where('tipo', 'produccion')->first();
        $ventas     = Bodega::where('tipo', 'ventas')->first();

        // ── RECEPCIÓN 1 — hace 3 meses (lote grande de materias primas base) ──
        $orden1 = OrdenPedido::create([
            'proveedor'     => 'Harinera del Valle S.A.',
            'estado'        => 'cerrada',
            'fecha_esperada'=> now()->subMonths(3)->toDateString(),
            'observaciones' => 'Pedido mensual de insumos base',
            'created_at'    => now()->subMonths(3),
            'updated_at'    => now()->subMonths(3),
        ]);
        $rec1 = Recepcion::create([
            'orden_pedido_id' => $orden1->id,
            'created_at'      => now()->subMonths(3),
        ]);
        $this->crearLote($rec1->id, 'Harina de Trigo',       $principal->id, 50000, now()->subMonths(3), now()->addMonths(9));
        $this->crearLote($rec1->id, 'Azúcar',                $principal->id, 50000, now()->subMonths(3), null);
        $this->crearLote($rec1->id, 'Margarina Astra',        $principal->id, 30000, now()->subMonths(3), now()->addMonths(6));
        $this->crearLote($rec1->id, 'Fécula de Maíz',         $principal->id, 25000, now()->subMonths(3), null);
        $this->crearLote($rec1->id, 'Queso Costeño',          $principal->id, 10000, now()->subMonths(3), now()->addMonths(1));
        $this->crearLote($rec1->id, 'Huevos',                 $principal->id, 15000, now()->subMonths(3), now()->addMonths(2));
        $this->crearLote($rec1->id, 'Sal',                    $principal->id, 5000,  now()->subMonths(3), null);
        $this->crearLote($rec1->id, 'Polvo de Horneo',        $principal->id, 5000,  now()->subMonths(3), now()->addMonths(12));
        $this->crearLote($rec1->id, 'Ácido Sórbico',          $principal->id, 1000,  now()->subMonths(3), now()->addMonths(18));
        $this->crearLote($rec1->id, 'Propionato de Calcio',   $principal->id, 1000,  now()->subMonths(3), now()->addMonths(18));
        $this->crearLote($rec1->id, 'Esencia de Vainilla',    $principal->id, 5000,  now()->subMonths(3), now()->addMonths(24));
        $this->crearLote($rec1->id, 'Esencia Mantequilla',    $principal->id, 1000,  now()->subMonths(3), now()->addMonths(24));
        $this->crearLote($rec1->id, 'Esencia Queso',          $principal->id, 500,   now()->subMonths(3), now()->addMonths(24));
        $this->crearLote($rec1->id, 'Color Amarillo Huevo',   $principal->id, 500,   now()->subMonths(3), now()->addMonths(24));
        $this->crearLote($rec1->id, 'Cocoa',                  $principal->id, 10000, now()->subMonths(3), now()->addMonths(12));
        $this->crearLote($rec1->id, 'Aceite',                 $principal->id, 20000, now()->subMonths(3), now()->addMonths(6));
        $this->crearLote($rec1->id, 'Bicarbonato de Sodio',   $principal->id, 2000,  now()->subMonths(3), null);
        $this->crearLote($rec1->id, 'Vinagre',                $principal->id, 5000,  now()->subMonths(3), null);
        $this->crearLote($rec1->id, 'Leche Líquida',          $principal->id, 10000, now()->subMonths(3), now()->subWeeks(8));  // Vencido — alerta FEFO
        $this->crearLote($rec1->id, 'Color Caramelo',         $principal->id, 5000,  now()->subMonths(3), now()->addMonths(18));
        $this->crearLote($rec1->id, 'Semillas de Chía',       $principal->id, 10000, now()->subMonths(3), now()->addMonths(12));
        $this->crearLote($rec1->id, 'Premezcla Bizcocho Rich',$principal->id, 10000, now()->subMonths(3), now()->addMonths(6));
        $this->crearLote($rec1->id, 'Premezcla Brownie',      $principal->id, 12500, now()->subMonths(3), now()->addMonths(6));

        // ── RECEPCIÓN 2 — hace 1 mes (reposición + ingredientes especiales) ──
        $orden2 = OrdenPedido::create([
            'proveedor'     => 'Distribuidora Quesos del Valle',
            'estado'        => 'cerrada',
            'fecha_esperada'=> now()->subMonth()->toDateString(),
            'observaciones' => 'Reposición de quesos y frutas',
            'created_at'    => now()->subMonth(),
            'updated_at'    => now()->subMonth(),
        ]);
        $rec2 = Recepcion::create([
            'orden_pedido_id' => $orden2->id,
            'created_at'      => now()->subMonth(),
        ]);
        $this->crearLote($rec2->id, 'Harina de Trigo',       $principal->id, 25000, now()->subMonth(), now()->addMonths(10));
        $this->crearLote($rec2->id, 'Queso Costeño',          $principal->id, 8000,  now()->subMonth(), now()->addMonths(2));
        $this->crearLote($rec2->id, 'Queso Crema Colanta',    $principal->id, 5000,  now()->subMonth(), now()->addMonths(1));
        $this->crearLote($rec2->id, 'Pulpa de Mora',          $principal->id, 12500, now()->subMonth(), now()->addMonths(4));
        $this->crearLote($rec2->id, 'Arequipe',               $principal->id, 10000, now()->subMonth(), now()->addMonths(6));
        $this->crearLote($rec2->id, 'Zanahoria',              $principal->id, 10000, now()->subMonth(), now()->addWeeks(3));
        $this->crearLote($rec2->id, 'Nueces Trituradas',      $principal->id, 3000,  now()->subMonth(), now()->addMonths(6));
        $this->crearLote($rec2->id, 'Uvas Pasas',             $principal->id, 3000,  now()->subMonth(), now()->addMonths(6));
        $this->crearLote($rec2->id, 'Margarina Astra',        $principal->id, 15000, now()->subMonth(), now()->addMonths(5));
        $this->crearLote($rec2->id, 'Café Molido',           $principal->id, 3000,  now()->subMonth(), now()->addMonths(8));
        $this->crearLote($rec2->id, 'Leche Líquida',          $principal->id, 8000,  now()->subMonth(), now()->addMonths(1));
        $this->crearLote($rec2->id, 'Leche en Polvo',         $principal->id, 3000,  now()->subMonth(), now()->addMonths(12));
        $this->crearLote($rec2->id, 'Color Rojo Escarlata',   $principal->id, 500,   now()->subMonth(), now()->addMonths(24));
        $this->crearLote($rec2->id, 'Harina Farallones',      $principal->id, 5000,  now()->subMonth(), now()->addMonths(8));
        $this->crearLote($rec2->id, 'Esencia de Naranja',     $principal->id, 500,   now()->subMonth(), now()->addMonths(24));
        $this->crearLote($rec2->id, 'Canela en Polvo',        $principal->id, 500,   now()->subMonth(), now()->addMonths(24));
        $this->crearLote($rec2->id, 'Salvado de Trigo',       $principal->id, 1000,  now()->subMonth(), null);
        $this->crearLote($rec2->id, 'Stevia',                 $principal->id, 450,   now()->subMonth(), now()->addMonths(18));
        $this->crearLote($rec2->id, 'Empaque de Palitos',     $principal->id, 2000,  now()->subMonth(), null);
        $this->crearLote($rec2->id, 'Cobertura de Chocolate', $principal->id, 10000, now()->subMonth(), now()->addMonths(6));
        $this->crearLote($rec2->id, 'Esencia Ron con Pasas',  $principal->id, 500,   now()->subMonth(), now()->addMonths(24));
        $this->crearLote($rec2->id, 'Huevos',                 $principal->id, 12000, now()->subMonth(), now()->addMonths(2));
        $this->crearLote($rec2->id, 'Azúcar',                 $principal->id, 30000, now()->subMonth(), null);
        $this->crearLote($rec2->id, 'Fécula de Maíz',         $principal->id, 10000, now()->subMonth(), null);

        // ── RECEPCIÓN 3 — pedido en curso (no ha llegado aún) ────────────────
        $orden3 = OrdenPedido::create([
            'proveedor'     => 'Agroinsumos del Eje Cafetero',
            'estado'        => 'pendiente',
            'fecha_esperada'=> now()->addWeek()->toDateString(),
            'observaciones' => 'Pedido de chía, pulpas y galleta triturada',
            'created_at'    => now()->subDays(3),
            'updated_at'    => now()->subDays(3),
        ]);

        // ── PRODUCCIÓN 1 — Palitos de Queso (hace 2.5 meses) ─────────────────
        $this->simularProduccion(
            producto: 'Palitos de Queso',
            cantidadPlanificada: 500,
            cantidadProducida: 480,
            consumos: [
                'Harina de Trigo'      => 6000,
                'Azúcar'               => 1200,
                'Margarina Astra'      => 1875,
                'Fécula de Maíz'       => 1500,
                'Queso Costeño'        => 1500,
                'Huevos'               => 900,
                'Polvo de Horneo'      => 225,
                'Sal'                  => 100,
                'Esencia Mantequilla'  => 80,
                'Esencia Queso'        => 40,
                'Color Amarillo Huevo' => 15,
            ],
            bodegaPrincipal: $principal,
            bodegaProduccion: $produccion,
            bodegaVentas: $ventas,
            usuario: $encargado,
            fechaBase: now()->subMonths(2)->subWeeks(2),
            clienteDespacho: 'Supermercado La 14 - Centro',
            cantidadDespacho: 200,
        );

        // ── PRODUCCIÓN 2 — Torta de Chocolate (hace 2 meses) ─────────────────
        $this->simularProduccion(
            producto: 'Torta de Chocolate',
            cantidadPlanificada: 20,
            cantidadProducida: 18,
            consumos: [
                'Huevos'              => 1100,
                'Harina de Trigo'     => 2000,
                'Leche Líquida'       => 1660,
                'Azúcar'              => 2000,
                'Aceite'              => 1600,
                'Sal'                 => 8,
                'Esencia de Vainilla' => 40,
                'Color Caramelo'      => 40,
                'Ácido Sórbico'       => 8,
                'Propionato de Calcio'=> 6,
                'Bicarbonato de Sodio'=> 60,
                'Cocoa'               => 360,
                'Vinagre'             => 60,
            ],
            bodegaPrincipal: $principal,
            bodegaProduccion: $produccion,
            bodegaVentas: $ventas,
            usuario: $jefe,
            fechaBase: now()->subMonths(2),
            clienteDespacho: 'Pastelería Bella Época',
            cantidadDespacho: 8,
        );

        // ── PRODUCCIÓN 3 — Galleta de Vainilla (hace 1.5 meses) ──────────────
        $this->simularProduccion(
            producto: 'Galleta de Vainilla',
            cantidadPlanificada: 300,
            cantidadProducida: 300,
            consumos: [
                'Harina de Trigo'     => 1000,
                'Azúcar'              => 600,
                'Margarina Astra'     => 500,
                'Esencia de Vainilla' => 10,
            ],
            bodegaPrincipal: $principal,
            bodegaProduccion: $produccion,
            bodegaVentas: $ventas,
            usuario: $encargado,
            fechaBase: now()->subMonths(1)->subWeeks(2),
            clienteDespacho: 'Cafetería Universidad del Quindío',
            cantidadDespacho: 150,
        );

        // ── PRODUCCIÓN 4 — Torta de Chía con Ganache (hace 3 semanas) ────────
        $this->simularProduccion(
            producto: 'Torta de Chía con Ganache',
            cantidadPlanificada: 15,
            cantidadProducida: 15,
            consumos: [
                'Huevos'               => 2600,
                'Harina de Trigo'      => 2500,
                'Margarina Astra'      => 2000,
                'Azúcar'               => 2000,
                'Semillas de Chía'     => 220,
                'Polvo de Horneo'      => 30,
                'Sal'                  => 20,
                'Esencia de Vainilla'  => 20,
                'Ácido Sórbico'        => 9,
                'Propionato de Calcio' => 7.5,
                'Cobertura de Chocolate'=> 500,
            ],
            bodegaPrincipal: $principal,
            bodegaProduccion: $produccion,
            bodegaVentas: $ventas,
            usuario: $jefe,
            fechaBase: now()->subWeeks(3),
            clienteDespacho: 'Hotel Estelar Armenia',
            cantidadDespacho: 10,
        );

        // ── PRODUCCIÓN 5 — Torta de Zanahoria (hace 1 semana) ────────────────
        $this->simularProduccion(
            producto: 'Torta de Zanahoria',
            cantidadPlanificada: 12,
            cantidadProducida: 12,
            consumos: [
                'Huevos'               => 1300,
                'Harina de Trigo'      => 1800,
                'Zanahoria'            => 2000,
                'Azúcar'               => 1700,
                'Aceite'               => 900,
                'Nueces Trituradas'    => 200,
                'Sal'                  => 16,
                'Esencia de Vainilla'  => 20,
                'Ácido Sórbico'        => 8,
                'Propionato de Calcio' => 5,
                'Canela en Polvo'      => 5,
                'Bicarbonato de Sodio' => 60,
            ],
            bodegaPrincipal: $principal,
            bodegaProduccion: $produccion,
            bodegaVentas: $ventas,
            usuario: $encargado,
            fechaBase: now()->subWeek(),
            clienteDespacho: null,  // aún en bodega ventas, sin despachar
            cantidadDespacho: 0,
        );
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    private function crearLote(
        int $recepcionId,
        string $mpNombre,
        int $bodegaId,
        float $cantidad,
        \DateTimeInterface $fechaIngreso,
        ?\DateTimeInterface $fechaVencimiento,
    ): ?LoteMateriaPrima {
        $mp = MateriaPrima::where('nombre', $mpNombre)->first();
        if (! $mp) return null;

        return LoteMateriaPrima::create([
            'recepcion_id'     => $recepcionId,
            'materia_prima_id' => $mp->id,
            'bodega_id'        => $bodegaId,
            'cantidad_inicial' => $cantidad,
            'cantidad_actual'  => $cantidad,
            'fecha_ingreso'    => $fechaIngreso,
            'fecha_vencimiento'=> $fechaVencimiento,
        ]);
    }

    private function simularProduccion(
        string $producto,
        int $cantidadPlanificada,
        int $cantidadProducida,
        array $consumos,
        Bodega $bodegaPrincipal,
        Bodega $bodegaProduccion,
        Bodega $bodegaVentas,
        User $usuario,
        \DateTimeInterface $fechaBase,
        ?string $clienteDespacho,
        int $cantidadDespacho,
    ): void {
        $pt = ProductoTerminado::where('nombre', $producto)->first();
        if (! $pt) return;

        // 1. Crear orden de producción
        $orden = OrdenProduccion::create([
            'producto_terminado_id' => $pt->id,
            'cantidad_planificada'  => $cantidadPlanificada,
            'cantidad_producida'    => $cantidadProducida,
            'estado'                => 'completada',
            'fecha_planificada'     => $fechaBase->format('Y-m-d'),
            'created_at'            => $fechaBase,
            'updated_at'            => $fechaBase,
        ]);

        // 2. Registrar requerimientos y consumos de MP (FEFO simplificado: primer lote disponible)
        foreach ($consumos as $mpNombre => $cantidadRequerida) {
            $mp = MateriaPrima::where('nombre', $mpNombre)->first();
            if (! $mp) continue;

            RequerimientoMaterial::create([
                'orden_produccion_id' => $orden->id,
                'materia_prima_id'    => $mp->id,
                'cantidad_requerida'  => $cantidadRequerida,
                'created_at'          => $fechaBase,
            ]);

            // Descontar del lote más antiguo disponible (FEFO)
            $restante = $cantidadRequerida;
            $lotes = LoteMateriaPrima::where('materia_prima_id', $mp->id)
                ->where('bodega_id', $bodegaPrincipal->id)
                ->where('cantidad_actual', '>', 0)
                ->orderBy('fecha_vencimiento')
                ->orderBy('fecha_ingreso')
                ->get();

            foreach ($lotes as $lote) {
                if ($restante <= 0) break;
                $descuento = min($restante, (float) $lote->cantidad_actual);
                $lote->decrement('cantidad_actual', $descuento);
                $restante -= $descuento;

                MovimientoInventario::create([
                    'tipo'         => MovimientoInventario::TIPO_CONSUMO_MP,
                    'entidad_tipo' => MovimientoInventario::ENTIDAD_MATERIA_PRIMA,
                    'entidad_id'   => $lote->id,
                    'bodega_id'    => $bodegaPrincipal->id,
                    'cantidad'     => $descuento,
                    'user_id'      => $usuario->id,
                    'created_at'   => $fechaBase,
                ]);
            }
        }

        // 3. Crear lote de PT en Bodega Producción
        $lotePt = LoteProductoTerminado::create([
            'orden_produccion_id'   => $orden->id,
            'producto_terminado_id' => $pt->id,
            'bodega_id'             => $bodegaProduccion->id,
            'cantidad_inicial'      => $cantidadProducida,
            'cantidad_actual'       => $cantidadProducida,
            'fecha_produccion'      => $fechaBase->format('Y-m-d'),
            'created_at'            => $fechaBase,
            'updated_at'            => $fechaBase,
        ]);

        MovimientoInventario::create([
            'tipo'         => MovimientoInventario::TIPO_PRODUCCION_ENTRADA,
            'entidad_tipo' => MovimientoInventario::ENTIDAD_PRODUCTO_TERMINADO,
            'entidad_id'   => $lotePt->id,
            'bodega_id'    => $bodegaProduccion->id,
            'cantidad'     => $cantidadProducida,
            'user_id'      => $usuario->id,
            'created_at'   => $fechaBase,
        ]);

        // 4. Traslado PT → Bodega Ventas
        $lotePt->update(['bodega_id' => $bodegaVentas->id]);

        MovimientoInventario::create([
            'tipo'         => MovimientoInventario::TIPO_TRASLADO_SALIDA,
            'entidad_tipo' => MovimientoInventario::ENTIDAD_PRODUCTO_TERMINADO,
            'entidad_id'   => $lotePt->id,
            'bodega_id'    => $bodegaProduccion->id,
            'cantidad'     => $cantidadProducida,
            'user_id'      => $usuario->id,
            'created_at'   => $fechaBase->modify('+1 hour'),
        ]);

        MovimientoInventario::create([
            'tipo'         => MovimientoInventario::TIPO_TRASLADO_ENTRADA,
            'entidad_tipo' => MovimientoInventario::ENTIDAD_PRODUCTO_TERMINADO,
            'entidad_id'   => $lotePt->id,
            'bodega_id'    => $bodegaVentas->id,
            'cantidad'     => $cantidadProducida,
            'user_id'      => $usuario->id,
            'created_at'   => $fechaBase->modify('+1 hour'),
        ]);

        // 5. Despacho al cliente (si aplica)
        if ($clienteDespacho && $cantidadDespacho > 0) {
            $fechaDespacho = $fechaBase->modify('+2 hours');

            // Crear movimiento DESPACHO_SALIDA primero — despachos.movimiento_id es NOT NULL
            $movDespacho = MovimientoInventario::create([
                'tipo'         => MovimientoInventario::TIPO_DESPACHO_SALIDA,
                'entidad_tipo' => MovimientoInventario::ENTIDAD_PRODUCTO_TERMINADO,
                'entidad_id'   => $lotePt->id,
                'bodega_id'    => $bodegaVentas->id,
                'cantidad'     => $cantidadDespacho,
                'user_id'      => $usuario->id,
                'created_at'   => $fechaDespacho,
            ]);

            Despacho::create([
                'lote_pt_id'         => $lotePt->id,
                'cantidad'           => $cantidadDespacho,
                'referencia_cliente' => $clienteDespacho,
                'user_id'            => $usuario->id,
                'movimiento_id'      => $movDespacho->id,
                'created_at'         => $fechaDespacho,
            ]);

            $lotePt->decrement('cantidad_actual', $cantidadDespacho);
        }
    }
}
