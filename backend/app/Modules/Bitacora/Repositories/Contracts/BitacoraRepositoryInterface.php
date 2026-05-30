<?php

namespace App\Modules\Bitacora\Repositories\Contracts;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * BitacoraRepositoryInterface — Contrato de persistencia para la bitácora de accesos.
 *
 * SOLID-ISP: interfaz específica al módulo, solo los métodos que necesita.
 * SOLID-DIP: el Service depende de esta interfaz, no de la implementación concreta.
 */
interface BitacoraRepositoryInterface
{
    /**
     * Retorna los registros de la bitácora con filtros opcionales, paginados.
     *
     * @param array{
     *     user_id?: int,
     *     accion?: string,
     *     desde?: string,
     *     hasta?: string,
     *     por_pagina?: int,
     * } $filtros
     */
    public function listar(array $filtros): LengthAwarePaginator;
}
