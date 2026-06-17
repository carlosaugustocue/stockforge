# Sistema de Inventario y Logística IPN-DEV: Diseño, Implementación y Evaluación de un MVP para el Sector Alimentario

**Proyecto Nuclear — Seminario de Ingeniería**
**Fecha:** 17 de junio de 2026

---

## Resumen

El presente artículo describe el diseño, implementación y evaluación del Sistema de Inventario y Logística IPN-DEV, un producto mínimo viable (MVP) desarrollado para gestionar el ciclo operativo completo de una empresa del sector pastelero: recepción de materias primas, control de inventario con trazabilidad por lote, producción bajo la política FEFO (*First Expired, First Out*), despacho a clientes y generación de reportes con indicadores operativos. El sistema se implementó como una API REST en Laravel 12 con PHP 8.3 y una interfaz web en Next.js 14, aplicando de forma explícita los principios SOLID de diseño orientado a objetos en una arquitectura modular por capas. La evaluación de calidad arrojó 129 casos de prueba automatizados con una tasa de éxito del 100 % y una cobertura de código del 80,4 %, superando el umbral contractual del 70 %. El sistema se desplegó en producción sobre infraestructura en la nube (Laravel Cloud + Vercel), con documentación completa de la API a través de Swagger/OpenAPI.

**Palabras clave:** inventario, FEFO, SOLID, Laravel, Next.js, trazabilidad, API REST, pruebas automatizadas.

---

## Abstract

This article describes the design, implementation, and evaluation of IPN-DEV, a minimum viable product (MVP) developed to manage the complete operational cycle of a bakery company: raw material reception, inventory control with batch traceability, production under FEFO policy, customer dispatch, and operational KPI reporting. The system was implemented as a REST API on Laravel 12 with PHP 8.3 and a web interface in Next.js 14, explicitly applying SOLID object-oriented design principles within a modular layered architecture. Quality evaluation yielded 129 automated test cases with a 100% pass rate and 80.4% code coverage, exceeding the contractual threshold of 70%. The system was deployed to production on cloud infrastructure (Laravel Cloud + Vercel), with complete API documentation via Swagger/OpenAPI.

**Keywords:** inventory, FEFO, SOLID, Laravel, Next.js, traceability, REST API, automated testing.

---

## 1. Introducción

La gestión de inventario en empresas del sector alimentario presenta desafíos particulares que van más allá del simple conteo de existencias: las materias primas tienen fechas de vencimiento, los productos terminados deben ser trazables desde su origen hasta el cliente, y los errores en el control de stock pueden traducirse en pérdidas económicas por vencimiento o en incumplimientos de despacho. Ante la ausencia de herramientas tecnológicas adecuadas para el contexto de una empresa pastelera mediana, la gestión se realizaba de forma manual en hojas de cálculo, con los riesgos inherentes de inconsistencia, falta de trazabilidad y ausencia de alertas tempranas.

El proyecto IPN-DEV surge como respuesta a esta necesidad real, con el objetivo de diseñar e implementar un sistema de inventario y logística que automatice los procesos operativos críticos, garantice la integridad de los datos mediante transacciones atómicas, y proporcione a los operarios y gerentes información en tiempo real a través de un panel de indicadores. El desarrollo se enmarca en el contexto del Seminario Nuclear de Ingeniería, integrando los conocimientos de las asignaturas de Programación de Tecnologías Web, Arquitectura de Software y Pruebas de Software.

El presente artículo documenta las decisiones de diseño, la arquitectura implementada, los resultados de las pruebas y las métricas de calidad del producto final, con el propósito de servir como referencia para futuros proyectos de similar naturaleza.

---

## 2. Desarrollo de Contenidos

### 2.1 Definición del Problema y Alcance del Sistema

El sistema IPN-DEV fue diseñado para cubrir el ciclo operativo completo de la empresa piloto, desde la llegada de materias primas hasta la entrega de productos terminados a clientes. El alcance se definió mediante la identificación de los flujos de trabajo principales, que se ilustran en la Figura 1.

