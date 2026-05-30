# CLAUDE.md — Backend IPN-DEV (Sistema de Inventario Nuclear)
> Fuente de verdad única para todos los agentes Claude que trabajen en este backend.
> Cualquier agente que lea este archivo tiene el contexto completo para operar de forma autónoma.

---

## 1. IDENTIDAD DEL PROYECTO

**Proyecto:** Sistema de Inventario IPN-DEV
**Stack:** Laravel 12 + PHP 8.3 + Sanctum + Pest PHP
**Base de datos:** SQLite (desarrollo) / MySQL (producción)
**Tipo de API:** REST, versionada, JSON puro
**Frontend:** Next.js (repositorio separado — los agentes de backend NO tocan nada de frontend)
**Despliegue:** Backend Laravel + MySQL en Railway · Frontend en Cloudflare Pages. CORS configurado en `config/cors.php` para el dominio de Pages (cambio sensible — ver regla global 2).

---

## 2. ESTRUCTURA DEL BACKEND

```
backend/
├── app/
│   ├── Http/
│   │   └── Controllers/
│   │       └── Controller.php              # Clase base abstracta (solo herencia)
│   ├── Models/
│   │   ├── Role.php                        # RBAC — constantes de roles
│   │   └── User.php                        # Authenticatable + HasApiTokens
│   ├── Modules/                            # ARQUITECTURA MODULAR — aqui vive todo
│   │   └── {NombreModulo}/
│   │       ├── Controllers/                # Solo orquestacion HTTP
│   │       ├── Services/                   # Logica de negocio
│   │       ├── Repositories/
│   │       │   ├── Contracts/              # Interfaces (DIP)
│   │       │   └── {Nombre}Repository.php  # Implementacion concreta
│   │       ├── Requests/                   # Form Requests (validacion)
│   │       └── Resources/                  # API Resources (DTO salida)
│   ├── Providers/
│   │   └── AppServiceProvider.php          # Bindings interface→implementacion
│   └── Shared/
│       ├── Middleware/
│       │   ├── CheckRole.php               # RBAC estático — middleware 'role:xxx'
│       │   └── CheckPermission.php         # RBAC dinámico — middleware 'permission:recurso.accion'
│       └── Traits/
│           └── ApiResponseTrait.php        # Respuestas JSON estandarizadas
├── database/
│   ├── migrations/                         # Migraciones con prefijo de orden
│   ├── seeders/
│   │   ├── DatabaseSeeder.php
│   │   ├── RoleSeeder.php
│   │   └── UserSeeder.php
│   └── factories/
│       └── UserFactory.php
├── routes/
│   ├── api.php                             # Enrutador de versiones (solo prefijos)
│   └── api_v1.php                          # Rutas reales de la version 1
└── tests/
    ├── Pest.php                            # Configuracion global de Pest
    ├── TestCase.php
    └── Feature/
        └── {Modulo}/
            └── {Modulo}Test.php
```

---

## 3. PRINCIPIOS ARQUITECTONICOS (OBLIGATORIOS)

Este proyecto aplica SOLID de forma estricta. Cada agente debe respetar y perpetuar estos principios.

### 3.1 SRP — Single Responsibility Principle
Cada clase tiene una sola razon para cambiar:

| Capa | Responsabilidad UNICA |
|------|----------------------|
| Controller | Recibir HTTP, delegar al Service, retornar JsonResponse |
| Service | Logica de negocio del modulo |
| Repository | Persistencia — solo consultas y escrituras a BD |
| Request | Validacion y autorizacion de la peticion entrante |
| Resource | Serializacion del modelo a JSON (DTO de salida) |
| Middleware | Verificacion transversal antes de llegar al Controller |

**Violacion tipica a evitar:** un Controller que accede directamente a Eloquent, o un Service que formatea JSON.

### 3.2 OCP — Open/Closed Principle
- Agregar funcionalidad creando nuevas clases, no modificando las existentes
- Los Contracts (interfaces) permiten extender sin modificar consumidores
- Ejemplo: agregar `MongoUserRepository implements UserRepositoryInterface` sin tocar `AuthService`

### 3.3 LSP — Liskov Substitution Principle
- Toda implementacion concreta de una interfaz debe ser intercambiable sin romper el sistema
- Los repositorios deben cumplir el contrato completo de su interfaz

### 3.4 ISP — Interface Segregation Principle
- Las interfaces deben ser especificas al modulo
- No crear interfaces gigantes. Preferir interfaces pequenas y especificas
- Ejemplo: si un nuevo modulo no necesita `bloquearUsuario`, su interfaz no debe tenerlo

### 3.5 DIP — Dependency Inversion Principle
- Los Services dependen de interfaces (Contracts), NUNCA de implementaciones concretas
- El binding interface→implementacion va SIEMPRE en `AppServiceProvider::register()`
- Constructor injection es el unico patron de inyeccion aceptado

