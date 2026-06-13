<?php

namespace App\Modules\Inventario\Repositories\Contracts;

use App\Models\LoteMateriaPrima;
use App\Models\MateriaPrima;
use Illuminate\Database\Eloquent\Collection;

/**
 * Contrato del repositorio de inventario.
 * Operaciones de consulta de stock, alertas y traslados de MP.
 */
interface InventarioRepositoryInterface
{
    /** Todas las MP activas con sus lotes activos por bodega. */
    public function stockMateriaPrima(): Collection;

    /** Una MP con sus lotes activos por bodega. */
    public function stockMateriaPrimaPorId(int $id): ?MateriaPrima;

    /** MP activas cuyo stock total es menor al punto de reorden. */
    public function materiasprimasBajoReorden(): Collection;

    /** Lote de MP por ID con bodega cargada. */
    public function lotePorId(int $id): ?LoteMateriaPrima;

    /** Lote más próximo a vencer (FEFO) de una MP en una bodega específica. */
    public function loteFefoEnBodega(int $mpId, int $bodegaId): ?LoteMateriaPrima;
}
