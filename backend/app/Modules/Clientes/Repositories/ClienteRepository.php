<?php

namespace App\Modules\Clientes\Repositories;

use App\Models\Cliente;
use App\Modules\Clientes\Repositories\Contracts\ClienteRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class ClienteRepository implements ClienteRepositoryInterface
{
    public function todos(): Collection
    {
        return Cliente::orderBy('nombre')->get();
    }

    public function porId(int $id): ?Cliente
    {
        return Cliente::find($id);
    }

    public function crear(array $data): Cliente
    {
        return Cliente::create($data);
    }

    public function actualizar(int $id, array $data): Cliente
    {
        $cliente = Cliente::findOrFail($id);
        $cliente->update($data);
        return $cliente->fresh();
    }

    public function eliminar(int $id): void
    {
        Cliente::findOrFail($id)->delete();
    }

    public function buscar(string $q): Collection
    {
        return Cliente::where('activo', true)
            ->where(function ($query) use ($q) {
                $query->where('nombre', 'like', "%{$q}%")
                      ->orWhere('nit_cedula', 'like', "%{$q}%")
                      ->orWhere('email', 'like', "%{$q}%");
            })
            ->orderBy('nombre')
            ->limit(20)
            ->get();
    }
}