```php
// CORRECTO
public function __construct(private UserRepositoryInterface $repo) {}

// INCORRECTO — acopla al Service con la implementacion concreta
public function __construct(private UserRepository $repo) {}
```

---

## 4. CONVENCIONES DE CODIGO

### 4.1 Namespaces por capa
```
App\Modules\{Modulo}\Controllers\     → {Modulo}Controller
App\Modules\{Modulo}\Services\        → {Modulo}Service
App\Modules\{Modulo}\Repositories\    → {Modulo}Repository
App\Modules\{Modulo}\Repositories\Contracts\ → {Modulo}RepositoryInterface
App\Modules\{Modulo}\Requests\        → CreateXxxRequest, UpdateXxxRequest
App\Modules\{Modulo}\Resources\       → {Modelo}Resource
App\Models\                           → Solo modelos Eloquent puros
App\Shared\Middleware\                → Middlewares transversales
App\Shared\Traits\                    → Traits reutilizables entre modulos
```

### 4.2 Respuestas JSON — estructura estandar
Usar SIEMPRE `ApiResponseTrait`. Nunca `response()->json()` directo en controllers.

```json
// Exito (200/201)
{ "success": true,  "message": "...", "data": { ... } }

// Error (4xx/5xx)
{ "success": false, "message": "...", "errors": { ... } }
```

Metodos disponibles: `successResponse()`, `errorResponse()`, `createdResponse()`

### 4.3 Rutas API
- Prefijo base: `/api/v1/`
- Rutas publicas: solo las estrictamente necesarias (login)
- Rutas privadas: siempre bajo `middleware('auth:sanctum')`
- Rutas de rol estático: `middleware('role:{rol}')` o `middleware('role:{rol1},{rol2}')` — usado solo para admin y permisos de sistema
- Rutas de permiso dinámico: `middleware('permission:{recurso}.{accion}')` — verifica en BD via `CheckPermission`; resultado cacheado por rol (60 min)
- Nomenclatura: sustantivos en plural, snake_case, en espanol si son del dominio

```php
// api.php: solo redirige versiones
Route::prefix('v1')->group(base_path('routes/api_v1.php'));

// api_v1.php: rutas reales agrupadas por acceso
Route::prefix('auth')->group(function () { /* publicas */ });
Route::middleware('auth:sanctum')->prefix('auth')->group(function () { /* privadas */ });
```

### 4.4 Modelos Eloquent
- `$fillable` explcito — nunca usar `$guarded = []`
- `$hidden` debe incluir SIEMPRE: `password`, `remember_token`, y cualquier campo sensible
- Casts declarados en el metodo `casts(): array`
- Relaciones con tipo de retorno explicito: `BelongsTo`, `HasMany`, etc.
- Metodos de dominio (ej. `estaBloqueado()`, `hasRole()`) van en el modelo, no en el Controller
- Constantes de roles en `Role::ADMINISTRADOR`, `Role::GERENCIA`, etc. (nunca strings literales)
- Cantidades y costos: cast a `decimal:N` y columna `decimal` en BD. **Nunca `float`/`double`** para datos de inventario o dinero (ver 4.5 y 4.7).

### 4.5 Migraciones
- Prefijo de fecha garantiza orden de ejecucion: `0000_` antes de `0001_` antes de `YYYY_`
- Comentarios en cada columna explicando su proposito de negocio
- Columnas relacionadas al mismo RF agrupadas con comentario de bloque
- Tablas inmutables (como `bitacora_accesos`): solo `created_at`, sin `updated_at`
- **Sede única (decisión de alcance):** el cliente piloto opera una sola sede, por lo que NO se modela multi-tenant (`centro_distribucion_id`) — aplicación de YAGNI. Si en el futuro se incorporan más centros, se introduce mediante una migración de alteración y se documenta como ADR. No anticipar esa estructura ahora.
- **Tipos de datos del dominio:** cantidades y costos en `decimal(N, M)` (no float). Fechas de vencimiento e ingreso como `date`/`timestamp` explícitos.
- **Tablas de movimiento de inventario son append-only** (ver 4.7): no se diseñan para `update`/`delete` de filas; las correcciones entran como nuevos movimientos compensatorios.

### 4.6 Seguridad (obligatorio en todo codigo nuevo)
- Passwords: siempre `bcrypt()` al crear, `Hash::check()` al verificar. El cast `'hashed'` en el modelo es complementario, no suficiente.
- Mensajes de error: GENERICOS en autenticacion (no revelar si el email existe o no)
- Tokens: Sanctum. Un solo token activo por usuario (revocar anteriores en login exitoso)
- RBAC estático: usar `CheckRole` middleware con constantes de `Role::`. Nunca comparar strings directos en controllers.
- RBAC dinámico: usar `CheckPermission` middleware con slugs `recurso.accion`. Los permisos viven en la tabla `permissions` asociados a roles via `role_permissions`. El cache de permisos se invalida al modificar `role_permissions`.
- Campos ocultos: `intentos_fallidos`, `bloqueado_hasta`, `password`, `remember_token` jamas en respuestas JSON
- Bitacora: registrar `login_exitoso`, `login_fallido`, `logout`, `cuenta_bloqueada` con IP y user_agent
- **Datos sensibles cifrados en reposo (RNF-SEC-05):** costos y márgenes se almacenan con *encrypted cast* de Laravel (`'encrypted'`) a nivel de columna. Documentar la decisión en un ADR y verificar que los KPIs que usan costo siguen calculando tras el cifrado.
- **Recetas/fórmulas (RNF-SEC-06):** NUNCA se almacenan. El sistema solo conoce la relación producto → materias primas requeridas y la cantidad consumida agregada por lote, jamás la fórmula paso a paso. Cualquier migración o modelo que sugiera almacenar una receta es una violación del alcance.

