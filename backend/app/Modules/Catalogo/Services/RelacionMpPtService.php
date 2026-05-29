<?php

namespace App\Modules\Catalogo\Services;

use App\Models\RelacionMpPt;
use App\Modules\Catalogo\Repositories\Contracts\RelacionMpPtRepositoryInterface;
use App\Modules\Catalogo\Repositories\Contracts\ProductoTerminadoRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * RelacionMpPtService — Gestión de la asociación MP ↔ PT.
 * HU-006 — Asociar materias primas a productos terminados con cantidad de consumo.
 *
 * NOTA: Solo se almacena la cantidad consumida por unidad producida.
 * Nunca se almacena la fórmula ni los pasos de producción (RNF-SEC-06).
 */
class RelacionMpPtService
{
    public function __construct(
        private readonly RelacionMpPtRepositoryInterface $repo,
        private readonly ProductoTerminadoRepositoryInterface $repoProducto
    ) {}

    public function listarPorProducto(int $productoId): Collection
    {
        if (!$this->repoProducto->findById($productoId)) {
            throw new \Exception('Producto terminado no encontrado.', 404);
        }

        return $this->repo->allByProducto($productoId);
    }

    public function asociar(int $productoId, array $data): RelacionMpPt
    {
        if (!$this->repoProducto->findById($productoId)) {
            throw new \Exception('Producto terminado no encontrado.', 404);
        }

        // Verificar que la relación no exista ya
        $existe = $this->repo->findByProductoYMp($productoId, $data['materia_prima_id']);
        if ($existe) {
            throw new \Exception('Esta materia prima ya está asociada al producto. Use PATCH para actualizar la cantidad.', 409);
        }

        return $this->repo->create(array_merge($data, ['producto_terminado_id' => $productoId]));
    }

    public function actualizar(int $productoId, int $mpId, array $data): RelacionMpPt
    {
        $relacion = $this->repo->findByProductoYMp($productoId, $mpId);

        if (!$relacion) {
            throw new \Exception('Relación MP-PT no encontrada.', 404);
        }

        return $this->repo->update($relacion, $data);
    }

    public function desasociar(int $productoId, int $mpId): void
    {
        $relacion = $this->repo->findByProductoYMp($productoId, $mpId);

        if (!$relacion) {
            throw new \Exception('Relación MP-PT no encontrada.', 404);
        }

        $this->repo->eliminar($relacion);
    }
}
