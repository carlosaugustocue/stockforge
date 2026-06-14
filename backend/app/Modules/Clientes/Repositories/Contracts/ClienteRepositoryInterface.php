<?php

namespace App\Modules\Clientes\Repositories\Contracts;

use App\Models\Cliente;
use Illuminate\Database\Eloquent\Collection;

interface ClienteRepositoryInterface
{
    public function todos(): Collection;
    public function porId(int $id): ?Cliente;
    public function crear(array $data): Cliente;
    public function actualizar(int $id, array $data): Cliente;
    public function eliminar(int $id): void;
    public function buscar(string $q): Collection;
}
