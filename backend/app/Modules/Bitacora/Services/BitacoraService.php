<?php

namespace App\Modules\Bitacora\Services;

use App\Modules\Bitacora\Repositories\Contracts\BitacoraRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * BitacoraService — Lógica de consulta de la bitácora de accesos.
 *
 * SOLID-SRP: encapsula la lógica de negocio del módulo Bitácora.
 * SOLID-DIP: depende de la interfaz, no de la implementación concreta.
 */
class BitacoraService
{
    public function __construct(
        private readonly BitacoraRepositoryInterface $repo,
    ) {}

    /**
     * Retorna los registros de la bitácora filtrados y paginados.
     * Solo el administrador tiene acceso a este módulo (middleware role:administrador).
     *
     * Filtros disponibles: user_id, accion, desde (date), hasta (date), por_pagina.
     */
    public function listar(array $filtros): LengthAwarePaginator
    {
        return $this->repo->listar($filtros);
    }
}
