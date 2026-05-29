# Plan de Implementación Backend — DALUZ Inventario
> Fuente única de verdad para la implementación de features backend.
> Stack: Laravel 12 + PHP 8.3 + Sanctum + Pest · Base: SQLite dev / MySQL prod
> Última actualización: 2026-05-29 · Estado: Fase 1 en curso (Corte 2)

---

## Resumen general

Sistema de gestión de inventario y logística para centro de distribución (repostería familiar).
El backend vive en `backend/` siguiendo arquitectura modular SOLID (`app/Modules/{Modulo}/`).
El frontend (Next.js) es repositorio separado — los agentes backend NO tocan frontend.

**Fase 0 (Auth + RBAC):** ✅ Completa — mergada a `main` y `develop`.
**Fase 1 (Núcleo transaccional):** 🔄 En curso — Corte 2, ~hasta 6-jun.
**Fase 2 (Inteligencia + despliegue):** ⏳ Pendiente — Corte 3A, ~7–18-jun.
**Fase 3 (Validación + piloto):** ⏳ Pendiente — Corte 3B, ~19–26-jun.

**Regla de oro:** Si algo tiene que ceder, cede lo periférico (Should/Could). Nunca la correctitud del núcleo transaccional ni las pruebas que lo respaldan.

---

## Features

---

### Feature 1: Catálogo Maestro

- **Rama:** `feature/catalogo-maestro`
- **Descripción:** Gestión de las entidades maestras del dominio: materias primas, productos terminados, asociación MP↔PT (qué MP requiere cada PT y en qué cantidad), presentaciones de empaque, bodegas, e importación masiva por Excel/CSV con reporte fila a fila.
- **Historias de usuario:** HU-004, HU-005, HU-006, HU-007, HU-008
- **Cambios backend:**
  - Módulo `app/Modules/Catalogo/`
  - Modelos: `MateriaPrima`, `ProductoTerminado`, `RelacionMpPt`, `Presentacion`, `Bodega`
  - Migraciones: tablas `materias_primas`, `productos_terminados`, `relaciones_mp_pt`, `presentaciones`, `bodegas`
  - Endpoints CRUD para cada entidad; protegidos por rol según RBAC (Gerencia puede modificar maestros, Jefe/Encargado solo consultan)
  - Importador Excel/CSV: validación fila a fila, reporte de filas válidas/inválidas (nunca abortar lote por una fila mala)
  - **Importante:** `decimal(N,M)` para cantidades y costos. Cast `encrypted` en columnas de costo/margen (RNF-SEC-05). NUNCA almacenar recetas/fórmulas (RNF-SEC-06).
- **Dependencias:** Feature 0 (Auth/RBAC) ✅
- **Orden de implementación:** #1 — Prerrequisito de todas las demás features operativas

---

### Feature 2: Órdenes de Pedido

- **Rama:** `feature/ordenes-pedido`
- **Descripción:** Gestión del ciclo de vida de órdenes de pedido a proveedores. Una recepción siempre referencia una orden previa; sin orden no hay recepción (RFREC). Estados: Pendiente → En recepción → Cerrada / Cancelada.
- **Historias de usuario:** HU-009 (prerequisito lógico)
- **Cambios backend:**
  - Módulo `app/Modules/Compras/` (o `OrdenesCompra/`)
  - Modelos: `OrdenCompra`, `OrdenCompraDetalle`
  - Migraciones: `ordenes_compra`, `ordenes_compra_detalles`
  - Endpoints: crear orden, listar, ver detalle, cambiar estado
  - Los detalles referencian `MateriaPrima` del catálogo maestro
- **Dependencias:** Feature 1 (Catálogo Maestro)
- **Orden de implementación:** #2

---

### Feature 3: Recepción de Mercancía

