<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnidadMedida extends Model
{
    protected $table = 'unidades_medida';

    protected $fillable = [
        'nombre',
        'descripcion',
    ];

    public function materiasPrimas(): HasMany
    {
        return $this->hasMany(MateriaPrima::class);
    }

    public function productosTerminados(): HasMany
    {
        return $this->hasMany(ProductoTerminado::class);
    }
}