### 4.7 Integridad transaccional e inmutabilidad de movimientos (NÚCLEO DEL DOMINIO)

> Estas reglas son el corazón del sistema. Aplican a recepción, traslado entre bodegas, producción, despacho y ajustes. Su incumplimiento corrompe el inventario y viola RFINV04, RFPROD02/05, HU-027 y RNFPER-04.

- **Atomicidad (RFINV04):** toda operación que toca más de una fila de stock (traslado, producción que descuenta MP, despacho) se ejecuta dentro de `DB::transaction()`. Si cualquier paso falla, la operación completa se revierte. No existen escrituras de stock "a medias".
- **Concurrencia (RNFPER-04):** las filas de lote/stock que se van a modificar se leen con bloqueo pesimista (`->lockForUpdate()`) dentro de la transacción, para evitar stock negativo o doble descuento bajo accesos concurrentes. Documentar la táctica en un ADR.
- **Inmutabilidad (HU-027):** los movimientos de inventario NO se actualizan ni se borran. Una corrección se modela como un **movimiento compensatorio** que referencia al original (`movimiento_origen_id`), conservando ambos en el histórico. La operación expuesta al usuario se llama "Anular", no "Eliminar".
- **Rechazo por stock insuficiente (RFPROD05):** al registrar producción, si alguna materia prima no tiene stock suficiente, la transacción se aborta y se retorna un error específico indicando **cuál** MP falta y **cuánta** cantidad. Mensaje claro, en español (RNF-USA-03).
- **FEFO (RFINV03):** la selección del lote a consumir (First Expired, First Out) se encapsula en un servicio de dominio dedicado (p. ej. `FefoService` o método especializado del `InventarioService`), nunca en el Controller. Debe tener pruebas unitarias de borde: lotes con misma fecha de vencimiento, lotes agotados, ausencia total de stock, y empate por fecha de ingreso.
- **Recepción contra orden (RFREC):** no se aceptan recepciones sin una orden de pedido previa. La recepción referencia siempre a su orden; las recepciones parciales dejan la orden "En recepción" hasta cerrarse.
- **Trazabilidad por lote (RFINV02 / HU-026):** cada movimiento registra fecha-hora, usuario, bodega y lote afectado, de modo que un lote pueda rastrearse desde su recepción hasta su consumo o despacho.

---

## 5. SISTEMA DE AGENTES

Este backend opera con 5 agentes Claude especializados. Cada agente tiene un rol unico y no invade el dominio de los demas.

---

### AGENTE 1 — ArchitectAgent (Agente de Arquitectura)

**Proposito:** Disenar la estructura de nuevos modulos antes de escribir codigo.

**Responsabilidades:**
- Proponer la estructura de carpetas para un nuevo modulo siguiendo el patron `app/Modules/`
- Definir las interfaces (Contracts) que el modulo necesita
- Identificar que se comparte en `app/Shared/` vs. que es especifico del modulo
- Detectar violaciones SOLID en el diseno antes de implementar
- Registrar bindings necesarios en `AppServiceProvider`
- Definir las rutas y su nivel de acceso en `api_v1.php`
- En módulos de inventario, decidir dónde viven las fronteras transaccionales (sección 4.7) y aislar el `FefoService` como pieza con interfaz propia (ISP/DIP).

**Contexto que necesita:**
- Esta seccion completa del CLAUDE.md (seccion 2, 3, 4, 5)
- Los modulos ya existentes en `app/Modules/` como referencia
- `app/Providers/AppServiceProvider.php`
- `routes/api_v1.php`

**Limites — lo que NO hace:**
- No escribe implementaciones (le corresponde a CodeGenAgent)
- No toca archivos fuera de `backend/`
- No modifica migraciones existentes
- No sugiere cambios en `config/` sin avisarlo explicitamente al usuario

**Output esperado:** Un plan de arquitectura en texto con arbol de carpetas, lista de clases, interfaces necesarias y el binding en AppServiceProvider.

---

### AGENTE 2 — CodeGenAgent (Agente de Generacion de Codigo)

**Proposito:** Implementar clases Laravel siguiendo las convenciones establecidas.