- **Rama:** `feature/recepcion-mercancia`
- **Descripción:** Recepción de materias primas contra orden de pedido. Permite recepciones parciales (la orden queda "En recepción" hasta cerrarse). Genera comprobante PDF de cada recepción. Cada ítem recibido crea un lote con fecha de ingreso, fecha de vencimiento y proveedor.
- **Historias de usuario:** HU-009, HU-010
- **RFs:** RFREC01–RFREC_N
- **Cambios backend:**
  - Módulo `app/Modules/Recepcion/`
  - Modelos: `Recepcion`, `RecepcionDetalle`, `Lote`
  - Migraciones: `recepciones`, `recepciones_detalles`, `lotes`
  - Endpoints: registrar recepción (con validación de orden previa), ver recepciones, generar comprobante PDF
  - Lotes: `decimal` para cantidades, `date` para `fecha_ingreso` y `fecha_vencimiento`, proveedor referenciado
  - El registro de lote es el punto de entrada al inventario — cada lote tiene stock inicial = cantidad recibida
  - Tabla `lotes` es **append-only** en términos de movimientos (la cantidad se actualiza vía movimientos, no directamente)
- **Dependencias:** Feature 1 (Catálogo), Feature 2 (Órdenes)
- **Orden de implementación:** #3

---

### Feature 4: Inventario por Lote (Stock + Ajustes + FEFO)

- **Rama:** `feature/inventario-lotes`
- **Descripción:** Motor central del inventario. Mantiene el stock actual por lote y bodega. Permite consultas de stock agregadas y por lote. Los ajustes (diferencias de conteo, mermas) son movimientos trazables — nunca actualizaciones directas. Encapsula la lógica FEFO (First Expired, First Out) en `FefoService`.
- **Historias de usuario:** HU-012, HU-013, HU-014, HU-015, HU-016, HU-027
- **RFs:** RFINV01, RFINV02, RFINV03
- **Cambios backend:**
  - Módulo `app/Modules/Inventario/`
  - Modelos: `MovimientoInventario`, `StockLote` (vista materializada o tabla calculada)
  - Migraciones: `movimientos_inventario` (inmutable/append-only — solo `created_at`, sin `updated_at`), índice en `fecha_vencimiento` para FEFO
  - `FefoService`: servicio dedicado con interfaz propia (ISP/DIP) — unit tests exhaustivos de borde: lotes con misma fecha, lotes agotados, empate por fecha ingreso, sin stock
  - Consulta de stock: agrega movimientos por lote/bodega (nunca campo mutable de cantidad)
  - Ajuste: movimiento de tipo `AJUSTE` con campo `motivo` y referencia al movimiento original si es compensatorio (`movimiento_origen_id`)
  - Trazabilidad por lote: `HU-026` — rastrear lote desde recepción hasta consumo/despacho
  - **Inmutabilidad (HU-027):** `MovimientoInventario` no tiene métodos update/delete. Las correcciones son movimientos compensatorios.
  - **Cobertura mínima requerida:** ≥ 70% en `FefoService`, `InventarioService`
- **Dependencias:** Feature 3 (Recepción — que genera los lotes iniciales)
- **Orden de implementación:** #4

---

### Feature 5: Traslados entre Bodegas

- **Rama:** `feature/traslados-bodegas`
- **Descripción:** Traslado atómico de stock de lotes desde Bodega Principal hacia Planta de Producción (y viceversa). Operación transaccional estricta: o ambos movimientos se registran, o ninguno. Bloqueo pesimista para evitar stock negativo bajo concurrencia.
- **Historias de usuario:** HU-013 (traslados internos)
- **RFs:** RFINV04
- **Cambios backend:**
  - Servicio `InventarioService::trasladar()` (dentro del módulo Inventario o submódulo Traslados)
  - Flujo exacto per CLAUDE.md §9: `DB::transaction()` + `lockForUpdate()` + dos movimientos inmutables (SALIDA origen / ENTRADA destino)
  - `TrasladoRequest`: validar bodega origen ≠ destino, cantidad > 0, lote existente y con stock suficiente
  - Error específico si stock insuficiente: indicar lote, cantidad disponible vs. solicitada
  - Tests de concurrencia: dos traslados simultáneos del mismo lote no deben resultar en stock negativo
- **Dependencias:** Feature 4 (Inventario por Lote)
- **Orden de implementación:** #5

---

### Feature 6: Producción (Descuento MP por FEFO)

