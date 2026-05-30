# Daluzed Pastelería — Backend API

**Proyecto Nuclear 3 · Corporación Universitaria Alexander von Humboldt (CUE)**

Sistema de gestión de inventario, producción y logística para Daluzed Pastelería.
Backend construido con **Laravel 12 + PHP 8.3 + Sanctum** siguiendo principios SOLID y arquitectura de Monolito Modular.

---

## Estado actual

| Módulo | Endpoints | Tests | Estado |
|--------|:---------:|:-----:|:------:|
| Autenticación + RBAC | 7 | 17 | ✅ |
| Catálogo (MP, PT, Bodegas, Presentaciones) | 18 | 18 | ✅ |
| Permisos dinámicos (matriz RBAC) | 4 | 13 | ✅ |
| Recepciones (órdenes de pedido + entrada MP) | 7 | 16 | ✅ |
| Inventario (stock + alertas + traslados) | 4 | 19 | ✅ |
| Producción (ciclo completo 4 etapas + FEFO) | 6 | 10 | ✅ |
| Despacho (salida PT a clientes) | 3 | 10 | ✅ |
| Reportes (KPIs + 4 reportes de gestión) | 5 | 10 | ✅ |
| **Total** | **54** | **113+** | ✅ |

---

## Requisitos

| Herramienta | Versión mínima |
|-------------|----------------|
| PHP | 8.3 |
| Composer | 2.x |
| MySQL | 8.0 |

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd IPN-DEV/backend

# 2. Instalar dependencias PHP
composer install

# 3. Configurar entorno
cp .env.example .env
# Editar .env con tus credenciales de MySQL

# 4. Generar clave de aplicación
php artisan key:generate

# 5. Crear la base de datos
mysql -u root -p -e "CREATE DATABASE inventario_logistica CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 6. Ejecutar migraciones y seeders
php artisan migrate --seed

# 7. Iniciar servidor de desarrollo
php artisan serve
# API disponible en: http://localhost:8000/api/v1
```

---

## Usuarios de prueba

| Email | Contraseña | Rol |
|-----------------------------|---------------|------------------------|
| admin@inventario.test | Admin1234! | administrador |
| gerencia@inventario.test | Gerencia1234! | gerencia |
| produccion@inventario.test | Prod1234! | jefe_produccion |
| inventarios@inventario.test | Inv1234! | encargado_inventarios |

---

## Ejecutar tests

```bash
# Suite completa
php artisan test

# Módulo específico
php artisan test tests/Feature/Auth/AuthTest.php
php artisan test tests/Feature/Produccion/ProduccionTest.php

# Test de integración E2E (flujo completo)
php artisan test tests/Feature/IntegracionTest.php

# Con cobertura (meta ≥ 70%)
php artisan test --coverage --min=70
```

---

## Flujo de negocio completo

```
1. RECEPCIÓN       POST /recepciones/ordenes + /recepciones/ordenes/{id}/recepciones
                   → MP llega a Bodega Principal, se crea lote con trazabilidad

2. INVENTARIO      GET /inventario/stock/mp  · GET /inventario/alertas
                   → Consulta de stock por bodega y alertas de reorden

3. TRASLADO MP     POST /inventario/traslados          (opcional — organización interna)
                   → Mueve MP entre bodegas con movimientos TRASLADO_SALIDA/ENTRADA

4. PRODUCCIÓN      POST /produccion/ordenes            → Etapa 1: crear orden
                   POST /produccion/ordenes/{id}/ejecutar → Etapa 2: consume MP (FEFO)
                   POST /produccion/ordenes/{id}/traslado-pt → Etapa 3: PT → Ventas

5. DESPACHO        POST /despachos
                   → PT sale de Bodega Ventas al cliente

6. REPORTES        GET /reportes/kpis · /produccion · /despachos · /movimientos · /stock-pt
                   → KPIs y trazabilidad completa (HU-027)
```

---

## Arquitectura

```
app/
├── Models/                     ← Modelos Eloquent (solo datos y relaciones)
├── Modules/
│   ├── Auth/                   ← Autenticación y gestión de usuarios
│   ├── Catalogo/               ← MP, PT, Bodegas, Presentaciones, Recetas
│   ├── Permisos/               ← Matriz RBAC dinámica (permissions / role_permissions)
│   ├── Recepciones/            ← Órdenes de pedido y entrada de MP
│   ├── Inventario/             ← Stock, alertas y traslados entre bodegas
│   ├── Produccion/             ← Ciclo productivo completo + FEFO
│   ├── Despacho/               ← Salida de PT hacia clientes
│   └── Reportes/               ← KPIs y reportes de gestión
│       └── {Modulo}/
│           ├── Controllers/    ← Solo HTTP: recibe, delega, responde
│           ├── Services/       ← Lógica de negocio (SRP)
│           ├── Repositories/   ← Persistencia, implementa interfaz (DIP)
│           │   └── Contracts/  ← Interfaces (ISP)
│           ├── Requests/       ← Validación de entrada
│           └── Resources/      ← DTO de salida (serialización JSON)
├── Providers/
│   └── AppServiceProvider.php  ← Bindings interface → implementación
└── Shared/
    ├── Middleware/
    │   ├── CheckRole.php        ← RBAC estático (role:administrador)
    │   └── CheckPermission.php ← RBAC dinámico (permission:recurso.accion)
    └── Traits/
        └── ApiResponseTrait.php ← Respuestas JSON estandarizadas
```

---

## Principios SOLID aplicados

| Principio | Aplicación concreta |
|-----------|---------------------|
| **SRP** | Controller solo orquesta HTTP; Service solo lógica de negocio; Repository solo BD |
| **OCP** | Nuevos módulos en `app/Modules/` sin modificar los existentes |
| **LSP** | Cada Repository implementa su interfaz completamente e intercambiable |
| **ISP** | Interfaces específicas por módulo — no hay interfaces "dios" |
| **DIP** | Services dependen de interfaces (Contracts), nunca de implementaciones concretas |

---

## Seguridad

- **Autenticación:** Laravel Sanctum (tokens Bearer)
- **RBAC estático:** middleware `role:administrador` para gestión de sistema
- **RBAC dinámico:** middleware `permission:recurso.accion` con caché de 60 min por rol
- **Transacciones:** todas las escrituras multi-tabla en `DB::transaction()` + `lockForUpdate()` (RFINV04)
- **Inmutabilidad:** los movimientos de inventario son append-only — las correcciones son movimientos compensatorios (HU-027)
- **FEFO:** selección del lote más próximo a vencer para consumo en producción (RFINV03)

---

## Documentación adicional

- **API completa:** [`API.md`](./API.md) — contrato detallado de todos los endpoints
- **Arquitectura:** [`CLAUDE.md`](./CLAUDE.md) — fuente de verdad del proyecto para agentes
- **ADRs:** `/.agents/docs/` — decisiones arquitectónicas registradas