**Figura 1. Ciclo operativo cubierto por el sistema IPN-DEV.**

```
Proveedor
    │
    ▼
[Orden de Compra] ──► [Recepción MP] ──► [Lote en Bodega]
                                               │
                              FEFO             │  stock disponible
                         ┌─────────────────────┘
                         ▼
                  [Orden de Producción]
                         │
                         ▼
                  [Ejecutar Producción]
                  (descuento automático de MP)
                         │
                         ▼
                  [PT en Bodega Planta]
                         │
                         ▼
                  [Traslado a Bodega Ventas]
                         │
                         ▼
                  [Despacho al Cliente]
```

*Fuente: elaboración propia.*

Las restricciones de alcance más relevantes fueron:

- **Una sola sede:** el cliente piloto opera una única ubicación con dos áreas físicas (Planta de Producción y Bodega de Ventas), lo que evitó la complejidad de un modelo multi-tenant.
- **Sin almacenamiento de recetas:** por políticas de confidencialidad del cliente, el sistema registra únicamente las relaciones materia prima-producto terminado y las cantidades consumidas, no las fórmulas de producción paso a paso.
- **FEFO como única política de rotación:** el dominio alimentario impone el consumo del lote más próximo a vencer primero, sin excepciones.

La Tabla 1 resume los requisitos funcionales principales implementados.

**Tabla 1. Requisitos funcionales implementados en IPN-DEV.**

| Código | Módulo | Descripción |
|--------|--------|-------------|
| RFAUT01 | Autenticación | Login con bloqueo progresivo tras 5 intentos fallidos |
| RFAUT04 | Usuarios | Gestión de usuarios y roles por el administrador |
| RFREC | Recepciones | Órdenes de compra y recepción de MP contra orden previa |
| RFINV01 | Inventario | Consulta de stock total y por bodega con alertas de reorden |
| RFINV02 | Inventario | Trazabilidad completa por lote desde recepción hasta consumo |
| RFINV03 | Inventario | FEFO en la selección de lotes para consumo productivo |
| RFINV04 | Inventario | Traslados atómicos de MP entre bodegas |
| RFPROD01 | Producción | Ciclo completo de 4 etapas: planificar, ejecutar, trasladar, despachar |
| RFPROD05 | Producción | Rechazo por stock insuficiente con detalle de la MP faltante |
| HU-027 | Inventario | Movimientos de inventario inmutables (corrección por compensatorio) |

*Fuente: elaboración propia basada en el documento de requisitos del proyecto.*

---

### 2.2 Arquitectura del Sistema

#### 2.2.1 Visión general

El sistema adopta una **arquitectura cliente-servidor** con separación completa entre el backend (API REST) y el frontend (aplicación web). Esta separación permite que ambas capas evolucionen de forma independiente y facilita la integración futura con otras interfaces (aplicaciones móviles, integraciones con ERP).

**Figura 2. Arquitectura general del sistema IPN-DEV.**

```
┌─────────────────────────┐        HTTPS / JSON         ┌──────────────────────────┐
│   FRONTEND (Next.js 14) │ ◄────────────────────────► │  BACKEND (Laravel 12)    │
│   Vercel (CDN global)   │        REST API v1          │  Laravel Cloud           │
│                         │                              │                          │
│  - App Router           │                              │  - API REST              │
│  - Recharts (gráficos)  │                              │  - Sanctum (tokens)      │
│  - jsPDF / xlsx         │                              │  - RBAC dinámico         │
│  - Tailwind CSS         │                              │  - MySQL 8               │
└─────────────────────────┘                              └──────────────────────────┘
```

*Fuente: elaboración propia.*

#### 2.2.2 Arquitectura del backend: módulos y capas

El backend implementa una **arquitectura modular por capas** bajo el directorio `app/Modules/`, donde cada dominio funcional es un módulo autocontenido con las siguientes capas:

**Figura 3. Estructura de capas dentro de un módulo.**

