<?php

namespace App\Modules\Catalogo\Repositories\Contracts;

use App\Models\Proveedor;
use Illuminate\Database\Eloquent\Collection;

interface ProveedorRepositoryInterface
{
    public function all(): Collection;
    public function findById(int $id): ?Proveedor;
    public function create(array $data): Proveedor;
    public function update(Proveedor $proveedor, array $data): Proveedor;
    public function delete(Proveedor $proveedor): void;
    public function syncMateriasPrimas(Proveedor $proveedor, array $mpIds): void;
}