- **Rama:** `feature/produccion`
- **Descripción:** Registro de lotes de producción que descuentan materias primas por FEFO. Si alguna MP no tiene stock suficiente, la transacción completa se aborta con error específico (qué MP falta y cuánta cantidad). Genera un movimiento de ingreso del producto terminado al stock.
- **Historias de usuario:** HU-017, HU-018
- **RFs:** RFPROD01, RFPROD02, RFPROD03, RFPROD04, RFPROD05
- **Cambios backend:**
  - Módulo `app/Modules/Produccion/`
  - Modelos: `LoteProduccion`, `LoteProduccionDetalleMp`
  - Migraciones: `lotes_produccion`, `lotes_produccion_detalle_mp`
  - `ProduccionService::registrar()`: flujo per CLAUDE.md §9 — `DB::transaction()` + `FefoService` + `lockForUpdate()` + movimientos CONSUMO de cada MP + movimiento INGRESO de PT
  - `ProduccionRequest`: validar producto terminado, cantidad, lista de MP consumidas
  - Rechazo RFPROD05: si alguna MP falla, abortar y retornar array con cada MP faltante y su déficit
  - **NUNCA almacenar la fórmula/receta** — solo la relación PT→MP y cantidad consumida por lote (RNF-SEC-06)
  - Tests: éxito atómico, rechazo por stock insuficiente (mensaje con MP y cantidad), FEFO correcto, 403/401
- **Dependencias:** Feature 4 (Inventario + FefoService), Feature 1 (Catálogo MP↔PT)
- **Orden de implementación:** #6

---

### Feature 7: Alertas y Notificaciones

- **Rama:** `feature/alertas-notificaciones`
- **Descripción:** Panel de alertas activas (stock bajo punto de reorden, próximos a vencer, pedidos pendientes de despacho). Notificaciones por email (Must) y WhatsApp Business API (Should — desacoplado por cola para que su fallo no afecte la operación).
- **Historias de usuario:** HU-019, HU-020, HU-021, HU-024
- **RFs:** RNF-INT
- **Cambios backend:**
  - Módulo `app/Modules/Alertas/`
  - Endpoints de consulta de alertas activas (lectura sobre movimientos/stock existente)
  - Jobs/listeners de notificación: `StockBajoJob`, `ProximoVencerJob` — desacoplados en cola
  - Email como canal primario (Laravel Mail, SMTP/Mailgun)
  - WhatsApp como canal secundario desacoplado: Twilio sandbox o WhatsApp Business API — **no bloquear la ruta crítica por aprobaciones externas**
  - Puntos de reorden configurables por Gerencia/Encargado (dato del catálogo maestro)
  - Tests: alerta se genera cuando stock cae bajo umbral, notificación email llega, fallo de WhatsApp no bloquea la operación
- **Dependencias:** Feature 4 (Inventario), Feature 1 (Catálogo — punto de reorden)
- **Orden de implementación:** #7

---

### Feature 8: Dashboard KPI

- **Rama:** `feature/dashboard-kpi`
- **Descripción:** Endpoints de lectura que agregan métricas operativas: rotación de inventario, nivel de servicio, utilización de almacén por bodega. Son exclusivamente lecturas sobre movimientos ya registrados — sin lógica de escritura.
- **Historias de usuario:** HU-022
- **Cambios backend:**
  - Módulo `app/Modules/Dashboard/` (o endpoints en módulo Reportes compartido)
  - Queries de agregación sobre `movimientos_inventario` y `lotes`
  - Respuesta ≤ 5 s para el último mes (índices en columnas de fecha y tipo de movimiento)
  - Costos/márgenes: respetar `encrypted` cast — verificar que los KPIs que usan costo siguen calculando tras el cifrado (RNF-SEC-05)
  - RBAC: Gerencia y Administrador ven todos los KPI
- **Dependencias:** Feature 4, Feature 5, Feature 6 (necesita datos de movimientos reales)
- **Orden de implementación:** #8

---

### Feature 9: Reportes PDF/Excel

