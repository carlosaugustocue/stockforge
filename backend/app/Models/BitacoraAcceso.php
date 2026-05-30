<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * BitacoraAcceso — Modelo de auditoría de accesos al sistema.
 *
 * Tabla INMUTABLE: solo se insertan registros, nunca se modifican ni eliminan.
 * Registra: login_exitoso, login_fallido, logout, cuenta_bloqueada (RFAUT01).
 */
class BitacoraAcceso extends Model
{
    protected $table = 'bitacora_accesos';

    /** Tabla inmutable — sin updated_at */
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'accion',
        'ip_address',
        'user_agent',
    ];

    // ── Constantes de acciones registradas ───────────────────────────────────

    const ACCION_LOGIN_EXITOSO    = 'login_exitoso';
    const ACCION_LOGIN_FALLIDO    = 'login_fallido';
    const ACCION_LOGOUT           = 'logout';
    const ACCION_CUENTA_BLOQUEADA = 'cuenta_bloqueada';

    // ── Relaciones ────────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
