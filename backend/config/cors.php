<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing (CORS)
|--------------------------------------------------------------------------
|
| Configuración de CORS para permitir que el frontend Next.js (localhost:3000)
| pueda consumir esta API sin restricciones de origen cruzado.
|
| En producción se debe cambiar 'allowed_origins' al dominio real del frontend.
|
*/

return [

    // Rutas de la API que aceptan peticiones CORS
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    // Métodos HTTP permitidos
    'allowed_methods' => ['*'],

    // Orígenes permitidos — se configura via CORS_ALLOWED_ORIGINS en .env
    'allowed_origins' => array_filter(array_map('trim', explode(',',
        env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')
    ))),

    // Patrón automático para Vercel — set CORS_VERCEL_SUFFIX al sufijo estable
    // ej: CORS_VERCEL_SUFFIX=carlos-augustos-projects-89120cac.vercel.app
    // cubre todas las URLs preview: stockforge-{hash}-{sufijo}
    'allowed_origins_patterns' => array_filter([
        env('CORS_VERCEL_SUFFIX')
            ? '#^https://[a-z0-9-]+\.' . preg_quote(env('CORS_VERCEL_SUFFIX'), '#') . '$#'
            : null,
    ]),

    // Headers que el cliente puede enviar
    'allowed_headers' => ['*'],

    // Headers que el cliente puede leer en la respuesta
    'exposed_headers' => [],

    // Tiempo de caché del preflight request (en segundos)
    'max_age' => 0,

    // Permite el envío de cookies con las peticiones (necesario para Sanctum SPA)
    'supports_credentials' => true,

];