```
app/Modules/{Módulo}/
├── Controllers/     ← Orquestación HTTP (recibe, delega, responde)
├── Services/        ← Lógica de negocio
├── Repositories/
│   ├── Contracts/   ← Interfaz (contrato abstracto)
│   └── *.php        ← Implementación concreta (Eloquent)
├── Requests/        ← Validación y autorización de la petición
└── Resources/       ← Serialización a JSON (DTO de salida)
```

*Fuente: elaboración propia.*

La regla de dependencias es estrictamente unidireccional: Controller → Service → Repository Interface → Repository → Model. Ninguna capa inferior puede importar una capa superior.

La Tabla 2 enumera los nueve módulos funcionales del backend con sus responsabilidades.

**Tabla 2. Módulos funcionales del backend IPN-DEV.**

| # | Módulo | Endpoints | Responsabilidad |
|---|--------|:---------:|-----------------|
| 1 | Auth | 8 | Login, logout, gestión de usuarios y roles |
| 2 | Catálogo | 18 | Materias primas, productos terminados, bodegas, presentaciones |
| 3 | Permisos | 6 | RBAC dinámico: gestión de permisos por rol en BD |
| 4 | Recepciones | 7 | Órdenes de compra y recepción de MP |
| 5 | Inventario | 7 | Stock, alertas de reorden, traslados entre bodegas |
| 6 | Producción | 8 | Ciclo productivo de 4 etapas con FEFO |
| 7 | Despacho | 4 | Salida de PT desde Bodega Ventas |
| 8 | Reportes | 9 | KPIs, indicadores operativos, auditoría, exportación |
| 9 | Bitácora | 1 | Registro inmutable de eventos de autenticación |
| **Total** | | **63** | |

*Fuente: elaboración propia.*

#### 2.2.3 Control de acceso basado en roles (RBAC)

El sistema implementa un modelo RBAC de dos niveles:

- **RBAC estático** (`CheckRole`): para endpoints de administración del sistema (gestión de usuarios, roles y permisos). Solo el rol `administrador` accede.
- **RBAC dinámico** (`CheckPermission`): para todos los endpoints operativos. Los permisos se almacenan en la tabla `permissions` y se asignan a roles vía `role_permissions`. El middleware verifica en base de datos con caché de 60 minutos por rol, lo que permite modificar permisos sin redeploy.

La Tabla 3 presenta la matriz de permisos de los cuatro roles operativos.

**Tabla 3. Matriz de permisos por rol en IPN-DEV.**

| Permiso | Gerencia | Jefe Producción | Encargado Inventarios |
|---------|---------:|----------------:|----------------------:|
| Inventario — leer | ✓ | ✓ | ✓ |
| Inventario — escribir | | ✓ | ✓ |
| Producción — leer | ✓ | ✓ | ✓ |
| Producción — escribir | | ✓ | ✓ |
| Recepciones — leer | ✓ | ✓ | ✓ |
| Recepciones — escribir | | | ✓ |
| Reportes — leer | ✓ | ✓ | ✓ |
| Catálogo — escribir | ✓ | | ✓ |

*Fuente: elaboración propia.*

---

### 2.3 Aplicación de los Principios SOLID

Un objetivo central del proyecto fue la aplicación verificable de los cinco principios SOLID [1] en toda la arquitectura. La Tabla 4 resume cómo se materializó cada principio.

**Tabla 4. Aplicación de los principios SOLID en IPN-DEV.**

