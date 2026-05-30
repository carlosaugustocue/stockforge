<?php

namespace App\Modules\Despacho\Repositories\Contracts;

use App\Models\Despacho;
use Illuminate\Database\Eloquent\Collection;

interface DespachoRepositoryInterface
{
    public function todos(): Collection;

    public function porId(int $id): ?Despacho;

    public function crear(array $data): Despacho;
}