- **Rama:** `feature/reportes`
- **Descripción:** Generación de reportes exportables filtrables por período, categoría y zona. Formatos: PDF y Excel. Tiempo de generación ≤ 10 s.
- **Historias de usuario:** HU-023
- **Cambios backend:**
  - Módulo `app/Modules/Reportes/`
  - Dependencias Composer a anunciar antes de instalar: `barryvdh/laravel-dompdf` (PDF), `maatwebsite/excel` (Excel)
  - Endpoints: `GET /reportes/movimientos`, `GET /reportes/stock`, `GET /reportes/produccion` con parámetros de filtro
  - Jobs para generación asíncrona si el reporte es pesado (cola)
  - Tests: reporte generado en < 10 s con dataset representativo, filtros aplican correctamente
- **Dependencias:** Feature 4, Feature 5, Feature 6, Feature 8 (datos consolidados)
- **Orden de implementación:** #9

---

### Feature 10: Bitácora de Acciones de Negocio

- **Rama:** `feature/bitacora-negocio`
- **Descripción:** Extensión de la bitácora existente (`bitacora_accesos`) para registrar acciones críticas de negocio: recepciones, traslados, producciones, despachos, ajustes de inventario, modificaciones de maestros. Tabla inmutable (append-only).
- **Historias de usuario:** HU-028
- **RFs:** RNFAUD03
- **Cambios backend:**
  - Nueva tabla `bitacora_operaciones` (tabla inmutable — solo `created_at`, sin `updated_at`)
  - Columnas: `user_id`, `accion`, `modulo`, `entidad_id`, `entidad_tipo`, `detalle_json`, `ip_address`, `created_at`
  - Trait o Listener que los Services de negocio invocan al completar operaciones críticas
  - RBAC: solo Gerencia y Administrador pueden consultar la bitácora
  - Tests: verificar que la acción queda registrada tras cada operación crítica
- **Dependencias:** Feature 3, Feature 4, Feature 5, Feature 6
- **Orden de implementación:** #10 (puede implementarse en paralelo a Feature 7–9 como trait transversal)

---

### Feature 11: Documentación API (Swagger/OpenAPI)

- **Rama:** `feature/swagger-docs`
- **Descripción:** Documentación de todos los endpoints de la API v1 con Swagger/OpenAPI. Accesible vía `/swagger` (o `/api/documentation`). Incluye esquemas de request/response, ejemplos y descripción de errores.
- **RFs:** RNF-MAN-03
- **Cambios backend:**
  - Paquete `darkaonline/l5-swagger` (anunciar antes de instalar con `composer require`)
  - Anotaciones PHP en Controllers y Resources de todos los módulos
  - Publicar config y generar spec en CI
- **Dependencias:** Todas las features anteriores (documenta lo ya implementado)
- **Orden de implementación:** #11 — puede ir creciendo en paralelo pero se completa al final

---

### Feature 12: Infraestructura y Despliegue

- **Rama:** `feature/infra-deploy`
- **Descripción:** Pipeline CI/CD funcional con despliegue en Railway (Laravel + MySQL) y Cloudflare Pages (frontend). HTTPS/TLS, variables de entorno de producción, migraciones automatizadas, backups diarios, CORS configurado para el dominio de Pages.
- **RFs:** RNF-MAN-04, RNF-SEC-05
- **Cambios backend:**
  - `Procfile` para Railway
  - Variables de entorno de producción documentadas en `.env.example`
  - `config/cors.php` con dominio de Cloudflare Pages (**cambio sensible — notificar al usuario**)
  - Cifrado en reposo activado y verificado (columnas de costo con `encrypted` cast)
  - Backups diarios configurados en Railway
  - GitHub Actions: `php artisan test --coverage --min=70` en cada PR
- **Dependencias:** Puede montarse con un *hello world* desde ya — **no esperar a que el código esté completo**
- **Orden de implementación:** #12 en paralelo con Feature 1 para la infra base; completar en Fase 2

---

## Orden recomendado de implementación

