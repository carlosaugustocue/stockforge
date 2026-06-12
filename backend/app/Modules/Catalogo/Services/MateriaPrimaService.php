<?php

namespace App\Modules\Catalogo\Services;

use App\Models\MateriaPrima;
use App\Modules\Catalogo\Repositories\Contracts\MateriaPrimaRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use App\Modules\Catalogo\Imports\MateriasPrimasImport;

/**
 * MateriaPrimaService — Lógica de negocio del catálogo de materias primas.
 * HU-004, HU-005 — Gestión y consulta de materias primas.
 */
class MateriaPrimaService
{
    public function __construct(
        private readonly MateriaPrimaRepositoryInterface $repo
    ) {}

    public function listar(): Collection
    {
        return $this->repo->all();
    }

    public function obtener(int $id): MateriaPrima
    {
        $mp = $this->repo->findById($id);

        if (!$mp) {
            throw new \Exception('Materia prima no encontrada.', 404);
        }

        return $mp;
    }

    public function crear(array $data): MateriaPrima
    {
        return $this->repo->create($data);
    }

    public function actualizar(int $id, array $data): MateriaPrima
    {
        $mp = $this->obtener($id);
        return $this->repo->update($mp, $data);
    }

    public function desactivar(int $id): MateriaPrima
    {
        $mp = $this->obtener($id);
        return $this->repo->desactivar($mp);
    }

    /**
     * Importa materias primas desde un archivo Excel o CSV.
     * Valida fila a fila y retorna reporte de filas válidas/inválidas.
     * Nunca aborta el lote completo por un error en una fila (HU-008).
     *
     * @return array{importadas: int, errores: array}
     */
    public function importar(\Illuminate\Http\UploadedFile $archivo): array
    {
        $import = new MateriasPrimasImport();
        Excel::import($import, $archivo);

        return [
            'importadas' => $import->filasImportadas,
            'errores'    => $import->errores,
        ];
    }
}