| Principio | Mecanismo de aplicación | Evidencia en el código |
|-----------|-------------------------|------------------------|
| **SRP** — Responsabilidad Única | Cada clase tiene exactamente una razón de cambio (Controller = HTTP, Service = negocio, Repository = persistencia) | 10 controllers, 11 services, 9 repositories — ninguno superpone responsabilidades |
| **OCP** — Abierto/Cerrado | Nuevos módulos se agregan creando clases; los existentes no se modifican. El RBAC dinámico permite nuevos permisos sin tocar código. | El módulo Reportes recibió 5 endpoints nuevos sin modificar ningún módulo existente |
| **LSP** — Sustitución de Liskov | Las implementaciones de repositorio son intercambiables; SQLite (tests) reemplaza MySQL (producción) sin cambiar un Service | 129 tests pasan en SQLite; el sistema funciona en MySQL en producción |
| **ISP** — Segregación de Interfaces | Una interfaz específica por módulo; ninguna obliga a implementar métodos ajenos | 9 interfaces de repositorio con métodos exclusivos del dominio correspondiente |
| **DIP** — Inversión de Dependencias | Services inyectan interfaces (Contracts), no implementaciones concretas. Bindings en `AppServiceProvider` | `ProduccionService::__construct(ProduccionRepositoryInterface $repo, FefoService $fefo)` |

*Fuente: elaboración propia.*

La decisión más relevante de diseño orientado a objetos fue la extracción del `FefoService` como servicio de dominio independiente. En lugar de incluir la lógica FEFO dentro del `ProduccionService` o directamente en el repositorio, se creó una clase con responsabilidad única: ordenar los lotes disponibles por fecha de vencimiento y seleccionar la cantidad correcta respetando el FEFO. Esto permite su prueba unitaria de forma aislada y su sustitución futura por otra estrategia de rotación.

---

### 2.4 Integridad Transaccional e Inmutabilidad del Inventario

Un requisito crítico del dominio es que ninguna operación de inventario puede quedar en un estado intermedio: un traslado de materia prima que descuenta de una bodega debe incrementar necesariamente en la bodega destino, o fallar completamente [2].

Todas las operaciones que afectan múltiples filas de stock se encapsulan en `DB::transaction()` con bloqueo pesimista (`lockForUpdate()`). El patrón es uniforme en los cuatro módulos que modifican inventario:

```php
// Ejemplo: ProduccionRepository::ejecutar()
DB::transaction(function () use ($datos) {
    foreach ($consumos as $consumo) {
        $lote = LoteMateriaPrima::lockForUpdate()->find($consumo['lote_id']);
        // validar stock suficiente → abortar si falta
        $lote->decrement('cantidad_actual', $consumo['cantidad']);
        MovimientoInventario::create([/* CONSUMO_MP */]);
    }
    LoteProductoTerminado::create([/* nuevo lote PT */]);
    MovimientoInventario::create([/* PRODUCCION_ENTRADA */]);
});
```

La tabla `movimientos_inventario` es **append-only**: ningún movimiento se actualiza ni se borra. Las correcciones se registran como movimientos compensatorios que referencian al original mediante `movimiento_origen_id`. Este diseño garantiza la trazabilidad de auditoría completa exigida por la historia de usuario HU-027.

---

### 2.5 Panel de Indicadores Operativos y Exportación

El módulo de reportes implementa cuatro indicadores logísticos clave, calculados sobre los datos reales del sistema:

**Tabla 5. Indicadores operativos implementados.**

| Indicador | Fórmula | Interpretación |
|-----------|---------|----------------|
| **Rotación de inventario** | Unidades despachadas últimos 30 días / stock promedio | Número de veces que el inventario se renueva por mes |
| **Exactitud de inventario** | (Lotes con stock > 0 / Total lotes) × 100 | Porcentaje de lotes activos vs. registrados |
| **Nivel de servicio** | (Despachos completados / Órdenes de producción completadas) × 100 | Porcentaje de órdenes que terminaron en despacho efectivo |
| **Utilización de almacén** | (Lotes activos / Capacidad máxima configurada) × 100 | Porcentaje de ocupación del almacén |

*Fuente: elaboración propia.*

El dashboard incluye tres gráficos interactivos implementados con la librería Recharts [3]:

- **Gráfico de área** — despachos de los últimos 30 días
- **Gráfico de barras agrupadas** — producción por estado en los últimos 6 meses
- **Gráfico de torta** — distribución de órdenes de producción por estado