```
#1  feature/catalogo-maestro          ← Fase 1 · Sin dependencias del dominio
#2  feature/ordenes-pedido            ← Fase 1 · Depende de: #1
#3  feature/recepcion-mercancia       ← Fase 1 · Depende de: #1, #2
#4  feature/inventario-lotes          ← Fase 1 · Depende de: #3 (lotes)  ★ CRÍTICO
#5  feature/traslados-bodegas         ← Fase 1 · Depende de: #4
#6  feature/produccion                ← Fase 1 · Depende de: #4, #1 (MP↔PT)  ★ CRÍTICO
#7  feature/alertas-notificaciones    ← Fase 2 · Depende de: #4, #1
#8  feature/dashboard-kpi             ← Fase 2 · Depende de: #4, #5, #6
#9  feature/reportes                  ← Fase 2 · Depende de: #4, #5, #6
#10 feature/bitacora-negocio          ← Fase 2 · Transversal — puede iniciar en paralelo con #7
#11 feature/swagger-docs              ← Fase 2 · Crece en paralelo, se completa al final
#12 feature/infra-deploy              ← Paralelo — iniciar infraestructura base AHORA
```

**Gráfico de dependencias simplificado:**

```
[Auth ✅] ──→ [#1 Catálogo] ──→ [#2 Órdenes] ──→ [#3 Recepción] ──→ [#4 Inventario+FEFO ★]
                                                                              │
                                                              ┌───────────────┤
                                                              ▼               ▼
                                                      [#5 Traslados]   [#6 Producción ★]
                                                              │               │
                                                              └───────┬───────┘
                                                                      ▼
                                              [#7 Alertas] [#8 Dashboard] [#9 Reportes]
                                                                      │
                                                              [#10 Bitácora]
```

---

## Conflictos potenciales entre features

| Conflicto | Features | Mitigación |
|---|---|---|
| `FefoService` compartido entre Traslados y Producción | #5 y #6 | Implementar en Feature #4 (Inventario) como servicio con interfaz propia; #5 y #6 lo inyectan por DIP |
| `MovimientoInventario` es la tabla central de múltiples módulos | #4, #5, #6, #8, #9 | El modelo vive en `app/Models/`; el acceso va por `InventarioRepositoryInterface`; ningún módulo escribe directo |
| Costos cifrados rompen queries de KPI | #8 y #9 | Verificar en Feature #8 que los KPIs que usan costo siguen calculando con `encrypted` cast; documentar en ADR |
| WhatsApp API aprobación externa bloquea Feature #7 | #7 | Email como Must en ruta crítica; WhatsApp desacoplado en cola separada como Should |
| CI con cobertura mínima puede fallar si tests se dejan al final | Todas | Escribir test junto al código en cada feature — no al final del sprint |

---

## Notas adicionales para implementación

### Convenciones obligatorias (per CLAUDE.md)
- Todo módulo sigue: `Controller → Service → Repository (interface) → Model`
- Binding interface→implementación en `AppServiceProvider::register()`
- Toda respuesta JSON usa `ApiResponseTrait` (nunca `response()->json()` directo)
- Toda escritura multi-fila de inventario: `DB::transaction()` + `lockForUpdate()`
- Movimientos son inmutables: correcciones = movimientos compensatorios con `movimiento_origen_id`
- Roles: siempre `Role::ENCARGADO_INVENTARIOS`, nunca strings literales
- Tipos PHP 8.3: tipos de retorno explícitos en todos los métodos; `readonly` donde aplique

### Patron de referencia
El módulo `app/Modules/Auth/` es la referencia canónica de implementación para todos los módulos nuevos.

### Pruebas (meta ≥ 70% en lógica de negocio — RNF-MAN-02)
Cada feature debe incluir tests en `tests/Feature/{Modulo}/{Modulo}Test.php` cubriendo:
éxito, validación, 401 (sin token), 403 (rol incorrecto), 404 (recurso no encontrado).
Features #4, #5, #6: también tests de concurrencia, FEFO y inmutabilidad.

### Migraciones nuevas
Prefijo `YYYY_MM_DD_HHMMSS_`. Tablas de movimientos: solo `created_at` (sin `updated_at`).
Cantidades y costos: `decimal(N,M)`. Costos con cast `encrypted`. Índice en `fecha_vencimiento`.

### No hacer
- Almacenar recetas o fórmulas en ninguna tabla o modelo (RNF-SEC-06)
- Tocar archivos fuera de `backend/`
- Modificar `config/` sin notificar al usuario
- Instalar paquetes Composer sin avisar
- Commits o push sin aprobación del usuario
