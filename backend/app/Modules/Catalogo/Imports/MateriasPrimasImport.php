<?php

namespace App\Modules\Catalogo\Imports;

use App\Models\MateriaPrima;
use App\Models\UnidadMedida;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

/**
 * MateriasPrimasImport — Importador de materias primas desde Excel/CSV.
 *
 * Valida fila a fila y reporta errores sin abortar el lote completo (HU-008).
 *
 * Columnas esperadas en el archivo:
 *   nombre | descripcion | unidad_medida | punto_reorden
 *
 * La columna 'unidad_medida' debe contener el nombre corto (ej: "kg", "L").
 */
class MateriasPrimasImport implements ToCollection, WithHeadingRow
{
    public int $filasImportadas = 0;
    public array $errores = [];

    public function collection(Collection $filas): void
    {
        foreach ($filas as $indice => $fila) {
            $numero = $indice + 2; // +2 porque la fila 1 es el encabezado

            $datos = [
                'nombre'        => $fila['nombre'] ?? null,
                'descripcion'   => $fila['descripcion'] ?? null,
                'unidad_medida' => $fila['unidad_medida'] ?? null,
                'punto_reorden' => $fila['punto_reorden'] ?? 0,
            ];

            $validacion = Validator::make($datos, [
                'nombre'        => 'required|string|max:150',
                'unidad_medida' => 'required|string',
                'punto_reorden' => 'numeric|min:0',
            ], [
                'nombre.required'        => 'El nombre es obligatorio.',
                'unidad_medida.required' => 'La unidad de medida es obligatoria.',
                'punto_reorden.numeric'  => 'El punto de reorden debe ser un número.',
            ]);

            if ($validacion->fails()) {
                $this->errores[] = [
                    'fila'   => $numero,
                    'nombre' => $datos['nombre'] ?? '(vacío)',
                    'errores' => $validacion->errors()->all(),
                ];
                continue;
            }

            // Buscar la unidad de medida por nombre corto
            $unidad = UnidadMedida::where('nombre', $datos['unidad_medida'])->first();

            if (!$unidad) {
                $this->errores[] = [
                    'fila'    => $numero,
                    'nombre'  => $datos['nombre'],
                    'errores' => ["Unidad de medida '{$datos['unidad_medida']}' no existe en el sistema."],
                ];
                continue;
            }

            // Verificar si ya existe (por nombre) — actualiza si existe, crea si no
            MateriaPrima::updateOrCreate(
                ['nombre' => $datos['nombre']],
                [
                    'descripcion'     => $datos['descripcion'],
                    'unidad_medida_id' => $unidad->id,
                    'punto_reorden'   => $datos['punto_reorden'],
                    'activa'          => true,
                ]
            );

            $this->filasImportadas++;
        }
    }
}
