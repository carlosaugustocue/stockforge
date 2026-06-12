<?php

namespace App\Shared\OpenApi;

/**
 * @OA\Info(
 *     title="IPN-DEV — Sistema de Inventario Daluzed Pastelería",
 *     version="1.0.0",
 *     description="API REST para gestión de inventario, producción y logística de Daluzed Pastelería. Proyecto Nuclear 3 · Corporación Universitaria Alexander von Humboldt (CUE).",
 *     @OA\Contact(name="Equipo IPN-DEV", email="admin@inventario.test")
 * )
 *
 * @OA\Server(
 *     url="/api/v1",
 *     description="API v1"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="sanctum",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Token Bearer generado por Laravel Sanctum al hacer login. Incluirlo en el header: Authorization: Bearer {token}"
 * )
 *
 * @OA\Tag(name="Auth", description="Autenticación y gestión de usuarios")
 * @OA\Tag(name="Catálogo - Materias Primas", description="CRUD de materias primas")
 * @OA\Tag(name="Catálogo - Productos Terminados", description="CRUD de productos terminados y sus relaciones con MP")
 * @OA\Tag(name="Catálogo - Bodegas", description="CRUD de bodegas del sistema")
 * @OA\Tag(name="Catálogo - Presentaciones", description="Presentaciones de productos terminados")
 * @OA\Tag(name="Inventario", description="Consulta de stock, alertas de reorden y traslados entre bodegas")
 * @OA\Tag(name="Recepciones", description="Órdenes de pedido y entrada de materias primas")
 * @OA\Tag(name="Producción", description="Ciclo productivo completo con selección FEFO")
 * @OA\Tag(name="Despacho", description="Salida de productos terminados hacia clientes")
 * @OA\Tag(name="Reportes", description="KPIs y reportes de gestión")
 * @OA\Tag(name="Permisos", description="Gestión de la matriz RBAC dinámica")
 * @OA\Tag(name="Bitácora", description="Auditoría de accesos al sistema")
 */
class SwaggerDefinitions {}