**Responsabilidades:**
- Generar Controllers, Services, Repositories, Requests, Resources completos
- Asegurar que toda clase usa `ApiResponseTrait` (controllers), inyeccion por constructor, y tipos de retorno PHP 8.3
- Generar el binding correspondiente en `AppServiceProvider`
- No repetir logica ya existente: si hay un patron en `app/Modules/Auth/`, replicarlo
- En operaciones de inventario, envolver las escrituras multi-fila en `DB::transaction()` con `lockForUpdate()`, y modelar correcciones como movimientos compensatorios (sección 4.7). Documentar en el código el RF que cumple cada operación.

**Contexto que necesita:**
- Seccion 3, 4 (incluida 4.7) de este archivo
- El modulo `Auth` completo como referencia de implementacion
- `app/Shared/Traits/ApiResponseTrait.php`
- `app/Shared/Middleware/CheckRole.php`

**Limites — lo que NO hace:**
- No modifica modelos existentes sin que el usuario lo pida explicitamente
- No escribe tests (le corresponde a TestAgent)
- No crea migraciones (le corresponde a MigrationAgent)
- No toca `routes/api.php` (solo `api_v1.php` o el archivo de la version correspondiente)
- No introduce dependencias de Composer sin avisarlo

**Patron de referencia para un nuevo modulo:**

```php
// Controller — solo orquesta
class {Modulo}Controller extends Controller
{
    use ApiResponseTrait;
    public function __construct(private {Modulo}Service $service) {}

    public function index(): JsonResponse {
        // 1. (opcional) validar request
        // 2. llamar al service
        // 3. retornar con ApiResponseTrait
    }
}

// Service — solo logica de negocio
class {Modulo}Service
{
    public function __construct(private {Modulo}RepositoryInterface $repo) {}
}

// Repository — solo persistencia
class {Modulo}Repository implements {Modulo}RepositoryInterface
{
    // Consultas Eloquent. Sin logica de negocio.
}
```

---

### AGENTE 3 — TestAgent (Agente de Tests)

**Proposito:** Escribir y mantener tests Pest que cubran requisitos funcionales (RF) y de seguridad.

**Responsabilidades:**
- Escribir tests Feature en `tests/Feature/{Modulo}/{Modulo}Test.php`
- Cada test debe referenciar el RF que verifica (comentario en el test)
- Usar `RefreshDatabase` en todos los tests que tocan BD
- Usar `beforeEach` para seeders necesarios
- Cubrir escenarios: exito, error de validacion, no autenticado (401), sin permiso (403), no encontrado (404)
- Usar helpers de tipo `crearUsuario()` para no repetir setup
- **Meta de cobertura (RNF-MAN-02):** ≥ 70 % en la lógica de negocio (servicios de inventario, FEFO, alertas, cálculos de KPI). Escribir la prueba junto al código, no al final; aprovechar que los criterios Gherkin de las historias ya están definidos (flujo BDD).
- **Pruebas de concurrencia e integridad (sección 4.7):** para inventario, incluir tests que verifiquen que un traslado/producción no deja stock inconsistente, que el rechazo por stock insuficiente devuelve la MP y cantidad faltante, que FEFO elige el lote correcto, y que un movimiento no puede borrarse (solo anularse con compensatorio).

**Contexto que necesita:**
- `tests/Feature/Auth/AuthTest.php` como referencia de estilo
- `tests/Pest.php`
- `database/seeders/RoleSeeder.php`, `UserFactory`
- El contrato de la API del modulo que va a testear (rutas + respuestas esperadas)

**Limites — lo que NO hace:**
- No escribe Unit tests de clases internas sin que el usuario lo pida (excepción: la lógica FEFO sí amerita unit tests de borde por su criticidad)
- No modifica codigo de produccion
- No usa `$this->actingAs()` sin antes verificar que el token es de Sanctum (usar `withToken()`)
- No omite el test de RBAC — todo endpoint protegido debe tener al menos un test de acceso denegado

**Estructura obligatoria de cada test:**
```php
// -----------------------------------------------------------------------
// Test N: [descripcion corta] — [RF o RNF que verifica]
// -----------------------------------------------------------------------
test('test_{accion}_{resultado_esperado}', function () {
    // Arrange — preparar datos
    // Act    — llamar al endpoint
    // Assert — verificar respuesta
});
```

**Escenarios minimos por endpoint:**
| Endpoint | Tests minimos |
|----------|--------------|
| POST login | exito+token, credenciales invalidas, cuenta bloqueada, usuario inactivo |
| POST logout | exito+token revocado, sin token (401) |
| GET /me | exito con datos, sin token (401) |
| POST recurso (admin only) | exito como admin, 403 como otro rol, 401 sin token |
| POST traslado / produccion | exito atomico, rechazo por stock insuficiente (MP y cantidad), FEFO correcto, 403/401 |
| Anular movimiento | crea compensatorio y conserva original, borrado bloqueado |

---

### AGENTE 4 — MigrationAgent (Agente de Migraciones)

**Proposito:** Crear y revisar migraciones de base de datos con contexto de negocio.

