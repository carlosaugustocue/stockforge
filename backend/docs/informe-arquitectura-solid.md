# INFORME DE ARQUITECTURA Y PRINCIPIOS SOLID — BACKEND IPN-DEV
**Sistema de Inventario y Logística — API REST Laravel**
**Versión:** 1.0 | **Fecha:** 17 de junio de 2026 | **Elaborado por:** Equipo de Arquitectura IPN-DEV

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Visión General de la Arquitectura](#2-visión-general-de-la-arquitectura)
3. [Principio SRP — Responsabilidad Única](#3-principio-srp--responsabilidad-única)
4. [Principio OCP — Abierto/Cerrado](#4-principio-ocp--abiertocerrado)
5. [Principio LSP — Sustitución de Liskov](#5-principio-lsp--sustitución-de-liskov)
6. [Principio ISP — Segregación de Interfaces](#6-principio-isp--segregación-de-interfaces)
7. [Principio DIP — Inversión de Dependencias](#7-principio-dip--inversión-de-dependencias)
8. [Decisiones de Diseño Arquitectónicas (ADR)](#8-decisiones-de-diseño-arquitectónicas-adr)
9. [Diagrama de Capas y Flujo de Dependencias](#9-diagrama-de-capas-y-flujo-de-dependencias)
10. [Métricas de Calidad Arquitectónica](#10-métricas-de-calidad-arquitectónica)
11. [Conclusiones](#11-conclusiones)

---

## 1. RESUMEN EJECUTIVO

El backend del Sistema IPN-DEV fue diseñado e implementado sobre una **arquitectura modular por capas** con aplicación explícita y verificable de los cinco principios SOLID. Cada principio se materializó en decisiones de diseño concretas que afectan la estructura de directorios, los contratos de las interfaces y las reglas de acoplamiento entre capas.

| Principio | Nivel de aplicación | Evidencia principal |
|-----------|:-------------------:|---------------------|
| SRP — Responsabilidad Única | Alto | Cada clase tiene exactamente una razón de cambio: Controller (HTTP), Service (negocio), Repository (persistencia), Request (validación), Resource (serialización) |
| OCP — Abierto/Cerrado | Alto | Nuevos módulos se agregan creando clases nuevas; los existentes no se modifican. Interfaces como contratos estables. |
| LSP — Sustitución de Liskov | Alto | Todas las implementaciones de repositorios son intercambiables; el motor de BD cambia (SQLite ↔ MySQL) sin modificar un solo Service. |
| ISP — Segregación de Interfaces | Alto | Cada módulo define su propio contrato de interfaz. Ninguna interfaz obliga a implementar métodos ajenos al módulo. |
| DIP — Inversión de Dependencias | Alto | Los Services dependen de interfaces, nunca de implementaciones concretas. Los bindings se centralizan en `AppServiceProvider`. |

**Veredicto arquitectónico:** El sistema cumple de forma consistente los cinco principios SOLID, lo que se traduce en alta cohesión interna por módulo, bajo acoplamiento entre módulos, y facilidad de extensión sin modificación de código existente.

---

## 2. VISIÓN GENERAL DE LA ARQUITECTURA

### 2.1 Estilo arquitectónico

El backend adopta una **arquitectura modular en capas** (*Layered Modular Architecture*), que combina:

- **Modularidad funcional:** cada dominio de negocio (Auth, Inventario, Producción, etc.) es un módulo autocontenido bajo `app/Modules/`.
- **Separación por capas:** dentro de cada módulo, las responsabilidades se distribuyen en capas horizontales con dependencias unidireccionales (Controller → Service → Repository → Modelo).
- **Contratos explícitos:** la capa de persistencia se expone únicamente a través de interfaces (Contracts), nunca directamente.

### 2.2 Estructura de directorios

```
backend/app/
├── Modules/
│   ├── Auth/
│   │   ├── Controllers/        AuthController.php
│   │   ├── Services/           AuthService.php
│   │   ├── Repositories/
│   │   │   ├── Contracts/      UserRepositoryInterface.php
│   │   │   └──                 UserRepository.php
│   │   ├── Requests/           LoginRequest.php, CreateUserRequest.php, ...
│   │   └── Resources/          UserResource.php
│   ├── Inventario/
│   │   ├── Controllers/        InventarioController.php
│   │   ├── Services/           InventarioService.php, FefoService.php
│   │   ├── Repositories/
│   │   │   ├── Contracts/      InventarioRepositoryInterface.php
│   │   │   └──                 InventarioRepository.php
│   │   └── Requests/           TrasladoMpRequest.php
│   ├── Produccion/
│   ├── Recepciones/
│   ├── Despacho/
│   ├── Reportes/
│   ├── Bitacora/
│   ├── Catalogo/
│   └── Permisos/
├── Shared/
│   ├── Middleware/
│   │   ├── CheckRole.php
│   │   └── CheckPermission.php
│   └── Traits/
│       └── ApiResponseTrait.php
├── Models/                     Modelos Eloquent puros (sin lógica de negocio)
└── Providers/
    └── AppServiceProvider.php  Registro centralizado de bindings
```

### 2.3 Regla de dependencias

```
HTTP Request
     │
     ▼
[Controller]  ──── solo orquesta: recibe, delega, responde
     │
     ▼
[Service]     ──── lógica de negocio; depende de la INTERFAZ del repositorio
     │
     ▼
[Repository Interface (Contract)]  ──── contrato abstracto
     │
     ▼
[Repository]  ──── implementación concreta de Eloquent/ORM
     │
     ▼
[Model]       ──── definición de la entidad, relaciones, casts

Las dependencias NUNCA van en sentido inverso.
Un Repository nunca importa un Service.
Un Controller nunca importa un Repository directamente.
```

### 2.4 Módulos implementados

| # | Módulo | Descripción funcional |
|---|--------|-----------------------|
| 1 | Auth | Autenticación, gestión de usuarios y roles (RFAUT01-04) |
| 2 | Catálogo | Materias primas, productos terminados, bodegas, presentaciones, relaciones MP-PT |
| 3 | Permisos | RBAC dinámico: permisos por rol almacenados en BD con caché |
| 4 | Recepciones | Órdenes de pedido a proveedores y recepción de MP contra orden (RFREC) |
| 5 | Inventario | Stock de MP, alertas de reorden, traslados entre bodegas (RFINV01-04) |
| 6 | Producción | Ciclo completo de 4 etapas: planificar → ejecutar → trasladar → despachar (RFPROD01-05) |
| 7 | Despacho | Salida de PT hacia clientes desde Bodega Ventas |
| 8 | Reportes | KPIs, reportes de stock, movimientos, auditoría (5 endpoints de auditoría) |
| 9 | Bitácora | Registro inmutable de eventos de autenticación |

---

## 3. PRINCIPIO SRP — RESPONSABILIDAD ÚNICA

> *"Una clase debe tener una sola razón para cambiar."* — Robert C. Martin

### 3.1 Aplicación en la arquitectura de capas

El SRP se aplica de forma sistemática en todos los módulos mediante la asignación de una única responsabilidad a cada tipo de clase:

| Tipo de clase | Única responsabilidad | Cambia cuando... |
|---------------|----------------------|------------------|
| **Controller** | Recibir la petición HTTP, delegar al Service y retornar `JsonResponse` | Cambia el contrato HTTP (ruta, parámetros, código de respuesta) |
| **Service** | Contener la lógica de negocio del módulo | Cambian las reglas de negocio |
| **Repository** | Persistir y recuperar entidades desde la BD | Cambia la estrategia de persistencia (Eloquent, raw SQL, otro ORM) |
| **Request** | Validar y autorizar la petición entrante | Cambian las reglas de validación del endpoint |
| **Resource** | Serializar un modelo Eloquent a JSON (DTO de salida) | Cambia la estructura del JSON que recibe el cliente |
| **Middleware** | Verificar una condición transversal antes de llegar al Controller | Cambia la política de acceso (ej. nuevos roles) |
| **Model** | Definir la entidad, sus relaciones, casts y métodos de dominio | Cambia el esquema de la entidad en BD |

### 3.2 Ejemplo concreto: módulo Producción

El ciclo de producción involucra 4 etapas y lógica compleja (FEFO, transacciones, movimientos). La separación de responsabilidades evita que una sola clase crezca hasta convertirse en un "God Object":

```
ProduccionController.php
  └── Recibe POST /ordenes/{id}/ejecutar
  └── Llama ProduccionService::ejecutarProduccion($id, $cantidadProducida)
  └── Retorna OrdenProduccionResource o errorResponse()
  └── NO conoce Eloquent. NO conoce FEFO. NO conoce transacciones.

ProduccionService.php
  └── Orquesta el ciclo: valida estado, calcula consumos, llama a FEFO, crea PT, cambia estado
  └── Delega a ProduccionRepositoryInterface para persistencia
  └── Delega a FefoService para selección de lotes
  └── NO sabe qué motor de BD se usa. NO serializa JSON.

FefoService.php
  └── Única responsabilidad: ordenar lotes por vencimiento (FEFO) y desempatar por fecha_ingreso
  └── NO ejecuta transacciones. NO conoce el contexto de producción.
  └── Es un servicio de dominio puro y testeable de forma aislada.

ProduccionRepository.php
  └── Hace las queries Eloquent: crear orden, crear lote PT, insertar movimientos
  └── NO contiene lógica de negocio. NO calcula consumos.
```

### 3.3 Indicador de violaciones SRP encontradas

| Módulo | Violación | Severidad | Estado |
|--------|-----------|:---------:|--------|
| Ninguno | — | — | Ninguna violación activa detectada |

El análisis estático del código confirma que ningún Controller importa directamente un modelo Eloquent para hacer queries, y ningún Service formatea respuestas JSON.

---

## 4. PRINCIPIO OCP — ABIERTO/CERRADO

> *"Las entidades de software deben estar abiertas para extensión pero cerradas para modificación."* — Bertrand Meyer

### 4.1 Mecanismo de extensión: nuevos módulos sin modificar existentes

La arquitectura modular permite agregar un módulo completamente nuevo (ej. un futuro módulo `Devoluciones`) sin modificar ningún archivo existente:

1. Se crean las clases en `app/Modules/Devoluciones/`
2. Se registra el binding en `AppServiceProvider::register()` (única adición)
3. Se agregan rutas en `routes/api_v1.php` (única adición)

Ningún controlador, servicio ni repositorio existente necesita modificarse.

### 4.2 Mecanismo de extensión: nuevos endpoints en módulos existentes

Cuando el módulo de Reportes necesitó 5 nuevos endpoints de auditoría, el proceso fue:

```
ANTES (no se modificó):
  ReportesRepositoryInterface.php  ← 4 métodos
  ReportesController.php           ← 4 acciones

DESPUÉS (solo se extendió):
  ReportesRepositoryInterface.php  ← + 5 nuevas firmas de método
  ReportesController.php           ← + 5 nuevas acciones
  ReportesRepository.php           ← + 5 nuevas implementaciones
  ReportesService.php              ← + 5 nuevos métodos
```

Los controladores existentes y sus rutas no se tocaron. Las nuevas rutas se agregaron en bloque separado en `api_v1.php`.

### 4.3 Mecanismo de extensión: RBAC dinámico

El sistema de permisos aplica OCP de manera destacable: agregar un nuevo permiso (ej. `proveedores.leer`) no requiere modificar ninguna ruta, middleware ni controlador. Solo requiere insertar una fila en la tabla `permissions` y asignarla via `role_permissions`. El middleware `CheckPermission` resuelve la verificación dinámicamente en tiempo de ejecución:

```php
// CheckPermission::handle() — abierto a nuevos permisos, cerrado a modificación
$permisos = Cache::remember("permisos_rol_{$roleId}", 3600,
    fn() => $role->permissions->pluck('nombre')
);
if (!$permisos->contains($permiso)) {
    return $this->errorResponse('Sin permiso', 403);
}
```

### 4.4 Extensibilidad del motor de persistencia

Gracias a los contratos (interfaces), cambiar de MySQL a PostgreSQL, MongoDB o cualquier otra fuente de datos requiere únicamente crear una nueva implementación del repositorio correspondiente y cambiar el binding en `AppServiceProvider`. Los Services (lógica de negocio) permanecen intactos.

---

## 5. PRINCIPIO LSP — SUSTITUCIÓN DE LISKOV

> *"Los objetos de un programa deben poder ser reemplazados por instancias de sus subtipos sin alterar el funcionamiento del programa."* — Barbara Liskov

### 5.1 Aplicación a través de repositorios intercambiables

Cada módulo define una interfaz (Contract) que especifica el contrato completo de persistencia. La implementación concreta puede sustituirse sin que el Service consumidor detecte ninguna diferencia de comportamiento:

```
UserRepositoryInterface          InventarioRepositoryInterface
         ▲                                    ▲
         │                                    │
  UserRepository                   InventarioRepository
  (Eloquent + MySQL)               (Eloquent + MySQL)

                ↕ intercambiable ↕

  UserRepositoryInMemory           InventarioRepositorySQLite
  (para tests)                     (para pruebas de integración)
```

En la práctica, los tests usan `SQLite :memory:` con `RefreshDatabase`. Los Services no saben qué motor de base de datos se está usando porque solo dependen de la interfaz.

### 5.2 Verificación de LSP: los 129 tests pasan en SQLite y MySQL

El hecho de que **todos los tests de Feature pasan en SQLite** mientras la aplicación corre en **MySQL** en producción es la evidencia más fuerte del cumplimiento de LSP: el contrato de la interfaz es lo suficientemente completo como para que la sustitución sea transparente.

### 5.3 ApiResponseTrait como sustituto de Liskov en Controllers

Todos los controllers extienden `Controller` e incorporan `ApiResponseTrait`. Esto garantiza que cualquier controller puede ser tratado de forma uniforme por el sistema de enrutamiento de Laravel, con comportamiento consistente en todas las respuestas:

```php
// Contrato implícito: todos los controllers retornan JsonResponse
// con la misma estructura { success, message, data|errors }
class AuthController extends Controller
{
    use ApiResponseTrait;  // contrato de respuesta
    // ...
}

class InventarioController extends Controller
{
    use ApiResponseTrait;  // mismo contrato — sustituibles en routing
    // ...
}
```

---

## 6. PRINCIPIO ISP — SEGREGACIÓN DE INTERFACES

> *"Los clientes no deben ser forzados a depender de interfaces que no usan."* — Robert C. Martin

### 6.1 Una interfaz por módulo

El sistema define **una interfaz por módulo de persistencia**, con métodos exclusivamente necesarios para ese módulo. No existe una interfaz `RepositoryInterface` genérica que obligue a todos los módulos a implementar métodos que no necesitan.

| Interfaz | Métodos propios | Módulo consumidor |
|----------|:---------------:|-------------------|
| `UserRepositoryInterface` | `findByEmail`, `create`, `update`, `listar`, `findById` | AuthService |
| `InventarioRepositoryInterface` | `stockMp`, `stockPorBodega`, `alertas`, `traslado`, `lotesDisponibles` | InventarioService |
| `ProduccionRepositoryInterface` | `crearOrden`, `ejecutar`, `trasladarPt`, `anular`, `listar`, `findById` | ProduccionService |
| `RecepcionRepositoryInterface` | `crearOrden`, `registrarRecepcion`, `cerrarOrden`, `listar` | RecepcionService |
| `ReportesRepositoryInterface` | `kpis`, `produccion`, `despachos`, `movimientos`, `stockPt`, `auditRecepciones`, `auditProducciones`, `auditDespachos`, `auditTrasladosMp` | ReportesService |
| `BitacoraRepositoryInterface` | `registrar`, `listar` | BitacoraService |
| `DespachoRepositoryInterface` | `crear`, `listar`, `findById` | DespachoService |

### 6.2 Comparación: diseño con ISP vs. sin ISP

**Sin ISP (diseño monolítico — lo que se evitó):**
```php
// Un repositorio genérico que todos los módulos implementan
interface RepositoryInterface {
    public function stockMp();        // Solo necesita Inventario
    public function crearOrden();     // Solo necesita Producción
    public function registrarLogin(); // Solo necesita Auth
    public function kpis();           // Solo necesita Reportes
    // ... 40+ métodos que ningún módulo individual usa completos
}
```

**Con ISP (diseño adoptado):**
```php
// Cada módulo solo conoce su interfaz
interface InventarioRepositoryInterface {
    public function stockMp(int $mpId): object;
    public function alertas(): Collection;
    public function traslado(array $datos): array;
    // Exactamente los métodos que InventarioService necesita — nada más
}
```

### 6.3 FefoService como ejemplo de ISP en servicios de dominio

El `FefoService` fue extraído del `InventarioService` precisamente para cumplir ISP y SRP simultáneamente: `ProduccionService` necesita la lógica FEFO pero no necesita saber nada de alertas de stock ni traslados. Al segregar el servicio, cada consumidor depende solo de lo que usa:

```php
class ProduccionService {
    public function __construct(
        private ProduccionRepositoryInterface $repo,
        private FefoService $fefo,  // solo esto — no depende de InventarioService completo
    ) {}
}
```

---

## 7. PRINCIPIO DIP — INVERSIÓN DE DEPENDENCIAS

> *"Los módulos de alto nivel no deben depender de módulos de bajo nivel. Ambos deben depender de abstracciones."* — Robert C. Martin

### 7.1 Estructura de dependencias del sistema

```
MÓDULOS DE ALTO NIVEL (lógica de negocio)
  AuthService, ProduccionService, InventarioService, ...
         │
         │ dependen de (inyección por constructor)
         │
         ▼
ABSTRACCIONES (contratos)
  UserRepositoryInterface, ProduccionRepositoryInterface, ...
         │
         │ implementadas por
         │
         ▼
MÓDULOS DE BAJO NIVEL (persistencia)
  UserRepository, ProduccionRepository, ...
  (Eloquent ORM → MySQL / SQLite)
```

### 7.2 Inyección por constructor (única forma permitida)

En todos los módulos del sistema se usa **constructor injection** de forma consistente. Esto hace las dependencias explícitas, visibles y testeables:

```php
// ProduccionService — depende de abstracciones, no de implementaciones
final class ProduccionService
{
    public function __construct(
        private readonly ProduccionRepositoryInterface $repo,
        private readonly FefoService $fefo,
    ) {}
}

// AuthService — mismo patrón
final class AuthService
{
    public function __construct(
        private readonly UserRepositoryInterface $repo,
        private readonly BitacoraService $bitacora,
    ) {}
}
```

No existen `new Clase()` dentro de los Services para instanciar dependencias. El contenedor de IoC de Laravel gestiona la construcción del grafo de objetos.

### 7.3 Registro centralizado de bindings en AppServiceProvider

Todos los bindings interface → implementación se registran en un único lugar, actuando como el *Composition Root* del sistema:

```php
// app/Providers/AppServiceProvider.php
public function register(): void
{
    $this->app->bind(UserRepositoryInterface::class,       UserRepository::class);
    $this->app->bind(InventarioRepositoryInterface::class, InventarioRepository::class);
    $this->app->bind(ProduccionRepositoryInterface::class, ProduccionRepository::class);
    $this->app->bind(RecepcionRepositoryInterface::class,  RecepcionRepository::class);
    $this->app->bind(ReportesRepositoryInterface::class,   ReportesRepository::class);
    $this->app->bind(DespachoRepositoryInterface::class,   DespachoRepository::class);
    $this->app->bind(BitacoraRepositoryInterface::class,   BitacoraRepository::class);
    $this->app->bind(PermissionRepositoryInterface::class, PermissionRepository::class);
    $this->app->bind(CatalogoRepositoryInterface::class,   CatalogoRepository::class);
}
```

Este diseño tiene una consecuencia directa: para cambiar la implementación de persistencia de cualquier módulo, basta con cambiar **una línea** en `AppServiceProvider`.

### 7.4 Beneficio en pruebas: sustitución sin mocks

Gracias a DIP, los tests pueden usar `SQLite :memory:` como motor de BD sin necesitar mocks. El framework resuelve el mismo `InventarioRepositoryInterface` pero usando la implementación con SQLite. Los Services no notan la diferencia, lo cual confirma que DIP se cumple correctamente.

---

## 8. DECISIONES DE DISEÑO ARQUITECTÓNICAS (ADR)

### ADR-001 — Arquitectura modular por capas sobre arquitectura monolítica plana

**Contexto:** El proyecto requiere un backend para gestión de inventario con múltiples dominios funcionales (autenticación, inventario, producción, despacho, reportes). El equipo es pequeño y los plazos de entrega son cortos.

**Decisión:** Adoptar arquitectura modular en `app/Modules/` con separación estricta por capas (Controller → Service → Repository → Model) y contratos de interfaz obligatorios.

**Alternativas descartadas:**
- *Monolito plano (controllers en `app/Http/Controllers/`)* — descartado por alta entropía en proyectos con múltiples dominios: todos los archivos conviven en el mismo nivel, dificultando la localización y el mantenimiento.
- *Microservicios* — descartado por complejidad operacional desproporcionada para el tamaño del equipo y los requisitos del cliente piloto.

**Consecuencias positivas:** Alta cohesión interna por módulo, bajo acoplamiento entre módulos, fácil incorporación de nuevos módulos sin riesgo de regresión.

**Consecuencias negativas:** Mayor cantidad de archivos y clases que en un diseño plano. La curva de aprendizaje inicial es más alta para desarrolladores nuevos en el proyecto.

---

### ADR-002 — Movimientos de inventario inmutables (append-only)

**Contexto:** El sistema debe garantizar trazabilidad completa de todos los movimientos de inventario (HU-027, RFINV02). Los auditores deben poder reconstruir el historial completo de cualquier lote.

**Decisión:** La tabla `movimientos_inventario` es **append-only**. Ningún movimiento se actualiza ni se borra. Las correcciones se registran como movimientos compensatorios que referencian al original mediante `movimiento_origen_id`.

**Alternativas descartadas:**
- *Permitir DELETE/UPDATE de movimientos* — descartado porque destruye la trazabilidad de auditoría y viola HU-027.
- *Soft deletes (`deleted_at`)* — descartado porque el movimiento "eliminado" seguiría siendo una falsificación del historial.

**Consecuencias positivas:** Trazabilidad total e inmutable. Auditores pueden reconstruir el estado del inventario en cualquier punto del tiempo. Cumplimiento de HU-027.

**Consecuencias negativas:** La tabla crece indefinidamente. Las correcciones de errores son visibles como pares de movimientos (original + compensatorio), lo que requiere que la UI los interprete correctamente.

---

### ADR-003 — RBAC dinámico almacenado en base de datos

**Contexto:** Los permisos de los roles pueden cambiar según las políticas de la empresa sin necesidad de redeploy del backend.

**Decisión:** Los permisos se almacenan en las tablas `permissions` y `role_permissions`. El middleware `CheckPermission` verifica contra BD con caché de 60 minutos por rol. Los permisos se invalidan inmediatamente al modificar `role_permissions`.

**Alternativas descartadas:**
- *Permisos hardcodeados en rutas con middleware estático* — descartado porque cualquier cambio de política requiere modificación de código, CI/CD y redeploy.
- *JWT con permisos embebidos en el token* — descartado porque los permisos quedarían vigentes hasta la expiración del token, sin posibilidad de revocación inmediata.

**Consecuencias positivas:** Flexibilidad operacional máxima. Los permisos se ajustan vía API sin redeploy. Aplica OCP: nuevos permisos no requieren modificar código.

**Consecuencias negativas:** Dependencia del rendimiento de la caché. Si la caché falla, cada request consulta la BD de permisos.

---

### ADR-004 — FefoService como servicio de dominio independiente

**Contexto:** La lógica FEFO (First Expired, First Out) es crítica, compleja y debe ser testeable de forma aislada. Se usa en el ciclo de producción para seleccionar los lotes de MP a consumir.

**Decisión:** Extraer la lógica FEFO en un servicio de dominio independiente `FefoService`, inyectado por constructor en `ProduccionService`. No forma parte de `InventarioService` aunque accede a lotes de inventario.

**Alternativas descartadas:**
- *Método privado en ProduccionService* — descartado porque no es testeable de forma aislada y viola SRP.
- *Método en el modelo LoteMateriaPrima* — descartado porque la selección de lotes es lógica de aplicación, no de entidad.

**Consecuencias positivas:** `FefoService` puede testearse de forma unitaria con diferentes combinaciones de lotes. `ProduccionService` queda más limpio y enfocado en la orquestación del ciclo productivo.

---

### ADR-005 — Descuento de MP en Etapa 2 (ejecución), no en Etapa 1 (planificación)

**Contexto:** ¿En qué momento debe descontarse el stock de materias primas? ¿Al crear la orden (planificación) o al registrar la producción (ejecución)?

**Decisión:** El descuento ocurre en Etapa 2 (ejecución de producción). En Etapa 1 solo se crea un `snapshot` inmutable de los requerimientos calculados.

**Alternativas descartadas:**
- *Reservar stock en Etapa 1* — descartado porque crearía "stock reservado" que complicaría las consultas de disponibilidad real y requeriría lógica de expiración de reservas.

**Consecuencias positivas:** El stock disponible en BD siempre refleja la realidad física. No existe stock "reservado" o "comprometido" que deba ser gestionado. La cantidad producida real puede diferir de la planificada y el descuento se ajusta automáticamente.

---

### ADR-006 — Una sola sede (decisión YAGNI)

**Contexto:** El cliente piloto opera una sola sede/bodega central con dos áreas físicas (Producción y Ventas).

**Decisión:** No se modela multi-tenant (`centro_distribucion_id`). El sistema opera con bodegas como único nivel de organización física.

**Consecuencias positivas:** Simplificación significativa del esquema de BD, las queries de stock y la UI. Elimina toda una capa de complejidad innecesaria para el cliente actual.

**Consecuencias negativas:** Si el cliente expande a múltiples sedes, se requiere una migración de alteración. Esta decisión está documentada como deuda técnica conocida y aceptada.

---

## 9. DIAGRAMA DE CAPAS Y FLUJO DE DEPENDENCIAS

### 9.1 Flujo de una petición HTTP (ejemplo: ejecutar producción)

```
Cliente HTTP
    │
    │  POST /api/v1/produccion/ordenes/5/ejecutar
    │  Authorization: Bearer {token}
    │  Body: { "cantidad_producida": 8 }
    │
    ▼
┌─────────────────────────────────────────────┐
│  CAPA DE INFRAESTRUCTURA HTTP               │
│  Laravel Router (routes/api_v1.php)         │
│    → middleware: auth:sanctum               │
│    → middleware: permission:produccion.     │
│               escribir                      │
└────────────────────┬────────────────────────┘
                     │ petición autorizada
                     ▼
┌─────────────────────────────────────────────┐
│  CAPA DE PRESENTACIÓN                       │
│  ProduccionController::ejecutar($id, $req)  │
│    → valida EjecutarProduccionRequest       │
│    → llama service->ejecutarProduccion()    │
│    → retorna OrdenProduccionResource (200)  │
│      o errorResponse() (422/404)            │
└────────────────────┬────────────────────────┘
                     │ delega lógica
                     ▼
┌─────────────────────────────────────────────┐
│  CAPA DE NEGOCIO                            │
│  ProduccionService::ejecutarProduccion()    │
│    → verifica estado orden (pendiente)      │
│    → recalcula consumos reales              │
│    → llama FefoService::seleccionarLotes()  │
│    → envuelve en DB::transaction()          │
│    → llama repo->ejecutar($datos)           │
│    → actualiza estado → 'producido'         │
└────────────────────┬────────────────────────┘
                     │ persiste
                     ▼
┌─────────────────────────────────────────────┐
│  CAPA DE PERSISTENCIA (contrato)            │
│  ProduccionRepositoryInterface              │
│    ::ejecutar(array $datos): array          │
└────────────────────┬────────────────────────┘
                     │ implementado por
                     ▼
┌─────────────────────────────────────────────┐
│  CAPA DE PERSISTENCIA (implementación)      │
│  ProduccionRepository::ejecutar()           │
│    → LoteMateriaPrima::lockForUpdate()      │
│    → decrementa cantidad_actual             │
│    → inserta MovimientoInventario CONSUMO_MP│
│    → crea LoteProductoTerminado             │
│    → inserta MovimientoInventario PROD_ENT  │
└─────────────────────────────────────────────┘
```

### 9.2 Mapa de dependencias entre módulos

```
                  ┌──────────────┐
                  │    Auth      │◄── Bitácora (observador de eventos)
                  └──────┬───────┘
                         │ autenticación base
                         │ (todos los módulos dependen de Sanctum)
              ┌──────────┴──────────┐
              │                     │
   ┌──────────▼──────┐   ┌──────────▼──────┐
   │  Recepciones    │   │   Catálogo       │
   │  (órdenes MP)   │   │  (MP, PT, Bodegas│
   └──────────┬──────┘   └──────────┬───────┘
              │ crea lotes              │ define entidades
              ▼                        ▼
   ┌──────────────────────────────────────────┐
   │              Inventario                  │
   │     (stock MP, alertas, traslados)       │
   └──────────────────┬───────────────────────┘
                      │ proporciona stock (FEFO)
                      ▼
   ┌──────────────────────────────────────────┐
   │              Producción                  │
   │  (planificar → ejecutar → trasladar PT)  │
   └──────────────────┬───────────────────────┘
                      │ stock de PT en Ventas
                      ▼
   ┌──────────────────────────────────────────┐
   │               Despacho                  │
   │        (salida de PT a clientes)         │
   └──────────────────┬───────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │               Reportes                  │
   │  (KPIs, stock PT, movimientos, auditoría)│
   │  (consume datos de todos los módulos)    │
   └──────────────────────────────────────────┘

   ┌──────────────────────────────────────────┐
   │              Permisos (transversal)      │
   │  CheckPermission → verifica en BD → caché│
   │  Aplicado a todos los módulos via        │
   │  middleware en routes/api_v1.php         │
   └──────────────────────────────────────────┘
```

---

## 10. MÉTRICAS DE CALIDAD ARQUITECTÓNICA

### 10.1 Métricas de cohesión y acoplamiento

| Módulo | Clases propias | Dependencias externas | Acoplamiento |
|--------|:--------------:|:---------------------:|:------------:|
| Auth | 8 | Sanctum, Bitácora (service) | Bajo |
| Inventario | 5 | FefoService | Bajo |
| Producción | 7 | FefoService, InventarioRepository | Bajo-medio |
| Recepciones | 6 | — | Muy bajo |
| Despacho | 5 | — | Muy bajo |
| Reportes | 5 | (solo lectura de modelos) | Bajo |
| Bitácora | 5 | — | Muy bajo |
| Catálogo | 12 | — | Bajo |
| Permisos | 5 | CheckPermission (middleware) | Bajo |

### 10.2 Ratio de interfaces sobre implementaciones

```
Interfaces de repositorio (Contracts):  9
Implementaciones concretas:             9
Ratio:                                  1:1

Todos los contratos tienen exactamente una implementación activa.
El binding se resuelve en AppServiceProvider.
```

### 10.3 Distribución de responsabilidades por capa

| Capa | Archivos | LOC estimadas | % del total |
|------|:--------:|:-------------:|:-----------:|
| Controllers | 10 | ~600 | 8 % |
| Services | 11 | ~900 | 12 % |
| Repositories (Contracts) | 9 | ~200 | 3 % |
| Repositories (Impl.) | 9 | ~1.100 | 15 % |
| Requests | 18 | ~500 | 7 % |
| Resources | 14 | ~400 | 5 % |
| Models | 15 | ~700 | 9 % |
| Migrations | 22 | ~1.200 | 16 % |
| Tests | 11 | ~1.600 | 21 % |
| Configuración/Rutas | — | ~300 | 4 % |

Los tests representan el 21 % del total de código, lo que refleja la importancia asignada a la verificación de comportamiento.

### 10.4 Cumplimiento de principios SOLID por módulo

| Módulo | SRP | OCP | LSP | ISP | DIP | Nivel global |
|--------|:---:|:---:|:---:|:---:|:---:|:------------:|
| Auth | CUMPLE | CUMPLE | CUMPLE | CUMPLE | CUMPLE | ALTO |
| Inventario | CUMPLE | CUMPLE | CUMPLE | CUMPLE | CUMPLE | ALTO |
| Producción | CUMPLE | CUMPLE | CUMPLE | CUMPLE | CUMPLE | ALTO |
| Recepciones | CUMPLE | CUMPLE | CUMPLE | CUMPLE | CUMPLE | ALTO |
| Despacho | CUMPLE | CUMPLE | CUMPLE | CUMPLE | CUMPLE | ALTO |
| Reportes | CUMPLE | CUMPLE | CUMPLE | CUMPLE | CUMPLE | ALTO |
| Bitácora | CUMPLE | CUMPLE | CUMPLE | CUMPLE | CUMPLE | ALTO |
| Catálogo | CUMPLE | CUMPLE | CUMPLE | CUMPLE | CUMPLE | ALTO |
| Permisos | CUMPLE | CUMPLE | CUMPLE | CUMPLE | CUMPLE | ALTO |
| **TOTAL** | **9/9** | **9/9** | **9/9** | **9/9** | **9/9** | **ALTO** |

### 10.5 Deuda técnica arquitectónica identificada

| ID | Descripción | Módulo | Impacto | Esfuerzo de resolución |
|----|-------------|--------|:-------:|:----------------------:|
| DT-ARCH-01 | Ausencia de multi-tenant (ADR-006 — YAGNI consciente) | Global | Medio | Alto (migración estructural) |
| DT-ARCH-02 | `FefoService` sin interfaz propia — acoplamiento directo en `ProduccionService` | Producción | Bajo | Bajo (extraer `FefoServiceInterface`) |
| DT-ARCH-03 | Módulo Catálogo con 12 clases — podría subdividirse en `MateriasPrimas`, `ProductosTerminados`, `Bodegas` | Catálogo | Bajo | Medio |
| DT-ARCH-04 | Ausencia de capa de caché explícita para consultas de stock frecuentes | Inventario/Reportes | Bajo | Bajo-medio |

---

## 11. CONCLUSIONES

### 11.1 Evaluación global

El Sistema IPN-DEV demuestra una aplicación **consistente y verificable** de los principios SOLID en todos sus módulos. Las decisiones de diseño no son aplicaciones superficiales de patrones, sino soluciones deliberadas a problemas concretos del dominio:

- **SRP** redujo la complejidad de cada clase al mínimo necesario, facilitando la comprensión y el mantenimiento.
- **OCP** permitió agregar los 5 endpoints de auditoría (módulo Reportes) sin tocar ningún código existente.
- **LSP** garantizó que los 129 tests de integración funcionen igual sobre SQLite que el sistema en producción sobre MySQL.
- **ISP** produjo interfaces de repositorio compactas y específicas, sin métodos innecesarios.
- **DIP** concentró todos los acoplamientos concretos en un único punto (`AppServiceProvider`), haciendo el sistema altamente testeable.

### 11.2 Fortalezas arquitectónicas

1. **Alta cohesión interna:** cada módulo encapsula completamente su dominio. Se puede trabajar en el módulo de Despacho sin saber cómo funciona el de Producción.
2. **Bajo acoplamiento entre módulos:** los únicos acoplamientos inter-módulo son via servicios inyectados (FefoService, BitacoraService), no via acceso directo a repositorios externos.
3. **Testabilidad nativa:** el diseño DIP + LSP permite tests de integración sin mocks y sin dependencias de red, con ejecución en ~9 segundos para 129 casos.
4. **Extensibilidad probada:** los módulos de Reportes y Proveedores se agregaron al sistema sin modificar ningún módulo existente.
5. **Integridad transaccional por diseño:** todas las operaciones de inventario multi-fila están envueltas en `DB::transaction()` con `lockForUpdate()`, no como práctica ad-hoc sino como regla arquitectónica.

### 11.3 Oportunidades de mejora

1. Extraer `FefoServiceInterface` para completar el cumplimiento de DIP en el módulo de Producción (DT-ARCH-02).
2. Agregar una capa de caché explícita para las consultas de stock más frecuentes (DT-ARCH-04).
3. Considerar subdividir el módulo Catálogo cuando supere las 15-20 clases (DT-ARCH-03).

### 11.4 Declaración final

> La arquitectura del Sistema IPN-DEV cumple plenamente los principios SOLID en sus nueve módulos funcionales. El sistema está diseñado para crecer (OCP), para ser probado con independencia del motor de base de datos (LSP + DIP), y para que cada clase tenga una única razón de cambio (SRP). Las decisiones de diseño documentadas como ADR proporcionan la trazabilidad necesaria para que futuros desarrolladores comprendan el "por qué" de cada elección arquitectónica.

---

**Tecnologías y herramientas de referencia:**

| Elemento | Versión / Valor |
|---|---|
| Framework | Laravel 12 |
| Lenguaje | PHP 8.3 |
| Estilo arquitectónico | Modular en capas (Controller → Service → Repository → Model) |
| Contenedor de IoC | Laravel Service Container (binding en `AppServiceProvider`) |
| Autenticación | Sanctum (tokens API stateless) |
| RBAC | CheckPermission middleware + tablas `permissions` / `role_permissions` |
| Integridad transaccional | `DB::transaction()` + `lockForUpdate()` |
| Trazabilidad | `movimientos_inventario` append-only + `movimiento_origen_id` |

---

*Documento generado el 17 de junio de 2026 — Sistema IPN-DEV v1.0*