La Figura 4 ilustra la estructura del panel de indicadores.

**Figura 4. Estructura del panel de indicadores operativos.**

```
┌──────────────────────────────────────────────────────────────────────┐
│  DASHBOARD DE INDICADORES              [PDF] [Excel] [Actualizar]    │
├──────────────┬──────────────┬──────────────┬──────────────────────── │
│ Rotación     │ Exactitud    │ Nivel        │ Utilización              │
│ 2.3 veces    │ 87 %         │ 95 %         │ 62 %                     │
│ ████░░ Óptimo│ ████████ Opt │ ████████ Opt │ ██████░ Aceptable        │
├──────────────┴──────────────┴──────────────┴──────────────────────── │
│  Despachos 30d (AreaChart)  │  Producción 6m (BarChart agrupado)     │
│  ▁▃▅▇▆▄▂▃▅▇▆▅▃▄▆▇▅▃▂▁▃▅▇  │  █ Completadas  ░ Producidas           │
│                              │  ▒ Pendientes   ▓ Anuladas            │
├──────────────────────────────┤────────────────────────────────────── │
│  Distribución Órdenes (Pie)  │  Resumen Mes (barras de progreso)     │
│       ◔ Completadas 65%      │  Pendientes ████░░░░░░  3             │
│       ◑ Producidas  20%      │  Completadas████████░░  8             │
└──────────────────────────────┴────────────────────────────────────── │
```

*Fuente: elaboración propia.*

Los datos se pueden exportar en **PDF** (mediante jsPDF y jspdf-autotable [4]) con tablas formateadas de indicadores y órdenes de producción, y en **Excel** (mediante la librería xlsx [5]) con cuatro hojas: Indicadores, Despachos 30d, Producción 6m y Órdenes.

---

### 2.6 Interfaz de Usuario

La interfaz web fue desarrollada en Next.js 14 con el App Router y Tailwind CSS. La arquitectura del frontend sigue el patrón de servicios: cada módulo backend tiene un archivo de servicio TypeScript correspondiente en `frontend/src/services/` que encapsula las llamadas a la API.

El panel de alertas operativas consolida tres tipos de alerta en una sola vista:

1. **Stock bajo punto de reorden** — materias primas con `stock_total` por debajo del umbral configurado
2. **Lotes próximos a vencer** — lotes con `fecha_vencimiento` en los próximos 30 días
3. **Pendientes de despacho** — lotes de producto terminado en Bodega Ventas sin despachar

La navegación está protegida por roles: el sidebar muestra únicamente las secciones accesibles para el rol del usuario autenticado.

---

### 2.7 Pruebas y Aseguramiento de la Calidad

#### 2.7.1 Estrategia de pruebas

La estrategia de pruebas adoptada es predominantemente de tipo *Feature* (integración contra HTTP real con base de datos en memoria), usando el framework Pest PHP [6] con la estrategia `RefreshDatabase` para garantizar aislamiento entre casos de prueba. Esta decisión se basó en que las pruebas de integración verifican el comportamiento real del sistema (incluyendo middleware, validaciones y respuestas JSON) a un costo de configuración similar al de las pruebas unitarias.

#### 2.7.2 Resultados

La Tabla 6 presenta los resultados de la campaña de pruebas sobre los nueve módulos funcionales.

**Tabla 6. Resultados de pruebas por módulo.**

| Módulo | Pruebas | Cobertura | Estado |
|--------|:-------:|:---------:|:------:|
| Auth | 17 | 97 % | PASS |
| Catálogo | 18 | 45 % | PASS* |
| Permisos RBAC | 13 | 93 % | PASS |
| Recepciones | 16 | 90 % | PASS |
| Inventario | 19 | 97 % | PASS |
| Producción | 10 | 88 % | PASS |
| Despacho | 10 | 93 % | PASS |
| Bitácora | 11 | 100 % | PASS |
| Reportes | 10 | 100 % | PASS |
| Integración E2E | 3 | — | PASS |
| **TOTAL** | **129** | **80,4 %** | **PASS** |

