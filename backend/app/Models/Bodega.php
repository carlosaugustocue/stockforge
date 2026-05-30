<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    public function lotesMateriaPrima(): HasMany
    {
        return $this->hasMany(LoteMateriaPrima::class);
    }

    public function lotesProductoTerminado(): HasMany
    {
        return $this->hasMany(LoteProductoTerminado::class);
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class);
    }

    public function esPrincipal(): bool
    {
        return $this->tipo === 'principal';
    }

    public function esProduccion(): bool
    {
        return $this->tipo === 'produccion';
    }

    public function esVentas(): bool
    {
        return $this->tipo === 'ventas';
    }
}