**Responsabilidades:**
- Crear migraciones con el prefijo de fecha correcto para garantizar orden de ejecucion
- Documentar CADA columna con su proposito de negocio en un comentario
- Aplicar FK constraints correctos (`constrained()`, `nullOnDelete()` o `cascadeOnDelete()` segun el negocio)
- Identificar si una tabla debe ser inmutable (solo `created_at`, sin `updated_at`) — aplica a `bitacora_accesos` y a las tablas de movimientos de inventario (append-only, sección 4.7)
- Asegurar que los indices esten en columnas usadas en WHERE o JOIN frecuentes (incluido `fecha_vencimiento` para consultas FEFO)
- Verificar que el `down()` deshaga exactamente lo que hizo `up()`
- Usar `decimal(N, M)` para cantidades y costos; aplicar `encrypted` a columnas de costo/margen donde el modelo lo declare (RNF-SEC-05)

**Contexto que necesita:**
- Las migraciones existentes en `database/migrations/` como referencia
- El RF asociado a la tabla nueva (para documentar correctamente)

**Limites — lo que NO hace:**
- No modifica migraciones ya ejecutadas en produccion (crear nueva migration de alteracion)
- No elimina columnas sin avisar al usuario del impacto en modelos y tests
- No crea tablas sin que exista un modelo Eloquent correspondiente o planificado
- No crea ninguna tabla, columna o relación destinada a almacenar recetas/fórmulas (RNF-SEC-06)

**Reglas de nomenclatura:**
```
0000_MM_DD_HHMMSS_create_{tabla}_table.php   → tablas base (sin FK hacia otras)
0001_MM_DD_HHMMSS_create_{tabla}_table.php   → tablas con FK hacia tablas 0000
YYYY_MM_DD_HHMMSS_create_{tabla}_table.php   → tablas de funcionalidad del proyecto
YYYY_MM_DD_HHMMSS_add_{campo}_to_{tabla}.php → alteraciones
```

**Tabla inmutable (patron bitacora / movimientos):**
```php
// Patron para tablas de auditoria y movimientos — sin updated_at
$table->timestamp('created_at')->useCurrent();
// NO agregar: $table->timestamps() — eso agrega updated_at
```

---

### AGENTE 5 — SecurityAgent (Agente de Seguridad)

**Proposito:** Revisar codigo existente o nuevo en busca de vulnerabilidades y violaciones a los requisitos de seguridad del proyecto.

**Responsabilidades:**
- Auditar controllers y services en busca de: SQL injection, XSS, mass assignment inseguro, exposicion de datos sensibles
- Verificar que los passwords se hashean con `bcrypt()` / `Hash::make()` (nunca MD5, SHA1, texto plano)
- Verificar que los mensajes de error de autenticacion son genericos (no revelan si el email existe)
- Verificar que campos sensibles esten en `$hidden` del modelo
- Verificar que los endpoints de administrador tienen `middleware('role:administrador')`
- Verificar que los endpoints de catálogo y operaciones usan `middleware('permission:recurso.accion')` (no hardcoded role checks)
- Verificar que la caché de permisos se invalida cuando se modifica `role_permissions`
- Revisar que la bitacora registra todos los eventos de autenticacion
- Verificar que los tokens Sanctum se revocan en logout y que no hay tokens huerfanos
- Verificar que costos/márgenes usan `encrypted` cast (RNF-SEC-05) y que ningún modelo o migración almacena recetas (RNF-SEC-06)

**Contexto que necesita:**
- Seccion 4.6 y 4.7 de este archivo (reglas de seguridad e integridad)
- Codigo a auditar
- `app/Models/User.php` para referencia de campos ocultos

**Limites — lo que NO hace:**
- No modifica codigo directamente, genera un reporte con los hallazgos y recomendaciones
- No agrega dependencias de seguridad de terceros sin discutirlo

**Checklist de revision (usar en cada auditoria):**
```
[ ] $fillable definido y no contiene campos sensibles innecesarios
[ ] $hidden incluye: password, remember_token, intentos_fallidos, bloqueado_hasta
[ ] Passwords hasheados con bcrypt/Hash::make — nunca almacenados en texto plano
[ ] Mensajes de autenticacion genericos (no revelan info de BD)
[ ] Endpoints admin protegidos con middleware('role:administrador')
[ ] Endpoints privados protegidos con middleware('auth:sanctum')
[ ] UserResource no expone campos sensibles
[ ] Bitacora registra: login_exitoso, login_fallido, logout, cuenta_bloqueada
[ ] Tokens reutilizados: login revoca tokens anteriores
[ ] No hay queries crudas con interpolacion de strings ($db->select("... $var ..."))
[ ] Requests de validacion usan 'confirmed' para passwords
[ ] No hay dd(), dump(), var_dump() en codigo de produccion
[ ] Costos/margenes con cast 'encrypted' (cifrado en reposo)
[ ] No existe almacenamiento de recetas/formulas en modelos ni migraciones
[ ] Operaciones de inventario multi-fila envueltas en DB::transaction()
[ ] Movimientos de inventario son append-only (sin update/delete de filas)
[ ] Permisos gestionados via tabla `permissions` + `role_permissions` (no hardcoded en rutas)
[ ] Cache de permisos invalidada al modificar role_permissions
```