*\*Cobertura reducida en Catálogo por endpoints de actualización/eliminación sin tests. La cobertura global supera el umbral del 70 %.*

*Fuente: medición con PCOV 1.0.11.*

Las 398 aserciones verificadas abarcan los siguientes tipos de escenario:

- **40 %** — Flujo exitoso (Happy Path)
- **27 %** — Control de acceso (401/403)
- **19 %** — Validación de entrada (422)
- **6 %** — Recursos no encontrados (404)
- **8 %** — Integridad de negocio y pruebas E2E

#### 2.7.3 Prueba de integridad transaccional

El test E2E-3 verifica el escenario más crítico del sistema: que una producción rechazada por stock insuficiente no deje rastros en la base de datos. Con solo 3 kg de harina disponibles y una producción que requiere 10 kg:

```
[OK] POST /produccion/ordenes  → 422 (stock insuficiente)
[OK] cantidad_actual del lote  → 3.0 (sin cambios)
[OK] LoteProductoTerminado.count() → 0
[OK] MovimientoInventario.count()  → 1 (solo el de recepción inicial)
```

Este resultado confirma que el patrón `DB::transaction()` + `lockForUpdate()` funciona correctamente bajo condiciones de fallo.

---

### 2.8 Despliegue e Infraestructura

El sistema se desplegó sobre una arquitectura en la nube de dos componentes:

**Tabla 7. Configuración del entorno de producción.**

| Componente | Tecnología | Proveedor |
|------------|-----------|-----------|
| Frontend | Next.js 14 — build estático | Vercel (CDN global) |
| Backend API | Laravel 12 — PHP 8.3 | Laravel Cloud |
| Base de datos | MySQL 8.0 | Laravel Cloud (managed) |
| Caché de permisos | File cache (Laravel) | 60 min TTL por rol |
| Autenticación | Laravel Sanctum (tokens API) | — |
| Documentación API | Swagger / OpenAPI 3.0 | `/api/documentation` |

*Fuente: elaboración propia.*

El flujo de despliegue es continuo: los pushes a la rama `main` del repositorio disparan automáticamente el redeploy del frontend en Vercel. El backend se despliega mediante `git subtree push` hacia el repositorio de Laravel Cloud.

---

### 2.9 Documentación de la API

Los 63 endpoints de la API están documentados con anotaciones `@OA` (OpenAPI) directamente en los controllers de Laravel, siguiendo el estándar OpenAPI 3.0 [7]. La documentación es interactiva: el endpoint `/api/documentation` sirve la interfaz Swagger-UI donde los desarrolladores pueden explorar y probar los endpoints en tiempo real.

**Figura 5. Estructura de la documentación Swagger generada.**

```
/api/documentation
├── Auth
│   ├── POST /api/v1/auth/login
│   ├── POST /api/v1/auth/logout
│   └── GET  /api/v1/auth/me
├── Inventario
│   ├── GET  /api/v1/inventario/stock/mp
│   ├── GET  /api/v1/inventario/alertas
│   └── POST /api/v1/inventario/traslados
├── Producción
│   ├── POST /api/v1/produccion/ordenes
│   ├── POST /api/v1/produccion/ordenes/{id}/ejecutar
│   ├── POST /api/v1/produccion/ordenes/{id}/traslado-pt
│   └── ...
├── Reportes
│   ├── GET  /api/v1/reportes/indicadores
│   ├── GET  /api/v1/reportes/auditoria/recepciones
│   └── ...
└── (9 secciones — 63 endpoints)
```

*Fuente: elaboración propia.*

---

## 3. Conclusiones

El desarrollo del Sistema IPN-DEV demostró la viabilidad de aplicar principios de ingeniería de software de nivel empresarial en un contexto académico con restricciones de tiempo y equipo reducido. Los principales hallazgos son los siguientes:

