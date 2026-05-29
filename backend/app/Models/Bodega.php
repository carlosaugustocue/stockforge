<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bodega extends Model
{
    protected $fillable = [
        'nombre',
        'descripcion',
        'tipo',
        'activa',
    ];

    protected function casts(): array
    {
        return [
            'activa' => 'boolean',
        ];
    }

    public function esPrincipal(): bool
    {
        return $this->tipo === 'principal';
    }

    public function esProduccion(): bool
    {
        return $this->tipo === 'produccion';
    }
}
