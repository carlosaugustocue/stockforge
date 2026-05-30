<?php

namespace App\Modules\Produccion\Services;

use App\Models\LoteMateriaPrima;
use Illuminate\Database\Eloquent\Collection;

/**
 * FefoService — First Expired, First Out (RFINV03)
 *
 * Encapsula la lógica de selección de lotes de materia prima para consumo.
 * Siempre se consume primero el lote más próximo a vencer.
 * Ante igualdad de fecha de vencimiento, se prefiere el lote más antiguo (fecha_ingreso ASC).
 * Los lotes sin fecha de vencimiento van al final (null last).
 *
 * Este servicio solo hace consultas — NO modifica stock.
 * La escritura ocurre en ProduccionService dentro de DB::transaction().
 */
class FefoService
{
    /**
     * Retorna los lotes disponibles para una MP en una bodega, ordenados por FEFO.
     * Solo incluye lotes con cantidad_actual > 0.
     */
    public function lotesDisponibles(int $materiaPrimaId, int $bodegaId): Collection
    {
        return LoteMateriaPrima::query()
            ->where('materia_prima_id', $materiaPrimaId)
            ->where('bodega_id', $bodegaId)
            ->where('cantidad_actual', '>', 0)
            ->orderByRaw('fecha_vencimiento IS NULL ASC') // null al final
            ->orderBy('fecha_vencimiento')
            ->orderBy('fecha_ingreso')
            ->get();
    }

    /**
     * Valida si hay stock suficiente de una MP en una bodega.
     * Retorna el déficit (negativo = falta stock, 0 = justo, positivo = sobra).
     */
    public function stockDisponible(int $materiaPrimaId, int $bodegaId): float
    {
        return (float) LoteMateriaPrima::query()
            ->where('materia_prima_id', $materiaPrimaId)
            ->where('bodega_id', $bodegaId)
            ->where('cantidad_actual', '>', 0)
            ->sum('cantidad_actual');
    }

    /**
     * Sugiere el primer lote FEFO para una MP (para el snapshot de planificación).
     */
    public function loteSugerido(int $materiaPrimaId, int $bodegaId): ?LoteMateriaPrima
    {
        return $this->lotesDisponibles($materiaPrimaId, $bodegaId)->first();
    }

    /**
     * Genera el plan de consumo de lotes FEFO para una cantidad requerida.
     * Retorna array de ['lote' => LoteMateriaPrima, 'cantidad_a_consumir' => float].
     * Lanza RuntimeException si el stock es insuficiente.
     *
     * @throws \RuntimeException con nombre de MP y cantidad faltante (RFPROD05)
     */
    public function planificarConsumo(
        int $materiaPrimaId,
        int $bodegaId,
        float $cantidadRequerida,
        string $nombreMp = 'MP'
    ): array {
        $lotes     = $this->lotesDisponibles($materiaPrimaId, $bodegaId);
        $pendiente = $cantidadRequerida;
        $plan      = [];

        foreach ($lotes as $lote) {
            if ($pendiente <= 0) break;

            $aConsumir = min((float) $lote->cantidad_actual, $pendiente);
            $plan[]    = ['lote' => $lote, 'cantidad_a_consumir' => $aConsumir];
            $pendiente -= $aConsumir;
        }

        if ($pendiente > 0.0001) { // tolerancia para decimales
            throw new \RuntimeException(json_encode([
                'materia_prima' => $nombreMp,
                'requerida'     => $cantidadRequerida,
                'disponible'    => round($cantidadRequerida - $pendiente, 3),
                'faltante'      => round($pendiente, 3),
            ]));
        }

        return $plan;
    }
}