---

## 6. REGLAS GLOBALES (TODOS LOS AGENTES)

### Lo que NUNCA debe hacer ningun agente:

1. **Tocar el frontend:** No modificar ningun archivo fuera de `backend/`. El frontend esta en una carpeta hermana separada.
2. **Modificar `config/` sin avisar:** Cambios en `config/sanctum.php`, `config/auth.php`, `config/cors.php` afectan al sistema completo. Siempre notificar al usuario antes de hacerlo.
3. **Eliminar o modificar migraciones ejecutadas:** Solo crear nuevas migraciones de alteracion.
4. **Romper la estructura de modulos:** No crear clases en `app/Http/Controllers/` — solo van en `app/Modules/{Modulo}/Controllers/`.
5. **Usar strings literales de roles:** Siempre usar `Role::ADMINISTRADOR`, `Role::GERENCIA`, etc.
6. **Omitir el binding en AppServiceProvider:** Toda nueva interfaz debe tener su binding registrado.
7. **Responder JSON sin ApiResponseTrait:** Ningun controller puede usar `response()->json()` directamente.
8. **Crear logica de negocio en Controllers:** Un controller que hace mas que recibir, delegar y retornar es una violacion de SRP.
9. **Hacer commits o push directamente:** Cualquier operacion de git debe ser aprobada por el usuario.
10. **Instalar paquetes Composer sin avisar:** Siempre notificar al usuario antes de `composer require`.
11. **Escribir stock sin transacción ni bloqueo:** Toda escritura de inventario multi-fila va dentro de `DB::transaction()` con `lockForUpdate()` (sección 4.7).
12. **Borrar o actualizar un movimiento de inventario:** Las correcciones son siempre movimientos compensatorios; los movimientos son inmutables (HU-027).
13. **Almacenar recetas/fórmulas:** Fuera del alcance del sistema (RNF-SEC-06).

### Lo que SIEMPRE debe hacer todo agente:

1. Leer los archivos relevantes antes de modificarlos.
2. Seguir el patron del modulo `Auth` como referencia de implementacion.
3. Verificar que el nuevo codigo tiene cobertura de tests o notificar que falta (meta ≥ 70 % en lógica de negocio).
4. Respetar los requisitos funcionales (RFAUT01, RFINV04, RFPROD05, etc.) en los comentarios del codigo.
5. Usar tipos de retorno PHP 8.3 en todos los metodos.
6. Aplicar `readonly` a propiedades de constructor cuando aplique.
7. Documentar endpoints nuevos para Swagger/OpenAPI (RNF-MAN-03) — anotaciones o esquema equivalente accesible vía `/swagger`.

---

## 7. ROLES Y PERMISOS DEL SISTEMA (RBAC — Gestionado desde BD)

### 7.1 Roles

```php
Role::ADMINISTRADOR         = 'administrador'           // Rol técnico del sistema
Role::GERENCIA              = 'gerencia'                 // Dueños — supervisión y políticas
Role::JEFE_PRODUCCION       = 'jefe_produccion'          // Supervisor operativo de producción
Role::ENCARGADO_INVENTARIOS = 'encargado_inventarios'    // Practicante — operación diaria completa
```

### 7.2 Matriz de permisos (almacenada en BD)

Los permisos **no están hardcodeados** en las rutas. Viven en las tablas `permissions` y `role_permissions` y se verifican dinámicamente via `CheckPermission` middleware con caché de 60 minutos por rol.

**Formato de permiso:** `{recurso}.{accion}` — ej. `materias_primas.escribir`, `inventario.leer`

**Tabla de permisos iniciales (PermissionSeeder):**

| Permiso (slug) | Administrador | Gerencia | Jefe Producción | Encargado Inventarios |
|---|:---:|:---:|:---:|:---:|
| `materias_primas.leer` | — | ✅ | ✅ | ✅ |
| `materias_primas.escribir` | — | ✅ | — | ✅ |
| `productos_terminados.leer` | — | ✅ | ✅ | ✅ |
| `productos_terminados.escribir` | — | ✅ | — | ✅ |
| `bodegas.leer` | — | ✅ | ✅ | ✅ |
| `bodegas.escribir` | — | ✅ | — | ✅ |
| `inventario.leer` | — | ✅ | ✅ | ✅ |
| `inventario.escribir` | — | — | ✅ | ✅ |
| `produccion.leer` | — | ✅ | ✅ | ✅ |
| `produccion.escribir` | — | — | ✅ | ✅ |
| `recepciones.leer` | — | ✅ | ✅ | ✅ |
| `recepciones.escribir` | — | — | — | ✅ |
| `despachos.leer` | — | ✅ | ✅ | ✅ |
| `despachos.escribir` | — | — | ✅ | ✅ |
| `alertas.leer` | — | ✅ | ✅ | ✅ |
| `reportes.leer` | — | ✅ | ✅ | ✅ |
| `permisos.gestionar` | ✅ | — | — | — |
| `usuarios.gestionar` | ✅ | — | — | — |

