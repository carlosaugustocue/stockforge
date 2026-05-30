<?php

namespace App\Providers;

use App\Modules\Auth\Repositories\Contracts\UserRepositoryInterface;
use App\Modules\Auth\Repositories\UserRepository;
use App\Modules\Catalogo\Repositories\Contracts\MateriaPrimaRepositoryInterface;
use App\Modules\Permisos\Repositories\Contracts\PermissionRepositoryInterface;
use App\Modules\Permisos\Repositories\PermissionRepository;
use App\Modules\Inventario\Repositories\Contracts\InventarioRepositoryInterface;
use App\Modules\Inventario\Repositories\InventarioRepository;
use App\Modules\Produccion\Repositories\Contracts\ProduccionRepositoryInterface;
use App\Modules\Produccion\Repositories\ProduccionRepository;
use App\Modules\Recepciones\Repositories\Contracts\RecepcionRepositoryInterface;
use App\Modules\Recepciones\Repositories\RecepcionRepository;
use App\Modules\Despacho\Repositories\Contracts\DespachoRepositoryInterface;
use App\Modules\Despacho\Repositories\DespachoRepository;
use App\Modules\Reportes\Repositories\Contracts\ReportesRepositoryInterface;
use App\Modules\Reportes\Repositories\ReportesRepository;
use App\Modules\Catalogo\Repositories\Contracts\ProductoTerminadoRepositoryInterface;
use App\Modules\Catalogo\Repositories\Contracts\BodegaRepositoryInterface;
use App\Modules\Catalogo\Repositories\Contracts\PresentacionRepositoryInterface;
use App\Modules\Catalogo\Repositories\Contracts\RelacionMpPtRepositoryInterface;
use App\Modules\Catalogo\Repositories\MateriaPrimaRepository;
use App\Modules\Catalogo\Repositories\ProductoTerminadoRepository;
use App\Modules\Catalogo\Repositories\BodegaRepository;
use App\Modules\Catalogo\Repositories\PresentacionRepository;
use App\Modules\Catalogo\Repositories\RelacionMpPtRepository;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Registra los bindings del contenedor de dependencias.
     *
     * Aquí se aplica SOLID-DIP (Dependency Inversion Principle):
     * Se enlaza la interfaz con su implementación concreta.
     * Cuando el framework inyecte UserRepositoryInterface en cualquier clase,
     * entregará automáticamente una instancia de UserRepository.
     *
     * Si en el futuro se cambia la BD (ej. MongoDB), solo se cambia esta línea.
     */
    public function register(): void
    {
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(MateriaPrimaRepositoryInterface::class, MateriaPrimaRepository::class);
        $this->app->bind(ProductoTerminadoRepositoryInterface::class, ProductoTerminadoRepository::class);
        $this->app->bind(BodegaRepositoryInterface::class, BodegaRepository::class);
        $this->app->bind(PresentacionRepositoryInterface::class, PresentacionRepository::class);
        $this->app->bind(RelacionMpPtRepositoryInterface::class, RelacionMpPtRepository::class);
        $this->app->bind(PermissionRepositoryInterface::class, PermissionRepository::class);
        $this->app->bind(InventarioRepositoryInterface::class, InventarioRepository::class);
        $this->app->bind(ProduccionRepositoryInterface::class, ProduccionRepository::class);
        $this->app->bind(RecepcionRepositoryInterface::class, RecepcionRepository::class);
        $this->app->bind(DespachoRepositoryInterface::class, DespachoRepository::class);
        $this->app->bind(ReportesRepositoryInterface::class, ReportesRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
