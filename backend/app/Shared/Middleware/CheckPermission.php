<?php

namespace App\Shared\Middleware;

use App\Shared\Traits\ApiResponseTrait;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware CheckPermission — Control de acceso basado en permisos dinámicos (RBAC BD).
 *
 * Verifica que el rol del usuario autenticado tenga el permiso solicitado,
 * consultando la tabla `role_permissions` (con caché de 60 minutos por rol).
 *
 * Se registra en bootstrap/app.php con el alias 'permission'.
 * Uso en rutas: Route::middleware('permission:materias_primas.escribir')
 *
 * La caché se invalida automáticamente al modificar `role_permissions`
 * (responsabilidad del PermissionService).
 *
 * Implementa el principio de menor privilegio (RNFSEC-04).
 */
class CheckPermission
{
    use ApiResponseTrait;

    /**
     * Duración de la caché de permisos por rol (segundos).
     * 3600 = 60 minutos.
     */
    private const CACHE_TTL = 3600;

    /**
     * Procesa la petición HTTP.
     *
     * @param  Request  $request         Petición entrante
     * @param  Closure  $next            Siguiente middleware/controller
     * @param  string   $permiso         Slug del permiso requerido (recurso.accion)
     */
    public function handle(Request $request, Closure $next, string $permiso): Response
    {
        $user = $request->user();

        if (! $user || ! $user->role_id) {
            return $this->errorResponse('No tienes permisos para realizar esta acción.', 403);
        }

        $roleId = $user->role_id;

        // Cargar permisos del rol desde caché — evita N queries por petición
        $permisosDelRol = Cache::remember(
            "permisos_rol_{$roleId}",
            self::CACHE_TTL,
            fn () => $user->role->permissions->pluck('nombre')->all()
        );

        if (in_array($permiso, $permisosDelRol, strict: true)) {
            return $next($request);
        }

        return $this->errorResponse('No tienes permisos para realizar esta acción.', 403);
    }
}