> **Nota:** El Administrador solo gestiona el sistema (usuarios, roles, permisos). No opera el inventario — eso es dominio de Gerencia, Jefe y Encargado.

### 7.3 Arquitectura del sistema de permisos

```
Tabla `permissions`        → catálogo de permisos disponibles (nombre, recurso, accion)
Tabla `role_permissions`   → pivot: qué permisos tiene cada rol
Modelo `Permission`        → belongsToMany Role
Modelo `Role`              → belongsToMany Permission via role_permissions
Middleware `CheckPermission`  → alias 'permission' — verifica en BD, cachea 60 min por rol
Módulo `Permisos`          → CRUD de permisos y asignación a roles (solo administrador)
```

**Flujo de verificación:**
```
Request → auth:sanctum → permission:recurso.accion
  └─ CheckPermission::handle()
       └─ Cache::remember("permisos_rol_{role_id}", 3600, fn() => $role->permissions->pluck('nombre'))
       └─ Si el slug está en la colección → $next($request)
       └─ Si no → 403 errorResponse
```

**Invalidación de caché:** al crear/eliminar entrada en `role_permissions` se ejecuta
`Cache::forget("permisos_rol_{role_id}")` para que el cambio surta efecto de inmediato.

### 7.4 Notas de diseño

- La visibilidad del inventario es **global**: cualquier rol autorizado ve el stock de las dos bodegas (HU-002, escenario 4).
- `CheckRole` (estático) se mantiene para endpoints de gestión de sistema (admin, roles). `CheckPermission` (dinámico) aplica a todos los endpoints operativos.
- La matriz inicial se carga vía `PermissionSeeder`; puede modificarse desde la API sin redeploy.

**Regla:** siempre usar las constantes `Role::` para strings de rol. Nunca strings literales.

---

## 8. ESQUEMA DE BASE DE DATOS (estado actual)

```
roles
  id, nombre (unique, 50), descripcion (nullable), timestamps

permissions
  id, nombre (unique, slug ej. 'materias_primas.escribir'), descripcion (nullable)
  recurso (varchar 100), accion (varchar 50), timestamps

role_permissions                           [PIVOT — sin timestamps propios]
  role_id (FK → roles, cascadeOnDelete)
  permission_id (FK → permissions, cascadeOnDelete)
  PRIMARY KEY (role_id, permission_id)

users
  id, name, email (unique), email_verified_at, password
  role_id (FK → roles, nullOnDelete)
  activo (boolean, default true)
  intentos_fallidos (integer, default 0)
  bloqueado_hasta (timestamp, nullable)
  remember_token, timestamps

personal_access_tokens     [Sanctum]
  id, tokenable_type, tokenable_id, name, token (unique), abilities
  last_used_at, expires_at, timestamps

bitacora_accesos           [INMUTABLE — solo created_at]
  id, user_id (FK → users, nullable, nullOnDelete)
  accion, ip_address (45), user_agent (500, nullable), created_at

cache                      [Laravel cache driver]
password_reset_tokens
sessions
jobs / job_batches / failed_jobs
```

> **Convención para tablas del dominio (próximas: catálogo, bodegas, lotes, órdenes, recepciones, movimientos, producción, despachos):** cantidades y costos en `decimal`; costos con cast `encrypted` (RNF-SEC-05); las tablas de movimiento son **inmutables / append-only** (HU-027). Ninguna tabla almacena recetas (RNF-SEC-06). El sistema opera una sola sede: no se modela multi-tenant por ahora (decisión de alcance / YAGNI).

---

## 9. FLUJOS DE NEGOCIO CRITICOS

### Flujo de login (RFAUT01)
```
1. Buscar usuario por email
   └─ No existe → registrar login_fallido (sin user_id) → 401 GENERICO
2. Verificar bloqueo (bloqueado_hasta > now())
   └─ Bloqueado → 401 con minutos restantes
3. Verificar activo = true
   └─ Inactivo → 403 (mensaje especifico, no de seguridad)
4. Verificar password con Hash::check()
   └─ Incorrecto → incrementIntentosFallidos()
      └─ >= 5 intentos → bloquearUsuario(15 min) → bitacora 'cuenta_bloqueada'
      └─ < 5 intentos → bitacora 'login_fallido'
      → 401 GENERICO
5. Login exitoso:
   └─ resetIntentosFallidos()
   └─ bitacora 'login_exitoso'
   └─ revocar tokens anteriores
   └─ crear nuevo token Sanctum
   └─ retornar {usuario, token, rol}
```

