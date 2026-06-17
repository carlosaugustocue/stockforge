# INFORME DE DEUDA TÉCNICA — BACKEND IPN-DEV
**Sistema de Inventario y Logística — API REST Laravel**
**Versión:** 1.0 | **Fecha:** 17 de junio de 2026 | **Elaborado por:** Equipo de Ingeniería IPN-DEV

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Metodología de Identificación](#2-metodología-de-identificación)
3. [Inventario de Deuda Técnica](#3-inventario-de-deuda-técnica)
4. [Deuda por Categoría](#4-deuda-por-categoría)
5. [Mapa de Riesgo](#5-mapa-de-riesgo)
6. [Plan de Mitigación y Priorización](#6-plan-de-mitigación-y-priorización)
7. [Deuda Aceptada Conscientemente (YAGNI)](#7-deuda-aceptada-conscientemente-yagni)
8. [Métricas de Deuda](#8-métricas-de-deuda)
9. [Conclusiones](#9-conclusiones)

---

## 1. RESUMEN EJECUTIVO

Este informe cataloga, clasifica y prioriza la deuda técnica identificada en el backend del Sistema IPN-DEV tras completar el primer ciclo completo de desarrollo (v1.0). La deuda se divide en dos categorías principales: **deuda no planificada** (hallazgos que deben abordarse) y **deuda aceptada conscientemente** (decisiones deliberadas documentadas como YAGNI o ADR).

| Tipo | Cantidad | Severidad alta | Severidad media | Severidad baja |
|------|:--------:|:--------------:|:---------------:|:--------------:|
| Cobertura de pruebas incompleta | 4 | 0 | 2 | 2 |
| Arquitectura / diseño | 4 | 0 | 1 | 3 |
| Seguridad / robustez | 2 | 0 | 2 | 0 |
| Documentación técnica | 2 | 0 | 0 | 2 |
| Deuda aceptada (YAGNI/ADR) | 3 | — | — | — |
| **TOTAL** | **15** | **0** | **5** | **7** |

**Estado general:** No existe deuda de severidad alta. El sistema puede desplegarse a producción. La deuda de severidad media debe ser abordada en los próximos dos sprints antes del crecimiento de la base de usuarios.

---

## 2. METODOLOGÍA DE IDENTIFICACIÓN

La deuda técnica se identificó mediante las siguientes actividades:

| Técnica | Descripción |
|---------|-------------|
| Análisis de cobertura PCOV | Identificación de líneas y módulos sin cobertura de tests |
| Revisión arquitectónica | Verificación de cumplimiento de los principios SOLID y las reglas del CLAUDE.md |
| Análisis estático manual | Revisión de cada módulo buscando violaciones de SRP, DIP e ISP |
| Revisión de migraciones | Verificación de índices, tipos de datos y configuración de BD |
| Análisis de observaciones OBS | Las observaciones OBS-01 a OBS-04 del Informe de Pruebas (ya documentadas) |
| Revisión de seguridad | Verificación del checklist del SecurityAgent contra el código actual |

---

## 3. INVENTARIO DE DEUDA TÉCNICA

### DT-001 — FefoService sin pruebas unitarias de casos borde

| Campo | Valor |
|-------|-------|
| **ID** | DT-001 |
| **Categoría** | Cobertura de pruebas |
| **Severidad** | Media |
| **Estado** | Abierto |
| **Módulo** | `app/Modules/Produccion/Services/FefoService.php` |
| **Descripción** | `FefoService` alcanza el 80 % de cobertura, pero las líneas 84-89 (desempate FEFO cuando dos lotes tienen la misma `fecha_vencimiento`, usando `fecha_ingreso` como criterio secundario) no están cubiertas. Este escenario ocurre cuando un proveedor entrega múltiples partidas el mismo día. |
| **Impacto** | Riesgo de consumir el lote incorrecto en producción real, violando RFINV03 parcialmente. El error silencioso causaría que un lote más reciente se consuma antes que uno más antiguo de igual vencimiento. |
| **Esfuerzo estimado** | 3–4 horas |
| **Plan de resolución** | Crear `tests/Unit/FefoServiceTest.php` con los casos: (1) misma fecha de vencimiento, distinta fecha_ingreso; (2) consumo FEFO multi-lote (el consumo supera la capacidad de un solo lote); (3) todos los lotes agotados; (4) ausencia total de stock. |

---

### DT-002 — Módulo Catálogo con cobertura reducida (~45 %)

| Campo | Valor |
|-------|-------|
| **ID** | DT-002 |
| **Categoría** | Cobertura de pruebas |
| **Severidad** | Media |
| **Estado** | Abierto |
| **Módulo** | `app/Modules/Catalogo/` |
| **Descripción** | Los subcomponentes `BodegaController` (19.2 %), `PresentacionController` (20.5 %), `ProductoTerminadoController` (23.9 %), `BodegaService` (22.2 %), `PresentacionService` (20 %) y `MateriasPrimasImport` (0 %) no tienen pruebas para operaciones de actualización, eliminación e importación masiva. |
| **Impacto** | Errores de regresión en endpoints de modificación de catálogo no serían detectados automáticamente. La importación masiva (`MateriasPrimasImport`) es la pieza más crítica sin cobertura: un error en ella podría crear materias primas con datos corruptos. |
| **Esfuerzo estimado** | 4–6 horas |
| **Plan de resolución** | Agregar al menos 3 tests por endpoint sin cobertura: éxito, validación (422) y acceso denegado (403). Priorizar `MateriasPrimasImport` y los endpoints PATCH/DELETE de Bodegas y Presentaciones. |

---

### DT-003 — Ausencia de `--coverage --min=70` en pipeline de CI

| Campo | Valor |
|-------|-------|
| **ID** | DT-003 |
| **Categoría** | Infraestructura / CI-CD |
| **Severidad** | Baja |
| **Estado** | Abierto |
| **Módulo** | Pipeline de integración continua |
| **Descripción** | Aunque la cobertura actual es 80.4 % (RNF-MAN-02 cumplido), el pipeline de CI no verifica automáticamente el umbral del 70 % en cada PR. Una reducción de cobertura pasaría desapercibida hasta que se ejecute el comando manualmente. |
| **Impacto** | Sin garantía automática de mantenimiento del umbral contractual de cobertura. |
| **Esfuerzo estimado** | 30 minutos |
| **Plan de resolución** | Agregar `./vendor/bin/pest --coverage --min=70` al workflow de CI (GitHub Actions o equivalente). |

---

### DT-004 — `auth()->forgetGuards()` sin documentar en Pest.php

| Campo | Valor |
|-------|-------|
| **ID** | DT-004 |
| **Categoría** | Infraestructura de pruebas |
| **Severidad** | Baja |
| **Estado** | Abierto |
| **Módulo** | `tests/Pest.php` |
| **Descripción** | El guard de Sanctum cachea el usuario autenticado en memoria entre requests del mismo test. En tests que encadenan 2+ requests con diferentes usuarios, es necesario llamar `auth()->forgetGuards()` entre ellos. Este patrón está aplicado en todos los tests que lo requieren, pero no está documentado como guía para futuros desarrolladores. |
| **Impacto** | Un desarrollador que escriba un nuevo test multi-request sin aplicar `forgetGuards()` obtendrá 401 falsos positivos, perdiendo tiempo de depuración. |
| **Esfuerzo estimado** | 30 minutos |
| **Plan de resolución** | Agregar comentario explicativo en `tests/Pest.php` describiendo el patrón y cuándo aplicarlo. |

---

### DT-005 — FefoService sin interfaz propia (acoplamiento concreto)

| Campo | Valor |
|-------|-------|
| **ID** | DT-005 |
| **Categoría** | Arquitectura / DIP |
| **Severidad** | Baja |
| **Estado** | Abierto |
| **Módulo** | `app/Modules/Produccion/Services/FefoService.php` |
| **Descripción** | `ProduccionService` depende directamente de `FefoService` (clase concreta), no de una interfaz `FefoServiceInterface`. Esto viola DIP de forma puntual: si se necesita implementar una estrategia FEFO alternativa (ej. FIFO para ciertos productos), se requeriría modificar `ProduccionService`. |
| **Impacto** | Bajo en el corto plazo. Se volvería relevante si se introduce una segunda estrategia de selección de lotes. |
| **Esfuerzo estimado** | 1–2 horas |
| **Plan de resolución** | Crear `FefoServiceInterface` con el método `seleccionarLotes()`. Hacer que `FefoService` la implemente. Inyectar `FefoServiceInterface` en `ProduccionService`. Registrar binding en `AppServiceProvider`. |

---

### DT-006 — Módulo Catálogo con alta densidad de clases (12 clases)

| Campo | Valor |
|-------|-------|
| **ID** | DT-006 |
| **Categoría** | Arquitectura / SRP modular |
| **Severidad** | Baja |
| **Estado** | Abierto |
| **Módulo** | `app/Modules/Catalogo/` |
| **Descripción** | El módulo Catálogo agrupa 5 subdominios distintos: Materias Primas, Productos Terminados, Bodegas, Presentaciones y Relaciones MP-PT. Esto resulta en 12+ clases dentro del mismo módulo, lo que aumenta la complejidad de navegación y podría violar SRP a nivel modular. |
| **Impacto** | Bajo en el estado actual. Si el catálogo crece (ej. añadiendo Categorías, Marcas, Unidades de Medida extendidas), el módulo se volverá difícil de mantener. |
| **Esfuerzo estimado** | 3–4 horas |
| **Plan de resolución** | Subdividir en módulos: `MateriasPrimas`, `ProductosTerminados`, `Bodegas`. La subdivisión no requiere cambios en rutas ni en la BD; solo reorganización de clases y actualización de bindings. |

---

### DT-007 — Ausencia de caché para consultas de stock frecuentes

| Campo | Valor |
|-------|-------|
| **ID** | DT-007 |
| **Categoría** | Rendimiento |
| **Severidad** | Baja |
| **Estado** | Abierto |
| **Módulo** | `app/Modules/Inventario/Repositories/InventarioRepository.php`, `app/Modules/Reportes/` |
| **Descripción** | Las consultas de stock (`GET /inventario/stock/mp`, `GET /reportes/kpis`) se ejecutan contra la BD en cada request sin caché. En operaciones de producción intensiva, estos endpoints pueden ser consultados muchas veces por minuto por múltiples usuarios simultáneos. |
| **Impacto** | Bajo con la base de usuarios actual (piloto). Se volvería relevante con >50 usuarios concurrentes o consultas frecuentes de dashboards. |
| **Esfuerzo estimado** | 2–3 horas |
| **Plan de resolución** | Implementar `Cache::remember()` con TTL corto (30–60 segundos) para las consultas de stock más frecuentes. Invalidar la caché cuando se registre una recepción, traslado, producción o despacho que modifique el stock. |

---

### DT-008 — Cobertura de modelos críticos incompleta

| Campo | Valor |
|-------|-------|
| **ID** | DT-008 |
| **Categoría** | Cobertura de pruebas |
| **Severidad** | Baja |
| **Estado** | Abierto |
| **Módulo** | `app/Models/MovimientoInventario.php` (54.5 %), `app/Models/LoteMateriaPrima.php` (60 %) |
| **Descripción** | Los modelos `MovimientoInventario` y `LoteMateriaPrima` son los más utilizados en todo el sistema (cada operación de inventario los involucra) pero tienen la cobertura más baja entre los modelos críticos. Sus métodos de dominio y constantes de tipo no están directamente testeados. |
| **Impacto** | Los métodos de dominio de estos modelos están cubiertos indirectamente por los tests de Feature, pero no existen tests unitarios específicos para sus métodos de clase. |
| **Esfuerzo estimado** | 2–3 horas |
| **Plan de resolución** | Agregar tests unitarios para: constantes de tipo en `MovimientoInventario`, métodos de relación en `LoteMateriaPrima`, y los scopes/mutators de ambos modelos. |

---

### DT-009 — Ausencia de rate limiting en endpoints de autenticación

| Campo | Valor |
|-------|-------|
| **ID** | DT-009 |
| **Categoría** | Seguridad |
| **Severidad** | Media |
| **Estado** | Abierto |
| **Módulo** | `routes/api_v1.php` — endpoints `POST /auth/login` |
| **Descripción** | El endpoint de login implementa bloqueo de cuenta tras 5 intentos fallidos (RFAUT01, implementado en `AuthService`). Sin embargo, no existe un rate limiting a nivel de infraestructura (throttle de Laravel o similar) que limite la tasa de requests por IP, independientemente del resultado. Un atacante podría enviar miles de requests a diferentes cuentas sin activar el bloqueo de ninguna cuenta individual. |
| **Impacto** | Riesgo de ataques de fuerza bruta distribuidos (*credential stuffing*). El bloqueo por cuenta no protege contra ataques que distribuyen intentos entre múltiples cuentas. |
| **Esfuerzo estimado** | 1–2 horas |
| **Plan de resolución** | Agregar `Route::middleware('throttle:10,1')` al grupo de rutas públicas de autenticación (10 intentos por minuto por IP). Laravel incluye este middleware de forma nativa. |

---

### DT-010 — Sin validación de Content-Type en requests

| Campo | Valor |
|-------|-------|
| **ID** | DT-010 |
| **Categoría** | Seguridad / Robustez |
| **Severidad** | Media |
| **Estado** | Abierto |
| **Módulo** | Global — `routes/api_v1.php` |
| **Descripción** | Los endpoints de la API aceptan requests sin verificar explícitamente que el `Content-Type` sea `application/json`. Aunque Laravel resuelve correctamente el body JSON en la mayoría de los casos, requests malformados con `Content-Type: text/plain` podrían no ser parseados correctamente y generar errores 500 en lugar de 422. |
| **Impacto** | Bajo. No es una vulnerabilidad de seguridad crítica pero puede producir respuestas de error no estandarizadas. |
| **Esfuerzo estimado** | 1 hora |
| **Plan de resolución** | Agregar middleware `ForceJsonResponse` que fuerce `Accept: application/json` y retorne 415 si el Content-Type de un request con body no es JSON. |

---

### DT-011 — Swagger/OpenAPI sin endpoints de auditoría

| Campo | Valor |
|-------|-------|
| **ID** | DT-011 |
| **Categoría** | Documentación técnica |
| **Severidad** | Baja |
| **Estado** | Abierto |
| **Módulo** | `app/Modules/Reportes/Controllers/ReportesController.php` |
| **Descripción** | Los 5 nuevos endpoints de auditoría (`/auditoria/recepciones`, `/auditoria/producciones`, `/auditoria/producciones/{id}`, `/auditoria/despachos`, `/auditoria/traslados-mp`) tienen sus anotaciones `@OA\Get` agregadas en el controller, pero la documentación generada de Swagger puede no estar actualizada hasta que se ejecute `php artisan l5-swagger:generate`. |
| **Impacto** | Los consumidores del API (frontend, integraciones futuras) podrían no tener visibilidad de los nuevos endpoints de auditoría. |
| **Esfuerzo estimado** | 15 minutos |
| **Plan de resolución** | Ejecutar `php artisan l5-swagger:generate` y verificar que los 5 endpoints aparecen en `/swagger`. Agregar este paso al pipeline de CI. |

---

### DT-012 — Ausencia de logging estructurado para errores de dominio

| Campo | Valor |
|-------|-------|
| **ID** | DT-012 |
| **Categoría** | Observabilidad |
| **Severidad** | Baja |
| **Estado** | Abierto |
| **Módulo** | Global |
| **Descripción** | Los errores de dominio (stock insuficiente, estado de orden inválido, FEFO sin lotes disponibles) se retornan al cliente como respuestas 422, pero no se registran en el log de Laravel ni en la bitácora. En producción, un aumento repentino de errores 422 no sería detectable de forma proactiva. |
| **Impacto** | Bajo en desarrollo. En producción, dificulta la detección temprana de problemas operacionales (ej. stock crónicamente bajo, órdenes en estado incorrecto). |
| **Esfuerzo estimado** | 2–3 horas |
| **Plan de resolución** | Agregar `Log::warning()` en los Services cuando se rechaza una operación por regla de negocio. Considerar agregar un contador de errores por tipo en los KPIs de Reportes. |

---

## 4. DEUDA POR CATEGORÍA

### 4.1 Cobertura de pruebas (4 ítems)

| ID | Descripción | Severidad |
|----|-------------|:---------:|
| DT-001 | FefoService sin casos borde | Media |
| DT-002 | Catálogo con cobertura reducida | Media |
| DT-003 | CI sin verificación automática de umbral | Baja |
| DT-008 | Modelos críticos con cobertura incompleta | Baja |

**Impacto de resolución:** Llevar la cobertura global del 80.4 % al 87–90 % estimado y eliminar el riesgo residual en FEFO.

### 4.2 Arquitectura / Diseño (4 ítems)

| ID | Descripción | Severidad |
|----|-------------|:---------:|
| DT-005 | FefoService sin interfaz (violación DIP puntual) | Baja |
| DT-006 | Módulo Catálogo con alta densidad de clases | Baja |
| DT-007 | Ausencia de caché para consultas de stock | Baja |
| DT-004 | Patrón forgetGuards sin documentar | Baja |

### 4.3 Seguridad / Robustez (2 ítems)

| ID | Descripción | Severidad |
|----|-------------|:---------:|
| DT-009 | Sin rate limiting en endpoints de autenticación | Media |
| DT-010 | Sin validación de Content-Type | Media |

### 4.4 Documentación técnica (2 ítems)

| ID | Descripción | Severidad |
|----|-------------|:---------:|
| DT-011 | Swagger desactualizado para endpoints de auditoría | Baja |
| DT-012 | Ausencia de logging de errores de dominio | Baja |

---

## 5. MAPA DE RIESGO

```
                    ALTA
                     │
                     │
  PROBABILIDAD       │
  DE IMPACTO         │   DT-001 (FEFO)
                     │   DT-009 (rate limit)
                MEDIA│
                     │   DT-002 (catálogo tests)
                     │   DT-010 (Content-Type)
                     │
                 BAJA│                          DT-007 (caché)
                     │  DT-003  DT-004  DT-005  DT-006
                     │  DT-008  DT-011  DT-012
                     └──────────────────────────────────
                           BAJA    MEDIA    ALTA
                               ESFUERZO DE RESOLUCIÓN

Cuadrante prioritario (alto impacto, bajo esfuerzo):
  DT-009 — rate limiting (1-2h, impacto seguridad medio)
  DT-001 — FefoService tests (3-4h, impacto negocio medio)
  DT-003 — CI coverage check (30 min, coste negligible)
  DT-011 — Swagger update (15 min, coste negligible)
```

---

## 6. PLAN DE MITIGACIÓN Y PRIORIZACIÓN

### Sprint 1 — Antes del primer release a usuarios reales (esfuerzo total: ~6 horas)

| Prioridad | ID | Acción | Responsable | Esfuerzo |
|:---------:|----|--------|-------------|:--------:|
| 1 | DT-009 | Agregar `throttle:10,1` al grupo de rutas de autenticación | Backend Dev | 1 h |
| 2 | DT-001 | Crear `tests/Unit/FefoServiceTest.php` con 4 casos borde | Backend Dev | 4 h |
| 3 | DT-003 | Agregar `--coverage --min=70` al workflow de CI | DevOps | 30 min |
| 4 | DT-011 | Ejecutar `l5-swagger:generate` y agregar al CI | Backend Dev | 15 min |

### Sprint 2 — Próximas dos semanas (esfuerzo total: ~10 horas)

| Prioridad | ID | Acción | Responsable | Esfuerzo |
|:---------:|----|--------|-------------|:--------:|
| 5 | DT-002 | Agregar tests para endpoints sin cobertura en Catálogo | Backend Dev | 5 h |
| 6 | DT-010 | Crear middleware `ForceJsonResponse` | Backend Dev | 1 h |
| 7 | DT-005 | Extraer `FefoServiceInterface` + binding | Backend Dev | 2 h |
| 8 | DT-004 | Documentar patrón `forgetGuards()` en Pest.php | Backend Dev | 30 min |
| 9 | DT-012 | Agregar `Log::warning()` en rechazos de dominio | Backend Dev | 2 h |

### Backlog (según capacidad y crecimiento del sistema)

| ID | Acción | Condición de activación |
|----|--------|------------------------|
| DT-006 | Subdividir módulo Catálogo | Cuando supere 15 clases o aparezca un cuarto subdominio |
| DT-007 | Implementar caché de stock | Cuando se superen 20 usuarios concurrentes en el dashboard |
| DT-008 | Tests unitarios de modelos críticos | Al próximo ciclo de mantenimiento |

---

## 7. DEUDA ACEPTADA CONSCIENTEMENTE (YAGNI)

Las siguientes "deudas" son decisiones de diseño deliberadas, documentadas en los ADRs del Informe de Arquitectura, que se aceptan conscientemente por no cumplir el principio YAGNI (*You Ain't Gonna Need It*) de agregar complejidad no requerida.

### DA-001 — Ausencia de multi-tenant / multi-sede

**Justificación:** El cliente piloto opera una sola sede. Implementar multi-tenant requeriría `centro_distribucion_id` en todas las tablas de stock, movimientos, lotes y órdenes, complejizando todas las queries y la UI. Esta deuda se activará solo cuando el cliente confirme expansión a múltiples sedes, momento en el que se abordará mediante migraciones de alteración.

**Costo de activación estimado:** Alto (15–25 días de trabajo para migración y adaptación de queries).

### DA-002 — Sin soporte para múltiples estrategias de rotación de inventario (FEFO/FIFO/LIFO)

**Justificación:** El sistema implementa exclusivamente FEFO (First Expired, First Out), que es la estrategia requerida por el dominio de alimentos. No se implementa soporte para FIFO o LIFO porque no existe ningún requisito que lo justifique. Si en el futuro se requiere flexibilidad, la extracción de `FefoServiceInterface` (DT-005) es el paso previo necesario.

**Costo de activación estimado:** Bajo (1–2 días una vez resuelta DT-005).

### DA-003 — Ausencia de sistema de notificaciones / alertas en tiempo real

**Justificación:** Las alertas de reorden (stock bajo punto mínimo) se exponen vía API pull (`GET /inventario/alertas`). No se implementó un sistema push (WebSockets, email, SMS) porque no es un requisito del cliente en esta fase. La interfaz web actual consulta las alertas periódicamente.

**Costo de activación estimado:** Medio (5–10 días para integrar Laravel Echo + WebSockets o un servicio de email transaccional).

---

## 8. MÉTRICAS DE DEUDA

### 8.1 Distribución por severidad

```
Alta:   0 ítems  (0 %)  — No bloqueante para producción
Media:  5 ítems  (42 %) — Deben resolverse en los próximos 2 sprints
Baja:   7 ítems  (58 %) — Gestionar según capacidad del equipo
```

### 8.2 Esfuerzo total de resolución estimado

```
Sprint 1 (crítico):    ~6 horas
Sprint 2 (importante): ~10 horas
Backlog:               ~12 horas (condicional)

Total esfuerzo activo: ~16 horas de desarrollo
```

### 8.3 Evolución de la deuda (comparativo)

| Período | Deuda severidad alta | Deuda severidad media | Cobertura global |
|---------|:-------------------:|:---------------------:|:----------------:|
| Inicio del proyecto | Sin medir | Sin medir | 0 % |
| Sprint 1-3 (fundacional) | ~3 | ~8 | ~40 % |
| Sprint 4-6 (módulos operativos) | 1 | 5 | ~65 % |
| Estado actual (v1.0) | **0** | **5** | **80.4 %** |

La tendencia es positiva: la deuda de severidad alta fue eliminada durante el ciclo de desarrollo y la cobertura creció de 0 % al 80.4 %. La deuda media identificada es manejable y no bloquea el despliegue a producción.

### 8.4 Ratio deuda / funcionalidad

```
Módulos con deuda activa:     3 de 9 (Catálogo, Producción, Global/Infraestructura)
Módulos sin deuda conocida:   6 de 9 (Auth, Inventario, Recepciones, Despacho, Reportes, Bitácora)
```

---

## 9. CONCLUSIONES

### 9.1 Estado general

El backend del Sistema IPN-DEV presenta una deuda técnica **manejable y sin bloqueos críticos**. La ausencia de deuda de severidad alta indica que el sistema puede desplegarse a producción. Los 5 ítems de severidad media (3 de pruebas + 2 de seguridad) deben ser abordados antes de que la base de usuarios crezca significativamente.

### 9.2 Prioridades inmediatas

Las acciones que ofrecen el mayor retorno sobre la inversión de tiempo son:

1. **DT-009** (rate limiting) — 1 hora de trabajo, elimina un vector de ataque de fuerza bruta
2. **DT-001** (FefoService tests) — 4 horas, cierra el riesgo residual en la pieza de lógica más crítica del sistema
3. **DT-003** (CI coverage) — 30 minutos, convierte el cumplimiento de RNF-MAN-02 en verificación automática continua

### 9.3 Deuda aceptada vs. deuda por resolver

Es importante distinguir entre los ítems DT (deuda a resolver) y DA (deuda aceptada):

- Los ítems **DA** no son deficiencias del sistema sino decisiones de diseño deliberadas alineadas con el alcance del cliente actual. No deben abordarse hasta que los requisitos cambien.
- Los ítems **DT** representan trabajo pendiente que mejora la calidad del sistema existente y deben ser abordados según la priorización del plan de mitigación.

### 9.4 Declaración final

> El Sistema IPN-DEV v1.0 tiene una deuda técnica controlada: sin ítems de severidad alta, 5 de severidad media abordables en 2 sprints con ~16 horas de trabajo total, y 3 decisiones de diseño aceptadas conscientemente. El sistema está listo para su primer despliegue a producción, con la recomendación de resolver DT-009 (rate limiting) y DT-001 (FefoService tests) antes de la incorporación de usuarios reales.

---

**Leyenda de severidades:**

| Severidad | Criterio | Tiempo de resolución recomendado |
|:---------:|----------|:---------------------------------:|
| Alta | Puede causar pérdida de datos, fallo de seguridad crítico o indisponibilidad del sistema | Antes del despliegue |
| Media | Riesgo de comportamiento incorrecto en escenarios reales o vector de ataque no mitigado | Próximos 2 sprints |
| Baja | Impacto mínimo en funcionalidad; reduce mantenibilidad o testabilidad | Según capacidad del equipo |

---

*Documento generado el 17 de junio de 2026 — Sistema IPN-DEV v1.0*
