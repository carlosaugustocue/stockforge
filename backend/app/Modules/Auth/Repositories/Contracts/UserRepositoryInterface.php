<?php

namespace App\Modules\Auth\Repositories\Contracts;

use App\Models\User;

/**
 * Interface UserRepositoryInterface
 *
 * Define el contrato (interfaz) que debe cumplir cualquier implementación
 * del repositorio de usuarios.
 *
 * POR QUÉ usamos interface (Principio SOLID - DIP):
 * El Dependency Inversion Principle establece que los módulos de alto nivel
 * (AuthService) no deben depender de módulos de bajo nivel (UserRepository),
 * sino de abstracciones (esta interfaz).
 *
 * Esto permite cambiar la implementación del repositorio (por ejemplo, pasar
 * de MySQL a MongoDB) sin modificar el AuthService que la consume.
 *
 * En AppServiceProvider se enlaza esta interfaz con su implementación concreta.
 */
interface UserRepositoryInterface
{
    /**
     * Retorna todos los usuarios con su relación de rol cargada.
     */
    public function all(): \Illuminate\Database\Eloquent\Collection;

    /**
     * Busca un usuario por su ID.
     * Retorna null si no existe.
     */
    public function findById(int $id): ?User;

    /**
     * Busca un usuario por su dirección de correo electrónico.
     * Retorna null si no existe (evita lanzar excepciones innecesarias).
     */
    public function findByEmail(string $email): ?User;

    /**
     * Crea un nuevo usuario en la base de datos.
     */
    public function create(array $data): User;

    /**
     * Actualiza los atributos de un usuario existente.
     */
    public function update(User $user, array $data): User;

    /**
     * Incrementa el contador de intentos de login fallidos.
     * Usado en el flujo de bloqueo automático (RFAUT01).
     */
    public function incrementIntentosFallidos(User $user): void;

    /**
     * Reinicia a cero el contador de intentos fallidos.
     * Se llama cuando el login es exitoso.
     */
    public function resetIntentosFallidos(User $user): void;

    /**
     * Bloquea la cuenta del usuario durante N minutos.
     * Se activa cuando se alcanzan 5 intentos fallidos (RFAUT01).
     */
    public function bloquearUsuario(User $user, int $minutos): void;
}