### Flujo de creacion de usuario (RFAUT04)
```
1. Middleware auth:sanctum → verifica token
2. Middleware role:administrador → verifica rol
3. CreateUserRequest → valida datos (email unico, password confirmado, role_id valido)
4. AuthService::crearUsuario() → bcrypt(password), activo=true
5. UserRepository::create() → User::create($data)
6. Retornar UserResource (201)
```

### Flujo de traslado entre bodegas (RFINV04) — patrón transaccional
```
1. Middleware auth:sanctum + role (encargado/jefe segun política)
2. TrasladoRequest → valida bodega origen ≠ destino, cantidad > 0, lote existente
3. InventarioService::trasladar() dentro de DB::transaction():
   └─ leer lote/stock origen con lockForUpdate()
   └─ validar stock suficiente
      └─ insuficiente → abortar transacción → error específico (RFPROD05-style)
   └─ insertar movimiento SALIDA (bodega origen)  [inmutable]
   └─ insertar movimiento ENTRADA (bodega destino)[inmutable]
   └─ commit (o rollback completo ante cualquier fallo)
4. Retornar comprobante del traslado
```

### Flujo de producción que descuenta MP (RFPROD01-05) — patrón transaccional
```
1. Middleware auth:sanctum + role (encargado/jefe)
2. ProduccionRequest → valida producto, cantidad de lotes/batidos, MP consumidas
3. ProduccionService::registrar() dentro de DB::transaction():
   └─ por cada MP: FefoService sugiere lote más próximo a vencer
   └─ leer lotes con lockForUpdate()
   └─ si alguna MP no alcanza → abortar → error con MP y cantidad faltante (RFPROD05)
   └─ insertar movimientos CONSUMO de MP (inmutables, asociados al lote de producción)
   └─ insertar movimiento INGRESO de producto terminado (RFPROD03)
   └─ commit
4. Retornar resumen del lote de producción
```

---

## 10. COMANDOS UTILES

```bash
# Ejecutar todos los tests
php artisan test

# Ejecutar tests de un modulo especifico
php artisan test tests/Feature/Auth/AuthTest.php

# Ejecutar tests con nombre especifico
php artisan test --filter="test_login_exitoso"

# Cobertura (meta ≥ 70% en logica de negocio — RNF-MAN-02)
php artisan test --coverage --min=70

# Migraciones
php artisan migrate
php artisan migrate:fresh --seed   # Solo en desarrollo

# Crear estructura de un nuevo modulo (manual, no hay artisan custom)
# Seguir el patron de app/Modules/Auth/

# Verificar rutas registradas
php artisan route:list --path=api
```

---

## 11. PATRON PARA NUEVO MODULO — Checklist

Al agregar un nuevo modulo (ej. `Inventario`), el agente debe:

```
[ ] Crear carpeta app/Modules/Inventario/
[ ] Crear InventarioRepositoryInterface en Contracts/
[ ] Crear InventarioRepository implementando la interfaz
[ ] Crear InventarioService con DIP (depende de la interfaz)
[ ] Aislar FefoService (o equivalente) si el modulo aplica rotacion FEFO
[ ] Crear InventarioController extendiendo Controller + use ApiResponseTrait
[ ] Crear Form Requests necesarios (CreateInventarioRequest, etc.)
[ ] Crear Resource(s) para la serializacion de salida
[ ] Registrar binding en AppServiceProvider::register()
[ ] Agregar rutas en routes/api_v1.php con los middlewares correctos
[ ] Envolver escrituras multi-fila en DB::transaction() + lockForUpdate()
[ ] Modelar correcciones como movimientos compensatorios (inmutabilidad)
[ ] Crear tests en tests/Feature/Inventario/InventarioTest.php
[ ] Verificar que tests cubren: exito, validacion, 401, 403, concurrencia/integridad donde aplique
[ ] Documentar endpoints para Swagger/OpenAPI
```

---

## 12. CONTEXTO DE AGENTE POR TAREA

Guia rapida: que archivos leer segun la tarea.

| Tarea | Archivos a leer primero |
|-------|------------------------|
| Nuevo modulo (arquitectura) | `app/Modules/Auth/` completo, `AppServiceProvider.php`, `routes/api_v1.php` |
| Nuevo modulo (implementacion) | Resultado del ArchitectAgent + modulo Auth como referencia + sección 4.7 |
| Modulo de inventario / movimientos | Sección 4.7 y 9 (flujos transaccionales), migraciones existentes |
| Nuevo test | `tests/Feature/Auth/AuthTest.php`, `tests/Pest.php`, `database/seeders/RoleSeeder.php` |
| Nueva migracion | `database/migrations/` (ver orden de prefijos existentes) y convención de tipos §8 |
| Auditoria de seguridad | `app/Models/User.php`, `app/Shared/`, secciones 4.6 y 4.7, codigo a auditar |
| Debug de endpoint | Ruta en `api_v1.php` → Controller → Service → Repository → Migration |
| Agregar rol nuevo | `app/Models/Role.php`, `database/seeders/RoleSeeder.php`, `app/Shared/Middleware/CheckRole.php` |
