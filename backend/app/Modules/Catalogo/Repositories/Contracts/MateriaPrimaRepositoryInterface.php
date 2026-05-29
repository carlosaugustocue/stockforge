<?php

namespace App\Modules\Catalogo\Repositories\Contracts;

use App\Models\MateriaPrima;
use Illuminate\Database\Eloquent\Collection;

interface MateriaPrimaRepositoryInterface
{
    public function all(): Collection;
    public function findById(int $id): ?MateriaPrima;
    public function create(array $data): MateriaPrima;
    public function update(MateriaPrima $mp, array $data): MateriaPrima;
    public function desactivar(MateriaPrima $mp): MateriaPrima;
}