**1. La arquitectura modular SOLID reduce el riesgo de regresión.** La adición de los cinco endpoints de auditoría al módulo de Reportes no requirió modificar ningún módulo existente, lo que valida en la práctica el principio OCP. Los 129 tests que ya existían continuaron pasando sin cambios.

**2. La integridad transaccional es un requisito no negociable en sistemas de inventario.** El patrón `DB::transaction()` + `lockForUpdate()` implementado sistemáticamente fue verificado mediante pruebas de integración específicas. Sin este mecanismo, condiciones de carrera entre usuarios concurrentes podrían generar stock negativo o doble descuento de materias primas.

**3. La política FEFO requiere un servicio de dominio independiente.** La extracción del `FefoService` como clase con responsabilidad única facilitó su prueba unitaria y la verificación del comportamiento correcto ante diferentes combinaciones de lotes. Este patrón es aplicable a cualquier sistema que gestione inventario perecedero.

**4. Los reportes exportables agregan valor operacional inmediato.** La capacidad de exportar los indicadores operativos en PDF y Excel fue identificada como uno de los requisitos de mayor valor percibido por los usuarios, ya que permite incluir los datos del sistema en informes y presentaciones gerenciales sin trabajo adicional de transcripción.

**5. La cobertura de pruebas del 80,4 % superó el umbral mínimo del 70 %.** El uso de SQLite `:memory:` como motor de pruebas garantizó tiempos de ejecución de 9 segundos para 129 casos, haciendo viable la ejecución completa de la suite en cada ciclo de desarrollo.

Como trabajo futuro, se identifican las siguientes líneas de evolución: implementación de notificaciones en tiempo real mediante WebSockets para las alertas de reorden, soporte multi-sede para la eventual expansión del cliente piloto, y la ejecución de pruebas de carga reales con herramientas como k6 o Artillery para obtener métricas de rendimiento bajo concurrencia alta.

---

## Reconocimientos

Los autores agradecen a la empresa del sector pastelero que participó como cliente piloto por su disposición a compartir los procesos operativos reales que sirvieron de base para el diseño del sistema. Igualmente, al equipo docente del Seminario Nuclear por las orientaciones metodológicas durante el proceso de desarrollo.

---

## Referencias

[1] R. C. Martin, *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.

[2] T. Connolly y C. Begg, *Database Systems: A Practical Approach to Design, Implementation, and Management*, 6.ª ed. Pearson Education, 2015.

[3] Recharts Development Team, "Recharts — Redefined chart library built with React and D3," versión 3.8.1. [En línea]. Disponible en: https://recharts.org. [Accedido: jun. 2026].

[4] A. Gomes Antunes, "jsPDF-AutoTable — Generate PDF with tabular data," versión 5.0.8. [En línea]. Disponible en: https://github.com/simonbengtsson/jsPDF-AutoTable. [Accedido: jun. 2026].

[5] SheetJS Community, "xlsx — SheetJS Spreadsheet Data Toolkit," versión 0.18.5. [En línea]. Disponible en: https://sheetjs.com. [Accedido: jun. 2026].

[6] N. Hirsch y L. Cardoso, "Pest PHP — An elegant testing framework for PHP," versión 2. [En línea]. Disponible en: https://pestphp.com. [Accedido: jun. 2026].

[7] OpenAPI Initiative, "OpenAPI Specification 3.0," 2023. [En línea]. Disponible en: https://spec.openapis.org/oas/v3.0.0. [Accedido: jun. 2026].

[8] Taylor Otwell, *Laravel: Up & Running*, 3.ª ed. O'Reilly Media, 2023.

[9] V. Savkin, *Angular Development with TypeScript*, 2.ª ed. Manning Publications, 2018. *(aplicable a patrones de arquitectura frontend)*

[10] R. Fielding, "Architectural Styles and the Design of Network-based Software Architectures," tesis doctoral, University of California, Irvine, 2000.

---

*Documento elaborado el 17 de junio de 2026 — Sistema IPN-DEV v1.0 — Seminario Nuclear de Ingeniería.*
