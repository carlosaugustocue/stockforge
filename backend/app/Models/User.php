<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Modelo User
 *
 * Extiende el Authenticatable de Laravel e incorpora HasApiTokens de Sanctum
 * para la autenticación mediante tokens de API (RFAUT01).
 *
 * Los campos sensibles (password, remember_token, intentos_fallidos) están
 * ocultos para que nunca viajen en respuestas JSON al cliente (RNFSEC-01).
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * Atributos que se pueden asignar masivamente.
     * Se usa la propiedad $fillable explícita (no atributos PHP8) para mayor
     * legibilidad en el informe del proyecto.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'activo',
        'intentos_fallidos',
        'bloqueado_hasta',
    ];

    /**
     * Atributos ocultos — NUNCA se serializan en respuestas JSON.
     * Esto cumple RNFSEC-01: protección de información sensible.
     */
    protected $hidden = [
        'password',
        'remember_token',
        'intentos_fallidos', // El cliente no necesita saber cuántos intentos lleva
        'bloqueado_hasta',   // No exponer la fecha de bloqueo en respuestas JSON (RNFSEC-01)
    ];

    /**
     * Casting de atributos para manejo automático de tipos.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'activo'            => 'boolean',
            'bloqueado_hasta'   => 'datetime',
        ];
    }

    // -----------------------------------------------------------------------
    // Relaciones
    // -----------------------------------------------------------------------

    /**
     * Un usuario pertenece a un rol.
     * Relación: User -> belongsTo -> Role
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    // -----------------------------------------------------------------------
    // Métodos helper de dominio
    // -----------------------------------------------------------------------

    /**
     * Verifica si el usuario tiene un rol específico.
     * Se usa Role::CONSTANTE para evitar "magic strings" en el código.
     *
     * Ejemplo: $user->hasRole(Role::ADMINISTRADOR)
     */
    public function hasRole(string $role): bool
    {
        return $this->role?->nombre === $role;
    }

    /**
     * Verifica si la cuenta está actualmente bloqueada.
     * La cuenta está bloqueada si bloqueado_hasta es una fecha futura.
     * Cumple RFAUT01: bloqueo tras 5 intentos fallidos.
     */
    public function estaBloqueado(): bool
    {
        return $this->bloqueado_hasta !== null && $this->bloqueado_hasta->isFuture();
    }
}
