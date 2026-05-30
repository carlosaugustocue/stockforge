<?php

namespace App\Modules\Bitacora\Repositories;

use App\Models\BitacoraAcceso;
use App\Modules\Bitacora\Repositories\Contracts\BitacoraRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * BitacoraRepository — Persistencia de la bitácora de accesos.
 *
 * SOLID-SRP: solo consultas a BD, sin lógica de negocio.
 * Implementa BitacoraRepositoryInterface (SOLID-DIP / LSP).
 */
class BitacoraRepository implements BitacoraRepositoryInterface
{
    public function listar(array $filtros): LengthAwarePaginator
    {
        $query = BitacoraAcceso::with('user:id,name,email')
            ->orderBy('created_at', 'desc');

        if (! empty($filtros['user_id'])) {
            $query->where('user_id', $filtros['user_id']);
        }

        if (! empty($filtros['accion'])) {
            $query->where('accion', $filtros['accion']);
        }

        if (! empty($filtros['desde'])) {
            $query->whereDate('created_at', '>=', $filtros['desde']);
        }

        if (! empty($filtros['hasta'])) {
            $query->whereDate('created_at', '<=', $filtros['hasta']);
        }

        $porPagina = min((int) ($filtros['por_pagina'] ?? 50), 100);

        return $query->paginate($porPagina);
    }
}
