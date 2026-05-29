<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Presentacion extends Model
{
    protected $table = 'presentaciones';

    protected $fillable = [
        'producto_terminado_id',
        'nombre',
        'unidades_por_presentacion',
        'activa',
    ];

    protected function casts(): array
    {
        return [
            'unidades_por_presentacion' => 'decimal:3',
            'activa'                    => 'boolean',
        ];
    }

    public function productoTerminado(): BelongsTo
    {
        return $this->belongsTo(ProductoTerminado::class);
    }
}
