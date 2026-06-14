<?php

/**
 * Test de integración E2E — Ciclo completo del sistema (HU-027)
 *
 * Verifica que todos los módulos interactúan correctamente en el flujo real:
 *
 *   Recepción MP → Inventario → Producción → Traslado PT → Despacho
 *
 * Este test NO mockea nada. Usa la base de datos real (SQLite :memory:)
 * y todos los módulos reales para garantizar que la integración es correcta.
 */

use App\Models\Bodega;
use App\Models\Despacho;
use App\Models\LoteMateriaPrima;
use App\Models\LoteProductoTerminado;
use App\Models\MateriaPrima;
use App\Models\MovimientoInventario;
use App\Models\OrdenProduccion;
use App\Models\ProductoTerminado;
use App\Models\RelacionMpPt;
use App\Models\Role;
use App\Models\UnidadMedida;
use Database\Seeders\BodegaSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\UnidadMedidaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->seed(PermissionSeeder::class);
    $this->seed(UnidadMedidaSeeder::class);
    $this->seed(BodegaSeeder::class);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: FLUJO COMPLETO — Recepción → Producción → Despacho
//
// Escenario: La panadería recibe 100 kg de harina, planifica producir
// 10 panes (0.5 kg/pan), los produce, los traslada a Ventas y los despacha.
// ─────────────────────────────────────────────────────────────────────────────
test('flujo_completo_recepcion_produccion_despacho', function () {

    // ── Setup: usuario encargado con todos los permisos operativos ────────────
    $role = Role::where('nombre', Role::ENCARGADO_INVENTARIOS)->first();
    $user = \App\Models\User::factory()->create(['role_id' => $role->id, 'activo' => true]);
    $token = $user->createToken('api-token')->plainTextToken;

    $unidadKg  = UnidadMedida::where('nombre', 'kg')->first();
    $unidadUnd = UnidadMedida::where('nombre', 'unidad')->first();

    // ── Catálogo: crear MP, PT y receta ──────────────────────────────────────
    $mp = MateriaPrima::create([
        'nombre'          => 'Harina de trigo',
        'unidad_medida_id'=> $unidadKg->id,
        'punto_reorden'   => 20,
        'activa'          => true,
    ]);
    $pt = ProductoTerminado::create([
        'nombre'          => 'Pan artesanal',
        'unidad_medida_id'=> $unidadUnd->id,
        'activo'          => true,
    ]);
    RelacionMpPt::create([
        'materia_prima_id'      => $mp->id,
        'producto_terminado_id' => $pt->id,
        'cantidad_requerida'    => 0.5, // 0.5 kg por pan
        'unidad_medida_id'      => $unidadKg->id,
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // ETAPA 1: RECEPCIÓN — Compra de 100 kg de harina al proveedor
    // ─────────────────────────────────────────────────────────────────────────

    // 1a. Crear orden de pedido al proveedor
    $rOrden = $this->withToken($token)
        ->postJson('/api/v1/recepciones/ordenes', [
            'proveedor' => 'Molinos del Norte',
        ])
        ->assertStatus(201);

    $ordenId = $rOrden->json('data.id');

    // Verificar: orden en estado pendiente
    expect($rOrden->json('data.estado'))->toBe('pendiente');

    auth()->forgetGuards();

    // 1b. Registrar la recepción física de los 100 kg
    $rRecepcion = $this->withToken($token)
        ->postJson("/api/v1/recepciones/ordenes/{$ordenId}/recepciones", [
            'items' => [[
                'materia_prima_id' => $mp->id,
                'cantidad'         => 100,
                'fecha_vencimiento'=> now()->addMonths(6)->toDateString(),
            ]],
        ])
        ->assertStatus(201);

    auth()->forgetGuards();

    // Verificar estado del inventario después de la recepción
    $bodegaPrincipal  = Bodega::where('tipo', 'principal')->first();
    $bodegaProduccion = Bodega::where('tipo', 'produccion')->first();
    $bodegaVentas     = Bodega::where('tipo', 'ventas')->first();

    $lotesMp = LoteMateriaPrima::where('materia_prima_id', $mp->id)->get();
    expect($lotesMp)->toHaveCount(1);
    expect((float) $lotesMp->first()->cantidad_actual)->toBe(100.0);
    expect($lotesMp->first()->bodega_id)->toBe($bodegaPrincipal->id);

    // Movimiento RECEPCION_ENTRADA generado
    expect(MovimientoInventario::where('tipo', MovimientoInventario::TIPO_RECEPCION_ENTRADA)->exists())->toBeTrue();

    // ─────────────────────────────────────────────────────────────────────────
    // ETAPA 2: INVENTARIO — Consultar stock antes de producir
    // ─────────────────────────────────────────────────────────────────────────

    $rStock = $this->withToken($token)
        ->getJson("/api/v1/inventario/stock/mp/{$mp->id}")
        ->assertStatus(200);

    auth()->forgetGuards();

    expect((float) $rStock->json('data.stock_total'))->toBe(100.0);
    expect($rStock->json('data.bajo_reorden'))->toBeFalse(); // 100 > punto_reorden(20)

    // ─────────────────────────────────────────────────────────────────────────
    // ETAPA 3: PRODUCCIÓN — Crear y ejecutar orden para 10 panes
    // ─────────────────────────────────────────────────────────────────────────

    // 3a. Crear orden de producción (necesita 10 × 0.5 kg = 5 kg)
    $rOrdenProd = $this->withToken($token)
        ->postJson('/api/v1/produccion/ordenes', [
            'producto_terminado_id' => $pt->id,
            'cantidad_planificada'  => 10,
            'fecha_planificada'     => now()->toDateString(),
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.estado', 'pendiente');

    $ordenProdId = $rOrdenProd->json('data.id');
    auth()->forgetGuards();

    // Stock antes de ejecutar: 100 kg
    expect((float) LoteMateriaPrima::where('materia_prima_id', $mp->id)->first()->cantidad_actual)->toBe(100.0);

    // 3b. Ejecutar producción — consume 5 kg de harina (FEFO)
    $this->withToken($token)
        ->postJson("/api/v1/produccion/ordenes/{$ordenProdId}/ejecutar", [
            'cantidad_producida' => 10,
        ])
        ->assertStatus(200)
        ->assertJsonPath('data.estado', 'producido');

    auth()->forgetGuards();

    // Verificar consumo de MP: 100 - 5 = 95 kg
    expect((float) LoteMateriaPrima::where('materia_prima_id', $mp->id)->first()->cantidad_actual)->toBe(95.0);

    // Lote PT creado en Bodega Producción con 10 unidades
    $lotePt = LoteProductoTerminado::where('producto_terminado_id', $pt->id)->first();
    expect($lotePt)->not->toBeNull();
    expect((float) $lotePt->cantidad_actual)->toBe(10.0);
    expect($lotePt->bodega_id)->toBe($bodegaProduccion->id);

    // Movimientos generados
    expect(MovimientoInventario::where('tipo', MovimientoInventario::TIPO_CONSUMO_MP)->exists())->toBeTrue();
    expect(MovimientoInventario::where('tipo', MovimientoInventario::TIPO_PRODUCCION_ENTRADA)->exists())->toBeTrue();

    // ─────────────────────────────────────────────────────────────────────────
    // ETAPA 4: TRASLADO PT — Bodega Producción → Bodega Ventas
    // ─────────────────────────────────────────────────────────────────────────

    $this->withToken($token)
        ->postJson("/api/v1/produccion/ordenes/{$ordenProdId}/traslado-pt")
        ->assertStatus(200)
        ->assertJsonPath('data.estado', 'completada');

    auth()->forgetGuards();

    // PT ahora en Bodega Ventas, disponible para despacho
    $lotePt->refresh();
    expect($lotePt->bodega_id)->toBe($bodegaVentas->id);
    expect($lotePt->estaDisponibleParaDespacho())->toBeTrue();

    // Movimientos de traslado PT generados
    expect(MovimientoInventario::where('tipo', MovimientoInventario::TIPO_TRASLADO_SALIDA)->exists())->toBeTrue();
    expect(MovimientoInventario::where('tipo', MovimientoInventario::TIPO_TRASLADO_ENTRADA)->exists())->toBeTrue();

    // ─────────────────────────────────────────────────────────────────────────
    // ETAPA 5: DESPACHO — Enviar 6 panes al cliente
    // ─────────────────────────────────────────────────────────────────────────

    $rDespacho = $this->withToken($token)
        ->postJson('/api/v1/despachos', [
            'lote_pt_id'         => $lotePt->id,
            'cantidad'           => 6,
            'referencia_cliente' => 'Cafetería Central',
        ])
        ->assertStatus(201);

    // PT restante: 10 - 6 = 4 unidades
    $lotePt->refresh();
    expect((float) $lotePt->cantidad_actual)->toBe(4.0);

    // Movimiento de despacho generado
    expect(MovimientoInventario::where('tipo', MovimientoInventario::TIPO_DESPACHO_SALIDA)->exists())->toBeTrue();

    // ─────────────────────────────────────────────────────────────────────────
    // ESTADO FINAL — Verificar trazabilidad completa (HU-027)
    // ─────────────────────────────────────────────────────────────────────────

    // Todos los tipos de movimiento esperados están presentes
    $tiposEsperados = [
        MovimientoInventario::TIPO_RECEPCION_ENTRADA,
        MovimientoInventario::TIPO_CONSUMO_MP,
        MovimientoInventario::TIPO_PRODUCCION_ENTRADA,
        MovimientoInventario::TIPO_TRASLADO_SALIDA,
        MovimientoInventario::TIPO_TRASLADO_ENTRADA,
        MovimientoInventario::TIPO_DESPACHO_SALIDA,
    ];

    foreach ($tiposEsperados as $tipo) {
        expect(MovimientoInventario::where('tipo', $tipo)->exists())
            ->toBeTrue("Falta movimiento de tipo: {$tipo}");
    }

    $totalMovimientos = MovimientoInventario::count();
    expect($totalMovimientos)->toBe(6); // exactamente 1 por cada etapa

    // Resumen del estado final del inventario
    expect((float) LoteMateriaPrima::where('materia_prima_id', $mp->id)->first()->cantidad_actual)->toBe(95.0);
    expect((float) LoteProductoTerminado::where('producto_terminado_id', $pt->id)->first()->cantidad_actual)->toBe(4.0);
    expect(Despacho::count())->toBe(1);
    expect(OrdenProduccion::where('estado', 'completada')->count())->toBe(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: FLUJO CON TRASLADO DE MP — Recepción → Traslado MP → Stock correcto
//
// Escenario: Se recibe MP, se traslada una parte a Bodega Producción
// para organización. El stock total de MP no cambia, solo su ubicación.
// ─────────────────────────────────────────────────────────────────────────────
test('flujo_traslado_mp_redistribuye_stock_entre_bodegas', function () {

    $role  = Role::where('nombre', Role::ENCARGADO_INVENTARIOS)->first();
    $user  = \App\Models\User::factory()->create(['role_id' => $role->id, 'activo' => true]);
    $token = $user->createToken('api-token')->plainTextToken;

    $unidadKg = UnidadMedida::where('nombre', 'kg')->first();
    $mp = MateriaPrima::create(['nombre' => 'Sal', 'unidad_medida_id' => $unidadKg->id, 'punto_reorden' => 5, 'activa' => true]);

    // Recepción de 80 kg en Bodega Principal
    $ordenId = $this->withToken($token)
        ->postJson('/api/v1/recepciones/ordenes', [
            'proveedor' => 'Salinas SA',
        ])->assertStatus(201)->json('data.id');

    auth()->forgetGuards();

    $this->withToken($token)
        ->postJson("/api/v1/recepciones/ordenes/{$ordenId}/recepciones", [
            'items' => [[
                'materia_prima_id' => $mp->id,
                'cantidad'         => 80,
            ]],
        ])->assertStatus(201);

    auth()->forgetGuards();

    $loteOrigen = LoteMateriaPrima::where('materia_prima_id', $mp->id)->first();
    expect((float) $loteOrigen->cantidad_actual)->toBe(80.0);

    // Trasladar 30 kg a Bodega Producción
    $bodegaProduccion = Bodega::where('tipo', 'produccion')->first();

    $rTraslado = $this->withToken($token)
        ->postJson('/api/v1/inventario/traslados', [
            'materia_prima_id' => $loteOrigen->materia_prima_id,
            'bodega_origen_id'  => $loteOrigen->bodega_id,
            'bodega_destino_id' => $bodegaProduccion->id,
            'cantidad'          => 30,
        ])->assertStatus(201);

    auth()->forgetGuards();

    // Stock en origen reducido: 80 - 30 = 50
    expect((float) $loteOrigen->fresh()->cantidad_actual)->toBe(50.0);

    // Nuevo lote creado en Bodega Producción con 30
    $loteDestino = LoteMateriaPrima::where('bodega_id', $bodegaProduccion->id)->first();
    expect((float) $loteDestino->cantidad_actual)->toBe(30.0);

    // Stock total via API no cambia (sigue siendo 80 entre las dos bodegas)
    $rStock = $this->withToken($token)
        ->getJson("/api/v1/inventario/stock/mp/{$mp->id}")
        ->assertStatus(200);

    expect((float) $rStock->json('data.stock_total'))->toBe(80.0);
    expect($rStock->json('data.por_bodega'))->toHaveCount(2); // aparece en 2 bodegas
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: INTEGRIDAD — No se puede producir si no hay stock suficiente
//
// Escenario: Se intenta producir con menos MP de la necesaria.
// El sistema debe rechazar sin modificar nada.
// ─────────────────────────────────────────────────────────────────────────────
test('flujo_produccion_rechazada_por_stock_insuficiente_no_modifica_inventario', function () {

    $role  = Role::where('nombre', Role::ENCARGADO_INVENTARIOS)->first();
    $user  = \App\Models\User::factory()->create(['role_id' => $role->id, 'activo' => true]);
    $token = $user->createToken('api-token')->plainTextToken;

    $unidadKg  = UnidadMedida::where('nombre', 'kg')->first();
    $unidadUnd = UnidadMedida::where('nombre', 'unidad')->first();

    $mp = MateriaPrima::create(['nombre' => 'Harina', 'unidad_medida_id' => $unidadKg->id, 'punto_reorden' => 5, 'activa' => true]);
    $pt = ProductoTerminado::create(['nombre' => 'Pan', 'unidad_medida_id' => $unidadUnd->id, 'activo' => true]);
    RelacionMpPt::create(['materia_prima_id' => $mp->id, 'producto_terminado_id' => $pt->id, 'cantidad_requerida' => 1.0, 'unidad_medida_id' => $unidadKg->id]);

    // Solo hay 3 kg disponibles, se intenta producir 10 panes (necesita 10 kg)
    $ordenId = $this->withToken($token)
        ->postJson('/api/v1/recepciones/ordenes', [
            'proveedor' => 'Test',
        ])->assertStatus(201)->json('data.id');

    auth()->forgetGuards();

    $this->withToken($token)
        ->postJson("/api/v1/recepciones/ordenes/{$ordenId}/recepciones", [
            'items' => [[
                'materia_prima_id' => $mp->id,
                'cantidad'         => 3,
            ]],
        ])->assertStatus(201);

    auth()->forgetGuards();

    // Intento de crear orden: debe fallar con 422 (stock insuficiente)
    $this->withToken($token)
        ->postJson('/api/v1/produccion/ordenes', [
            'producto_terminado_id' => $pt->id,
            'cantidad_planificada'  => 10,
            'fecha_planificada'     => now()->toDateString(),
        ])
        ->assertStatus(422)
        ->assertJsonPath('success', false);

    // El inventario NO debe haberse modificado
    expect((float) LoteMateriaPrima::where('materia_prima_id', $mp->id)->first()->cantidad_actual)->toBe(3.0);
    expect(LoteProductoTerminado::count())->toBe(0);
    expect(OrdenProduccion::count())->toBe(0);
    // Solo existe el movimiento de recepción, ningún otro
    expect(MovimientoInventario::count())->toBe(1);
});
