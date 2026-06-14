<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cliente extends Model
{
    protected $table = 'clientes';

    protected $fillable = [
        'tipo',
        'nombre',
        'nit_cedula',
        'telefono',
        'email',
        'direccion',
        'contacto_nombre',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function despachos(): HasMany
    {
        return $this->hasMany(Despacho::class, 'cliente_id');
    }
}
