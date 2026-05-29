<?php

namespace App\Modules\Auth\Repositories;

use App\Models\User;
use App\Modules\Auth\Repositories\Contracts\UserRepositoryInterface;
use Carbon\Carbon;

/**
 * Implementación UserRepository
 *
 * Implementa el contrato definido en UserRepositoryInterface.
 * Esta clase se encarga SOLO de la persistencia de datos (SOLID-SRP).
 * NO contiene lógica de negocio — esa responsabilidad pertenece al AuthService.
 *
 * El binding interface -> implementación se configura en AppServiceProvider.
 */
class UserRepository implements UserRepositoryInterface
{
    /**
     * Retorna todos los usuarios con su relación de rol cargada.
     */
    public function all(): \Illuminate\Database\Eloquent\Collection
    {
        return User::with('role')->orderBy('name')->get();
    }

    /**
     * Busca un usuario por su ID con el rol cargado.
     */
    public function findById(int $id): ?User
    {
        return User::with('role')->find($id);
    }

    /**
     * Busca un usuario por email usando Eloquent.
     */
    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)->first();
    }

    /**
     * Crea un nuevo usuario con los datos proporcionados.
     */
    public function create(array $data): User
    {
        return User::create($data);
    }

    /**
     * Actualiza los datos de un usuario y retorna la instancia actualizada.
     */
    public function update(User $user, array $data): User
    {
        $user->update($data);
        return $user->fresh(); // Recarga desde BD para tener los datos actualizados
    }

    /**
     * Incrementa el contador de intentos fallidos en 1.
     * Usa increment() para una operación atómica en BD (evita race conditions).
     */
    public function incrementIntentosFallidos(User $user): void
    {
        $user->increment('intentos_fallidos');
    }

    /**
     * Reinicia el contador de intentos fallidos a 0.
     * También limpia la fecha de bloqueo si existía.
     */
    public function resetIntentosFallidos(User $user): void
    {
        $user->update([
            'intentos_fallidos' => 0,
            'bloqueado_hasta'   => null,
        ]);
    }

    /**
     * Establece la fecha de bloqueo de la cuenta.
     * Carbon::now()->addMinutes($minutos) calcula la fecha exacta de desbloqueo.
     */
    public function bloquearUsuario(User $user, int $minutos): void
    {
        $user->update([
            'bloqueado_hasta' => Carbon::now()->addMinutes($minutos),
        ]);
    }
}
