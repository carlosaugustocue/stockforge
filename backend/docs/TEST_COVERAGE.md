# Documentación Exhaustiva de Pruebas — Backend IPN-DEV

## Índice

1. [Configuración del entorno de testing](#1-configuración-del-entorno-de-testing)
2. [Resumen ejecutivo](#2-resumen-ejecutivo)
3. [Tests Unitarios](#3-tests-unitarios)
4. [Tests de Feature por módulo](#4-tests-de-feature-por-módulo)
   - [4.1 Auth](#41-módulo-auth)
   - [4.2 Catálogo Maestro](#42-módulo-catálogo-maestro)
   - [4.3 Permisos (RBAC dinámico)](#43-módulo-permisos-rbac-dinámico)
   - [4.4 Recepciones](#44-módulo-recepciones)
   - [4.5 Inventario — Stock y Alertas](#45-módulo-inventario--stock-y-alertas)
   - [4.6 Inventario — Traslados de MP](#46-módulo-inventario--traslados-de-mp)
   - [4.7 Producción](#47-módulo-producción)
   - [4.8 Despacho](#48-módulo-despacho)
   - [4.9 Reportes](#49-módulo-reportes)
   - [4.10 Bitácora de Accesos](#410-módulo-bitácora-de-accesos)
   - [4.11 Integración E2E](#411-tests-de-integración-e2e)
5. [Análisis transversal](#5-análisis-transversal)
6. [Cobertura por requisito funcional](#6-cobertura-por-requisito-funcional)
7. [Gaps y áreas de mejora](#7-gaps-y-áreas-de-mejora)

---

## 1. Configuración del entorno de testing

### Framework

- **Testing framework:** Pest PHP (sobre PHPUnit 11)
- **Archivo de bootstrap:** `vendor/autoload.php`

### Configuración `phpunit.xml`

| Parámetro | Valor |
|---|---|
| `APP_ENV` | `testing` |
| `DB_CONNECTION` | `sqlite` |
| `DB_DATABASE` | `:memory:` (BD volátil, se destruye al finalizar) |
| `CACHE_STORE` | `array` (sin Redis/Memcached) |
| `QUEUE_CONNECTION` | `sync` (sin colas asíncronas) |
| `BCRYPT_ROUNDS` | `4` (más rápido en tests) |
| `SESSION_DRIVER` | `array` |
| `PULSE_ENABLED` | `false` |

### Archivo `tests/Pest.php`

- Extiende todos los tests de `Feature/` de `Tests\TestCase` (que a su vez extiende `Illuminate\Foundation\Testing\TestCase`).
- `RefreshDatabase` está comentado globalmente — **cada test file lo declara de forma individual** con `uses(RefreshDatabase::class)`.
- Define una expectation personalizada `toBeOne()` (nunca usada en tests reales).
- Define una función helper global `something()` vacía (placeholder sin uso).

### `tests/TestCase.php`

Clase base abstracta minimal. No agrega ningún trait ni comportamiento personalizado.

---

## 2. Resumen ejecutivo

| Suite | Archivo | Tests |
|---|---|---|
| **Unit** | `tests/Unit/ExampleTest.php` | 1 (placeholder) |
| **Feature** | `tests/Feature/ExampleTest.php` | 1 (placeholder) |
| **Feature** | `tests/Feature/Auth/AuthTest.php` | 17 |
| **Feature** | `tests/Feature/Catalogo/CatalogoTest.php` | 18 |
| **Feature** | `tests/Feature/Permisos/PermisosTest.php` | 13 |
| **Feature** | `tests/Feature/Recepciones/RecepcionesTest.php` | 16 |
| **Feature** | `tests/Feature/Inventario/InventarioTest.php` | 10 |
| **Feature** | `tests/Feature/Inventario/TrasladoTest.php` | 9 |
| **Feature** | `tests/Feature/Produccion/ProduccionTest.php` | 10 |
| **Feature** | `tests/Feature/Despacho/DespachoTest.php` | 10 |
| **Feature** | `tests/Feature/Reportes/ReportesTest.php` | 10 |
| **Feature** | `tests/Feature/Bitacora/BitacoraTest.php` | 11 |
| **Feature** | `tests/Feature/IntegracionTest.php` | 3 (E2E) |
| **TOTAL** | | **129 tests** |

> Los 2 tests de tipo `ExampleTest` son placeholders generados por Laravel/Pest y no tienen valor de negocio.
> **Tests funcionales efectivos: 127.**

### Seeders utilizados en tests

| Seeder | Propósito | Usado en módulos |
|---|---|---|
| `RoleSeeder` | Crea los 4 roles del sistema | Todos |
| `PermissionSeeder` | Crea permisos y los asigna a roles | Catálogo, Permisos, Recepciones, Inventario, Producción, Despacho, Reportes |
| `UnidadMedidaSeeder` | Crea unidades `kg`, `litro`, `unidad`, etc. | Catálogo, Recepciones, Inventario, Producción, Despacho, Reportes, Integración |
| `BodegaSeeder` | Crea 3 bodegas: Principal, Producción, Ventas | Recepciones, Inventario, Producción, Despacho, Reportes, Integración |

---

## 3. Tests Unitarios

### `tests/Unit/ExampleTest.php`

| # | Nombre del test | Clase testeada | Descripción |
|---|---|---|---|
| 1 | `test_that_true_is_true` | `PHPUnit\Framework\TestCase` | Placeholder de scaffolding. Aserta `assertTrue(true)`. Sin valor funcional. |

> **Estado:** Placeholder. No cubre ningún componente real del dominio.

---

## 4. Tests de Feature por módulo

### 4.1 Módulo Auth

**Archivo:** `tests/Feature/Auth/AuthTest.php`
**Seeders:** `RoleSeeder`
**Helpers definidos:**
- `crearUsuario(string $rolNombre, array $extra): User` — crea un usuario con rol, activo, sin bloqueos y con `Password123!` hasheado.

---

| # | Nombre del test | RF/RNF | Endpoint | Descripción | Escenario cubierto |
|---|---|---|---|---|---|
| 1 | `test_login_exitoso_retorna_token` | RFAUT01 §1 | `POST /api/v1/auth/login` | Login con credenciales válidas retorna `{success, message, data: {token, rol}}`. Verifica que `data.usuario` **NO** se expone. | Happy path autenticación |
| 2 | `test_login_con_credenciales_invalidas_retorna_401` | RFAUT01 §2 | `POST /api/v1/auth/login` | Password incorrecto → HTTP 401 con mensaje genérico `"Credenciales incorrectas."` (no revela qué campo falló). | Seguridad: mensaje genérico |
| 3 | `test_bloqueo_tras_cinco_intentos_fallidos` | RFAUT01 §3 | `POST /api/v1/auth/login` | Realiza 5 intentos fallidos consecutivos; en el 6° con credencial correcta la cuenta está bloqueada → 401 con mensaje que contiene `"Cuenta bloqueada"`. | Bloqueo por fuerza bruta |
| 4 | `test_usuario_inactivo_no_puede_iniciar_sesion` | RFAUT04 | `POST /api/v1/auth/login` | Usuario con `activo=false` → HTTP 403 con mensaje `"Usuario inactivo. Contacte al administrador."` | Usuario desactivado |
| 5 | `test_logout_revoca_token` | RFAUT03 | `POST /api/v1/auth/logout` | Logout con token válido → 200. Verifica directamente en BD que `tokens()->count() === 0`. | Revocación de token |
| 6 | `test_endpoint_me_retorna_usuario_autenticado` | — | `GET /api/v1/auth/me` | Con token válido retorna datos del usuario: `data.email` y `data.rol` correctos. | Perfil autenticado |
| 7 | `test_rol_gerencia_no_puede_crear_usuarios` | RFAUT02 / RNFSEC-04 | `POST /api/v1/auth/usuarios` | Rol `gerencia` recibe HTTP 403 del middleware `CheckRole`. | RBAC — acceso denegado |
| 8 | `test_rol_administrador_puede_crear_usuarios` | RFAUT04 | `POST /api/v1/auth/usuarios` | Admin crea usuario → 201 con `data.email` y `data.rol` correctos. | Creación de usuario |
| 9 | `test_administrador_puede_listar_usuarios` | RFAUT02 | `GET /api/v1/auth/usuarios` | Admin lista usuarios; verifica `count(data) === 3`. | Listado de usuarios |
| 10 | `test_no_administrador_no_puede_listar_usuarios` | RNFSEC-04 | `GET /api/v1/auth/usuarios` | Gerente → HTTP 403. | RBAC — listado denegado |
| 11 | `test_sin_token_no_puede_listar_usuarios` | — | `GET /api/v1/auth/usuarios` | Sin token → HTTP 401. | Autenticación obligatoria |
| 12 | `test_administrador_puede_actualizar_rol_de_usuario` | RFAUT02 | `PATCH /api/v1/auth/usuarios/{id}` | Admin cambia `role_id` del encargado a `jefe_produccion` → 200 con `data.rol` actualizado. | Actualización de rol |
| 13 | `test_desactivar_usuario_revoca_sus_tokens` | RNFSEC-04 | `PATCH /api/v1/auth/usuarios/{id}` | Admin desactiva a un encargado → tokens del encargado eliminados de BD. | Desactivación + seguridad |
| 14 | `test_actualizar_usuario_inexistente_retorna_404` | — | `PATCH /api/v1/auth/usuarios/99999` | ID inexistente → HTTP 404. | No encontrado |
| 15 | `test_administrador_puede_listar_roles` | RFAUT02 | `GET /api/v1/roles` | Admin lista roles → 200 con `count(data) === 4`. | Listado de roles |
| 16 | `test_no_administrador_no_puede_listar_roles` | RNFSEC-04 | `GET /api/v1/roles` | Jefe de producción → HTTP 403. | RBAC roles |
| 17 | `test_bloqueado_hasta_no_se_expone_en_respuesta_json` | RNFSEC-01 | `GET /api/v1/auth/me` | El campo `bloqueado_hasta` **nunca** viaja al cliente en `data`. | Seguridad: datos ocultos |

**Cobertura de escenarios Auth:**

```
POST login     → ✅ éxito, ✅ credenciales inválidas, ✅ bloqueo x5, ✅ usuario inactivo
POST logout    → ✅ éxito + token revocado, ⬜ sin token (401) [no cubierto explícitamente]
GET /me        → ✅ éxito, ✅ campos sensibles ocultos, ⬜ sin token
POST usuarios  → ✅ éxito admin, ✅ 403 otro rol, ⬜ validación 422
PATCH usuario  → ✅ éxito, ✅ desactivar + revocar tokens, ✅ 404
GET usuarios   → ✅ éxito admin, ✅ 403, ✅ 401
GET roles      → ✅ éxito admin, ✅ 403
```

---

### 4.2 Módulo Catálogo Maestro

**Archivo:** `tests/Feature/Catalogo/CatalogoTest.php`
**Seeders:** `RoleSeeder`, `PermissionSeeder`, `UnidadMedidaSeeder`, `BodegaSeeder`
**Helpers definidos:**
- `crearUsuarioCatalogo(string $rol): array` — retorna `['user', 'token']`.
- `unidadKg(): UnidadMedida` — obtiene la unidad `kg` del seeder.
- `crearMp(string $nombre): MateriaPrima` — crea MP directamente en BD.
- `crearPt(string $nombre): ProductoTerminado` — crea PT directamente en BD.

---

| # | Nombre del test | RF/RNF | Endpoint | Descripción | Escenario cubierto |
|---|---|---|---|---|---|
| 1 | `test_encargado_puede_listar_materias_primas` | HU-004 | `GET /api/v1/materias-primas` | Encargado lista MPs; verifica `count(data) === 1`. | Listado con permiso |
| 2 | `test_sin_token_no_puede_listar_materias_primas` | — | `GET /api/v1/materias-primas` | Sin token → 401. | Autenticación obligatoria |
| 3 | `test_encargado_puede_crear_materia_prima` | HU-004 | `POST /api/v1/materias-primas` | Encargado crea MP → 201 con `data.nombre` correcto. | Creación happy path |
| 4 | `test_gerencia_puede_crear_materia_prima` | HU-004 | `POST /api/v1/materias-primas` | Gerencia también tiene permiso `materias_primas.escribir` → 201. | Permiso por rol |
| 5 | `test_jefe_produccion_no_puede_crear_materia_prima` | RNFSEC-04 | `POST /api/v1/materias-primas` | Jefe de producción no tiene `materias_primas.escribir` → 403. | Permiso denegado |
| 6 | `test_no_se_puede_crear_mp_con_nombre_duplicado` | — | `POST /api/v1/materias-primas` | Nombre duplicado → 422. | Validación unicidad |
| 7 | `test_encargado_puede_actualizar_materia_prima` | HU-005 | `PATCH /api/v1/materias-primas/{id}` | Actualiza `punto_reorden` → 200 con valor actualizado `"25.000"`. | Actualización |
| 8 | `test_encargado_puede_desactivar_materia_prima` | — | `DELETE /api/v1/materias-primas/{id}` | Desactiva MP → 200 con `data.activa=false`. Verifica que el registro aún existe en BD (eliminación lógica). | Baja lógica |
| 9 | `test_encargado_puede_crear_producto_terminado` | HU-006 | `POST /api/v1/productos-terminados` | Encargado crea PT → 201. | Creación PT |
| 10 | `test_encargado_puede_asociar_mp_a_pt` | HU-006 | `POST /api/v1/productos-terminados/{id}/materias-primas` | Asocia MP a PT con `cantidad_requerida` → 201 con `data.materia_prima_id`. | Relación MP-PT |
| 11 | `test_no_se_puede_asociar_mp_duplicada_a_pt` | — | `POST /api/v1/productos-terminados/{id}/materias-primas` | Misma MP dos veces → 409. | Validación duplicado |
| 12 | `test_encargado_puede_desasociar_mp_de_pt` | — | `DELETE /api/v1/productos-terminados/{id}/materias-primas/{mpId}` | Desasocia MP → 200. Verifica `RelacionMpPt::count() === 0`. | Eliminación relación |
| 13 | `test_encargado_puede_listar_bodegas` | — | `GET /api/v1/bodegas` | Lista bodegas → `count(data) === 3` (Principal + Producción + Ventas). | Listado bodegas |
| 14 | `test_jefe_produccion_puede_listar_bodegas` | — | `GET /api/v1/bodegas` | Jefe tiene `bodegas.leer` → 200. | Permiso lectura |
| 15 | `test_jefe_produccion_no_puede_crear_bodega` | RNFSEC-04 | `POST /api/v1/bodegas` | Jefe no tiene `bodegas.escribir` → 403. | Permiso escritura denegado |
| 16 | `test_encargado_puede_crear_presentacion_para_producto` | HU-007 | `POST /api/v1/productos-terminados/{id}/presentaciones` | Crea presentación `Caja x12` → 201. | Presentaciones |
| 17 | `test_todos_los_roles_pueden_listar_unidades_medida` | — | `GET /api/v1/unidades-medida` | Cualquier rol autenticado → 200. | Catálogo de referencia |
| 18 | `test_materia_prima_inexistente_retorna_404` | — | `GET /api/v1/materias-primas/99999` | ID inexistente → 404. | No encontrado |

---

### 4.3 Módulo Permisos (RBAC dinámico)

**Archivo:** `tests/Feature/Permisos/PermisosTest.php`
**Seeders:** `RoleSeeder`, `PermissionSeeder`
**Setup especial:** `Cache::flush()` en `beforeEach` para evitar contaminación de permisos cacheados entre tests (los `role_id` auto-incrementales en SQLite pueden reutilizar IDs de la caché anterior).
**Helpers definidos:**
- `crearUsuarioPermisos(string $rol): array` — retorna `['user', 'token']`.

---

| # | Nombre del test | RF/RNF | Endpoint | Descripción | Escenario cubierto |
|---|---|---|---|---|---|
| 1 | `test_admin_puede_listar_permisos` | HU-002 | `GET /api/v1/permisos` | Admin lista permisos → 200 con estructura `[{id, nombre, recurso, accion}]`. | Listado permisos |
| 2 | `test_sin_token_no_puede_listar_permisos` | — | `GET /api/v1/permisos` | Sin token → 401. | Autenticación |
| 3 | `test_encargado_no_puede_listar_permisos` | — | `GET /api/v1/permisos` | Encargado → 403 (no es administrador). | RBAC gestión |
| 4 | `test_admin_puede_ver_permisos_de_rol` | HU-002 | `GET /api/v1/roles/{id}/permisos` | Admin consulta permisos del rol encargado; verifica presencia de `materias_primas.leer` y `materias_primas.escribir`. | Vista permisos por rol |
| 5 | `test_permisos_de_rol_inexistente_retorna_404` | — | `GET /api/v1/roles/99999/permisos` | Rol inexistente → 404. | No encontrado |
| 6 | `test_admin_puede_asignar_permiso_a_rol` | HU-002 | `POST /api/v1/roles/{id}/permisos` | Admin asigna `recepciones.escribir` al jefe → 201. Verifica en BD que el permiso fue asignado. | Asignación permiso |
| 7 | `test_asignar_permiso_duplicado_retorna_409` | — | `POST /api/v1/roles/{id}/permisos` | Permiso ya asignado → 409. | Duplicado |
| 8 | `test_admin_puede_revocar_permiso_de_rol` | — | `DELETE /api/v1/roles/{id}/permisos/{permId}` | Admin revoca `materias_primas.escribir` del encargado → 200. Verifica en BD. | Revocación permiso |
| 9 | `test_revocar_permiso_no_asignado_retorna_409` | — | `DELETE /api/v1/roles/{id}/permisos/{permId}` | Revocar un permiso que el rol no tiene → 409. | Consistencia |
| 10 | `test_check_permission_encargado_puede_listar_materias_primas` | RNFSEC-04 | `GET /api/v1/materias-primas` | Encargado tiene `materias_primas.leer` → 200 vía middleware `CheckPermission`. | Verificación dinámica |
| 11 | `test_check_permission_jefe_no_puede_escribir_materias_primas` | RNFSEC-04 | `POST /api/v1/materias-primas` | Jefe no tiene `materias_primas.escribir` → 403 vía `CheckPermission`. | Middleware deniega |
| 12 | `test_check_permission_gerencia_puede_escribir_materias_primas` | RNFSEC-04 | `POST /api/v1/materias-primas` | Gerencia tiene `materias_primas.escribir` → status ≠ 403 (puede ser 422 por validación). | Middleware permite |
| 13 | `test_cache_se_invalida_al_revocar_permiso` | — | Múltiples endpoints | **Test complejo:** calienta caché del encargado → admin revoca permiso → verifica que `Cache::has("permisos_rol_{id}")` es `false` → encargado ya recibe 403. Usa `auth()->forgetGuards()` entre requests de distinto usuario. | Invalidación de caché |

---

### 4.4 Módulo Recepciones

**Archivo:** `tests/Feature/Recepciones/RecepcionesTest.php`
**Seeders:** `RoleSeeder`, `PermissionSeeder`, `UnidadMedidaSeeder`, `BodegaSeeder`
**Helpers definidos:**
- `crearUsuarioRec(string $rol): array`
- `crearMpRec(string $nombre): MateriaPrima`
- `crearOrden(string $proveedor): OrdenPedido`

---

| # | Nombre del test | RF/RNF | Endpoint | Descripción |
|---|---|---|---|---|
| 1 | `test_encargado_puede_listar_ordenes_pedido` | RFREC | `GET /api/v1/recepciones/ordenes` | Encargado lista órdenes → `count(data) === 1`. |
| 2 | `test_sin_token_no_puede_listar_ordenes` | — | `GET /api/v1/recepciones/ordenes` | Sin token → 401. |
| 3 | `test_jefe_puede_listar_ordenes_solo_lectura` | RNFSEC-04 | `GET /api/v1/recepciones/ordenes` | Jefe tiene `recepciones.leer` → 200. |
| 3b | `test_jefe_no_puede_crear_orden_pedido` | RNFSEC-04 | `POST /api/v1/recepciones/ordenes` | Jefe no tiene `recepciones.escribir` → 403. |
| 4 | `test_encargado_puede_crear_orden_pedido` | RFREC | `POST /api/v1/recepciones/ordenes` | Crea orden → 201 con `estado=pendiente`. |
| 5 | `test_crear_orden_sin_proveedor_retorna_422` | — | `POST /api/v1/recepciones/ordenes` | Payload vacío → 422. |
| 6 | `test_ver_orden_inexistente_retorna_404` | — | `GET /api/v1/recepciones/ordenes/99999` | ID inexistente → 404. |
| 7 | `test_encargado_puede_cerrar_orden` | RFREC | `PATCH /api/v1/recepciones/ordenes/{id}` | Cambia estado a `cerrada` → 200. |
| 8 | `test_registrar_recepcion_crea_lote_y_movimiento` | RFREC + RFINV02 | `POST /api/v1/recepciones/ordenes/{id}/recepciones` | Recepción crea lote en Bodega Principal con `cantidad_actual=50`. Verifica movimiento `RECEPCION_ENTRADA` en BD. |
| 9 | `test_orden_pasa_a_en_recepcion_tras_primera_recepcion` | RFREC | `POST /api/v1/recepciones/ordenes/{id}/recepciones` | Después de la primera recepción la orden pasa a estado `en_recepcion`. |
| 10 | `test_no_se_puede_recepcionar_orden_cerrada` | RFREC | `POST /api/v1/recepciones/ordenes/{id}/recepciones` | Orden `cerrada` → 422. |
| 11 | `test_no_se_puede_recepcionar_orden_anulada` | RFREC | `POST /api/v1/recepciones/ordenes/{id}/recepciones` | Orden `anulada` → 422. |
| 12 | `test_recepcion_con_mp_inexistente_retorna_422` | — | `POST /api/v1/recepciones/ordenes/{id}/recepciones` | `materia_prima_id=99999` → 422. |
| 13 | `test_recepcion_con_cantidad_cero_retorna_422` | — | `POST /api/v1/recepciones/ordenes/{id}/recepciones` | `cantidad=0` → 422. |
| 14 | `test_encargado_puede_listar_recepciones` | RFREC | `GET /api/v1/recepciones` | Lista recepciones → `count(data) === 1`. Usa `auth()->forgetGuards()` entre requests. |
| 15 | `test_gerencia_puede_listar_ordenes` | RNFSEC-04 | `GET /api/v1/recepciones/ordenes` | Gerencia tiene `recepciones.leer` → 200. |

> **Nota técnica:** El test 14 usa `auth()->forgetGuards()` — patrón necesario para re-autenticar correctamente al mismo usuario en dos requests consecutivas del mismo test.

---

### 4.5 Módulo Inventario — Stock y Alertas

**Archivo:** `tests/Feature/Inventario/InventarioTest.php`
**Seeders:** `RoleSeeder`, `PermissionSeeder`, `UnidadMedidaSeeder`, `BodegaSeeder`
**Helpers definidos:**
- `crearUsuarioInv(string $rol): array`
- `crearLoteMp(int $mpId, float $cantidad, ?string $fechaVencimiento, ?int $bodegaId): LoteMateriaPrima` — crea `OrdenPedido` + `Recepcion` stub + lote. Útil para simular stock sin pasar por la API de recepciones.
- `crearMpInv(string $nombre, float $puntoReorden): MateriaPrima`

---

| # | Nombre del test | RF/RNF | Endpoint | Descripción |
|---|---|---|---|---|
| 1 | `test_encargado_puede_consultar_stock_mp` | RFINV01 | `GET /api/v1/inventario/stock/mp` | Stock agregado de todas las MP. Verifica `nombre`, `stock_total=50.0`, `bajo_reorden=false`. |
| 2 | `test_sin_token_no_puede_consultar_stock` | — | `GET /api/v1/inventario/stock/mp` | Sin token → 401. |
| 3 | `test_jefe_puede_consultar_stock_mp` | HU-002 | `GET /api/v1/inventario/stock/mp` | Jefe tiene `inventario.leer` → 200. |
| 4 | `test_administrador_no_puede_consultar_stock` | RNFSEC-04 | `GET /api/v1/inventario/stock/mp` | Admin no tiene permiso operativo → 403. |
| 5 | `test_stock_mp_muestra_desglose_por_bodega` | — | `GET /api/v1/inventario/stock/mp` | MP con lotes en 2 bodegas → `stock_total=50.0`, `por_bodega.length=2`. |
| 6 | `test_puede_consultar_stock_mp_especifica` | RFINV01 | `GET /api/v1/inventario/stock/mp/{id}` | Detalle de una MP específica con `stock_total=15`. |
| 7 | `test_stock_mp_inexistente_retorna_404` | — | `GET /api/v1/inventario/stock/mp/99999` | ID inexistente → 404. |
| 8 | `test_alerta_mp_bajo_reorden` | RFINV01 | `GET /api/v1/inventario/alertas` | Una MP con 5 kg (punto_reorden=20) genera alerta con `bajo_reorden=true` y `faltante=15.0`. La MP normal no aparece. |
| 9 | `test_mp_sin_stock_aparece_en_alertas` | — | `GET /api/v1/inventario/alertas` | MP sin ningún lote (stock=0 < punto_reorden=5) sí aparece en alertas. |
| 10 | `test_stock_no_incluye_lotes_agotados` | — | `GET /api/v1/inventario/stock/mp/{id}` | Lote con `cantidad_actual=0` no se suma al stock total. `por_bodega.length=0`. |

---

### 4.6 Módulo Inventario — Traslados de MP

**Archivo:** `tests/Feature/Inventario/TrasladoTest.php`
**Seeders:** `RoleSeeder`, `PermissionSeeder`, `UnidadMedidaSeeder`, `BodegaSeeder`
**Helpers definidos:**
- `crearUsuarioTraslado(string $rol): array`
- `crearLoteEnPrincipal(float $cantidad, ?string $fechaVencimiento): LoteMateriaPrima` — crea MP, orden, recepción y lote en Bodega Principal con nombre único (`uniqid()`).

---

| # | Nombre del test | RF/RNF | Endpoint | Descripción |
|---|---|---|---|---|
| 1 | `test_sin_token_no_puede_trasladar` | — | `POST /api/v1/inventario/traslados` | Sin token → 401. |
| 2 | `test_gerencia_no_puede_trasladar_mp` | RNFSEC-04 | `POST /api/v1/inventario/traslados` | Gerencia no tiene `inventario.escribir` → 403. |
| 3 | `test_encargado_puede_trasladar_parcial` | RFINV04 | `POST /api/v1/inventario/traslados` | Traslado parcial (20 de 50): origen baja a 30, nuevo lote en destino con 20. `traslado_total=false`. |
| 4 | `test_jefe_puede_trasladar_total` | RFINV04 | `POST /api/v1/inventario/traslados` | Traslado total (30 de 30): lote original se mueve a bodega destino. `traslado_total=true`. |
| 5 | `test_traslado_genera_movimientos_inmutables` | HU-027 | `POST /api/v1/inventario/traslados` | Traslado genera `TRASLADO_SALIDA` y `TRASLADO_ENTRADA` en `movimientos_inventario`. |
| 6 | `test_traslado_con_cantidad_mayor_al_stock_retorna_422` | — | `POST /api/v1/inventario/traslados` | Cantidad > stock disponible → 422. |
| 7 | `test_traslado_misma_bodega_retorna_422` | — | `POST /api/v1/inventario/traslados` | Bodega destino = bodega origen → 422. |
| 8 | `test_traslado_parcial_hereda_fecha_vencimiento` | RFINV03 | `POST /api/v1/inventario/traslados` | El nuevo lote creado en destino hereda la `fecha_vencimiento` del lote origen (preserva trazabilidad FEFO). |
| 9 | `test_traslado_lote_inexistente_retorna_422` | — | `POST /api/v1/inventario/traslados` | `lote_id=9999` → 422 (validación de Form Request). |

---

### 4.7 Módulo Producción

**Archivo:** `tests/Feature/Produccion/ProduccionTest.php`
**Seeders:** `RoleSeeder`, `PermissionSeeder`, `UnidadMedidaSeeder`, `BodegaSeeder`
**Helpers definidos:**
- `crearUsuarioProd(string $rol): array`
- `crearPtConMp(float $cantidadPorUnidad): array` — crea MP + PT + `RelacionMpPt` con la cantidad dada. Retorna `['mp', 'pt']`.
- `crearLoteProd(int $mpId, float $cantidad): LoteMateriaPrima` — crea lote stub en Bodega Principal.

---

| # | Nombre del test | RF/RNF | Endpoint | Descripción |
|---|---|---|---|---|
| 1 | `test_encargado_puede_crear_orden_produccion` | RFPROD01 | `POST /api/v1/produccion/ordenes` | Encargado crea orden → 201 con `estado=pendiente` y `cantidad_planificada="10.000"`. |
| 2 | `test_sin_token_no_puede_crear_orden` | — | `POST /api/v1/produccion/ordenes` | Sin token → 401. |
| 3 | `test_gerencia_no_puede_crear_orden_produccion` | RNFSEC-04 | `POST /api/v1/produccion/ordenes` | Gerencia no tiene `produccion.escribir` → 403. |
| 4 | `test_crear_orden_sin_stock_suficiente_retorna_422` | RFPROD05 | `POST /api/v1/produccion/ordenes` | Stock disponible (2 kg) insuficiente para 10 unidades × 0.5 kg/ud → 422 ya en la etapa de planificación. |
| 5 | `test_ejecutar_produccion_consume_mp_y_crea_lote_pt` | RFPROD01-03 | `POST /api/v1/produccion/ordenes/{id}/ejecutar` | Flujo completo: crea orden → ejecuta → verifica: MP descontada (100-5=95), lote PT creado en Bodega Producción con 10 ud, movimientos `CONSUMO_MP` y `PRODUCCION_ENTRADA` presentes. Usa `auth()->forgetGuards()`. |
| 6 | `test_no_se_puede_ejecutar_orden_producida` | — | `POST /api/v1/produccion/ordenes/{id}/ejecutar` | Ejecutar una orden ya en estado `producido` → 422. |
| 7 | `test_fefo_consume_lote_mas_proximo_a_vencer` | RFINV03 | `POST /api/v1/produccion/ordenes/{id}/ejecutar` | Con 2 lotes (uno vence en 10 días, otro en 6 meses): FEFO consume primero el próximo a vencer. Lote lejano queda intacto. |
| 8 | `test_trasladar_pt_a_ventas_lo_hace_disponible_para_despacho` | RFPROD03 | `POST /api/v1/produccion/ordenes/{id}/traslado-pt` | Flujo 3 pasos: crear orden → ejecutar → trasladar PT. PT en Bodega Ventas, `estaDisponibleParaDespacho()=true`. Orden en estado `completada`. |
| 9 | `test_no_se_puede_trasladar_pt_sin_ejecutar` | — | `POST /api/v1/produccion/ordenes/{id}/traslado-pt` | Orden en estado `pendiente` no puede trasladar PT → 422. |
| 10 | `test_encargado_puede_anular_orden_pendiente` | RFPROD01 | `PATCH /api/v1/produccion/ordenes/{id}/anular` | Anula orden pendiente → 200 con `estado=anulada`. |

---

### 4.8 Módulo Despacho

**Archivo:** `tests/Feature/Despacho/DespachoTest.php`
**Seeders:** `RoleSeeder`, `PermissionSeeder`, `UnidadMedidaSeeder`, `BodegaSeeder`
**Helpers definidos:**
- `crearUsuarioDespacho(string $rol): array`
- `crearOrdenProduccionStub(int $ptId): OrdenProduccion` — crea orden stub en estado `completada` para satisfacer FK de `lotes_producto_terminado`.
- `crearLotePtEnVentas(float $cantidad): LoteProductoTerminado` — simula ciclo completo ya ejecutado; lote en Bodega Ventas disponible para despacho.
- `crearLotePtEnProduccion(float $cantidad): LoteProductoTerminado` — lote en Bodega Producción, NO disponible para despacho.

---

| # | Nombre del test | RF/RNF | Endpoint | Descripción |
|---|---|---|---|---|
| 1 | `test_encargado_puede_registrar_despacho` | RFPROD03 | `POST /api/v1/despachos` | Despacha 4 unidades → 201 con `cantidad="4.000"` y `referencia_cliente`. |
| 2 | `test_sin_token_no_puede_despachar` | — | `POST /api/v1/despachos` | Sin token → 401. |
| 3 | `test_gerencia_no_puede_crear_despacho` | RNFSEC-04 | `POST /api/v1/despachos` | Gerencia no tiene `despachos.escribir` → 403. |
| 4 | `test_despacho_descuenta_stock_del_lote_pt` | RFPROD03 | `POST /api/v1/despachos` | Despacho de 4 ud → lote baja de 10 a 6. |
| 5 | `test_despacho_genera_movimiento_inmutable` | HU-027 | `POST /api/v1/despachos` | Despacho genera movimiento `DESPACHO_SALIDA` en BD. |
| 6 | `test_no_puede_despachar_lote_en_bodega_produccion` | RFPROD03 | `POST /api/v1/despachos` | Lote en Bodega Producción (no trasladado aún) → 422. |
| 7 | `test_despacho_con_cantidad_mayor_al_stock_retorna_422` | — | `POST /api/v1/despachos` | Stock insuficiente (5 ud) → 422 al pedir 10. |
| 8 | `test_multiples_despachos_del_mismo_lote` | — | `POST /api/v1/despachos` | Dos despachos consecutivos (5+4 de 12): stock acumulativo 12-5-4=3. `Despacho::count()===2`. Usa `auth()->forgetGuards()`. |
| 9 | `test_encargado_puede_listar_despachos` | — | `GET /api/v1/despachos` | Lista → 200 con estructura `{success, data}`. |
| 10 | `test_ver_despacho_incluye_datos_de_lote_y_producto` | HU-027 | `GET /api/v1/despachos/{id}` | Ver despacho por ID → estructura con `lote_pt`, `usuario`, `despachado_en`. Verifica trazabilidad. |

---

### 4.9 Módulo Reportes

**Archivo:** `tests/Feature/Reportes/ReportesTest.php`
**Seeders:** `RoleSeeder`, `PermissionSeeder`, `UnidadMedidaSeeder`, `BodegaSeeder`
**Helpers definidos:**
- `crearUsuarioReporte(string $rol): array`
- `crearLoteMpRpt(float $cantidad): LoteMateriaPrima` — lote MP en Bodega Principal.
- `crearLotePtVentasReporte(float $cantidad): LoteProductoTerminado` — PT en Bodega Ventas con orden stub.
- `crearDespachoDirecto(LoteProductoTerminado, float, int): Despacho` — crea despacho + movimiento directamente en BD (sin pasar por la API), útil para poblar datos de reportes.

---

| # | Nombre del test | RF/RNF | Endpoint | Descripción |
|---|---|---|---|---|
| 1 | `test_sin_token_no_puede_ver_reportes` | — | `GET /api/v1/reportes/kpis` | Sin token → 401. |
| 2 | `test_administrador_no_puede_ver_reportes` | RNFSEC-04 | `GET /api/v1/reportes/kpis` | Admin no tiene `reportes.leer` → 403. |
| 3 | `test_gerencia_puede_ver_kpis` | — | `GET /api/v1/reportes/kpis` | Gerencia → 200 con estructura completa: `ordenes_produccion.{pendientes, producidas, completadas, anuladas, total}`, `despachos_mes`, `mp_recibida_mes`, `alertas_reorden`, `periodo`. |
| 4 | `test_kpis_contiene_conteo_correcto_de_ordenes` | — | `GET /api/v1/reportes/kpis` | Con 1 orden `pendiente` y 1 `completada`: KPIs refleja `pendientes=1`, `completadas=1`, `total=2`. |
| 5 | `test_reporte_produccion_retorna_estructura` | — | `GET /api/v1/reportes/produccion` | Jefe → 200 con `{periodo, total_ordenes, total_planificado, total_producido, detalle}`. |
| 6 | `test_reporte_produccion_filtra_por_periodo` | — | `GET /api/v1/reportes/produccion?fecha_desde=...&fecha_hasta=...` | Con una orden de hoy y otra de hace 60 días: filtro de 7 días solo trae 1. |
| 7 | `test_reporte_despachos_retorna_estructura` | — | `GET /api/v1/reportes/despachos` | Encargado → 200. Verifica `total_despachos=1` y `total_unidades=3.0`. |
| 8 | `test_reporte_movimientos_filtra_por_tipo` | — | `GET /api/v1/reportes/movimientos?tipo=CONSUMO_MP` | Crea 2 movimientos distintos; filtro por tipo → solo devuelve 1 del tipo correcto. |
| 9 | `test_stock_pt_solo_muestra_lotes_en_ventas_con_stock` | — | `GET /api/v1/reportes/stock-pt` | Solo lotes en Bodega Ventas con stock > 0 aparecen → `total_lotes=1`. |
| 10 | `test_kpis_detecta_alertas_bajo_reorden` | — | `GET /api/v1/reportes/kpis` | MP con 2 kg (punto_reorden=10) → `alertas_reorden >= 1`. |

---

### 4.10 Módulo Bitácora de Accesos

**Archivo:** `tests/Feature/Bitacora/BitacoraTest.php`
**Seeders:** `RoleSeeder`
**Helpers definidos:**
- `crearUsuarioBitacora(string $rol): array`
- `crearRegistrosBitacora(int $userId, string $accion, int $cantidad)` — inserta N registros directamente con `BitacoraAcceso::create()`.

---

| # | Nombre del test | RF/RNF | Endpoint | Descripción |
|---|---|---|---|---|
| 1 | `test_sin_token_no_puede_ver_bitacora` | — | `GET /api/v1/bitacora` | Sin token → 401. |
| 2 | `test_gerencia_no_puede_ver_bitacora` | RNFSEC | `GET /api/v1/bitacora` | Gerencia → 403 (solo admin puede ver bitácora). |
| 3 | `test_jefe_produccion_no_puede_ver_bitacora` | RNFSEC | `GET /api/v1/bitacora` | Jefe producción → 403. |
| 4 | `test_encargado_no_puede_ver_bitacora` | RNFSEC | `GET /api/v1/bitacora` | Encargado → 403. |
| 5 | `test_admin_puede_listar_bitacora` | — | `GET /api/v1/bitacora` | Admin lista bitácora → 200 con estructura `{data: {data: [{id, accion, ip_address, created_at, usuario}], pagination: {total, por_pagina, pagina_actual, ultima_pagina}}}`. |
| 6 | `test_admin_puede_filtrar_bitacora_por_accion` | — | `GET /api/v1/bitacora?accion=login_fallido` | Filtra por acción → solo retorna registros de ese tipo. `pagination.total=2`. |
| 7 | `test_admin_puede_filtrar_bitacora_por_user_id` | — | `GET /api/v1/bitacora?user_id={id}` | Filtra por usuario → solo retorna sus registros. |
| 8 | `test_admin_puede_filtrar_bitacora_por_fechas` | — | `GET /api/v1/bitacora?desde=...&hasta=...` | Inserta registro de hace 10 días con `DB::table()->insert()` (para controlar `created_at`). Filtro de 1 día → solo retorna 2 recientes. |
| 9 | `test_bitacora_vacia_retorna_coleccion_vacia` | — | `GET /api/v1/bitacora` | Sin registros → `total=0`, `data=[]`. |
| 10 | `test_bitacora_paginacion_respeta_por_pagina` | — | `GET /api/v1/bitacora?por_pagina=3` | 10 registros con página de 3 → retorna exactamente 3 ítems. `por_pagina=3`, `total=10`. |
| 11 | `test_bitacora_registra_login_fallido_sin_usuario` | — | `GET /api/v1/bitacora?accion=login_fallido` | Registro con `user_id=null` (email inexistente): campo `usuario` en respuesta es `null`. |

---

### 4.11 Tests de Integración E2E

**Archivo:** `tests/Feature/IntegracionTest.php`
**Propósito:** Verificar que todos los módulos interactúan correctamente en el flujo real. **No mockea nada.** Usa SQLite `:memory:` y todos los módulos reales.
**Seeders:** `RoleSeeder`, `PermissionSeeder`, `UnidadMedidaSeeder`, `BodegaSeeder`

---

#### Test E2E-1: `flujo_completo_recepcion_produccion_despacho`

**Escenario:** La panadería recibe 100 kg de harina, planifica 10 panes (0.5 kg/pan), los produce, los traslada a Ventas y despacha 6.

| Etapa | Acción | Verificaciones |
|---|---|---|
| Catálogo | Crea MP, PT, `RelacionMpPt` directo en BD | — |
| Recepción (1a) | `POST /api/v1/recepciones/ordenes` | Orden en estado `pendiente` |
| Recepción (1b) | `POST /api/v1/recepciones/ordenes/{id}/recepciones` (100 kg) | 1 lote MP, `cantidad_actual=100`, en Bodega Principal, movimiento `RECEPCION_ENTRADA` |
| Stock | `GET /api/v1/inventario/stock/mp/{id}` | `stock_total=100`, `bajo_reorden=false` |
| Producción (crear) | `POST /api/v1/produccion/ordenes` (10 panes) | Orden `pendiente` |
| Producción (ejecutar) | `POST /api/v1/produccion/ordenes/{id}/ejecutar` | MP 100→95 kg, PT en Bodega Producción con 10 ud, movimientos `CONSUMO_MP` + `PRODUCCION_ENTRADA` |
| Traslado PT | `POST /api/v1/produccion/ordenes/{id}/traslado-pt` | Orden `completada`, PT en Bodega Ventas, `estaDisponibleParaDespacho()=true`, movimientos `TRASLADO_SALIDA` + `TRASLADO_ENTRADA` |
| Despacho | `POST /api/v1/despachos` (6 ud) | PT 10→4 ud, movimiento `DESPACHO_SALIDA` |
| Estado final | Verificación global | 6 tipos de movimiento exactos, `total_movimientos=6`, MP=95 kg, PT=4 ud, `Despacho::count()=1`, 1 orden `completada` |

---

#### Test E2E-2: `flujo_traslado_mp_redistribuye_stock_entre_bodegas`

**Escenario:** Recibir 80 kg de sal → trasladar 30 kg a Bodega Producción → verificar que el stock total no cambia, solo su distribución.

| Etapa | Acción | Verificaciones |
|---|---|---|
| Recepción | `POST /ordenes` + `POST /ordenes/{id}/recepciones` (80 kg) | Lote origen = 80 kg en Principal |
| Traslado | `POST /api/v1/inventario/traslados` (30 kg a Producción) | Origen → 50 kg, nuevo lote en Producción → 30 kg |
| Stock total | `GET /api/v1/inventario/stock/mp/{id}` | `stock_total=80.0`, `por_bodega.length=2` |

---

#### Test E2E-3: `flujo_produccion_rechazada_por_stock_insuficiente_no_modifica_inventario`

**Escenario:** Solo hay 3 kg disponibles. Se intenta crear una orden de 10 panes (necesita 10 kg). El sistema rechaza sin modificar nada.

| Verificación | Resultado esperado |
|---|---|
| `POST /api/v1/produccion/ordenes` (10 panes) | HTTP 422, `success=false` |
| `LoteMateriaPrima.cantidad_actual` | 3.0 (sin cambios) |
| `LoteProductoTerminado::count()` | 0 |
| `OrdenProduccion::count()` | 0 |
| `MovimientoInventario::count()` | 1 (solo el de recepción, ningún otro) |

---

## 5. Análisis transversal

### 5.1 Patrones de setup por test

| Patrón | Descripción | Archivos |
|---|---|---|
| `uses(RefreshDatabase::class)` | BD limpia por test | Todos los Feature tests |
| `beforeEach` + seeders | Rol + Permisos + Unidades + Bodegas | Todos excepto Auth y Bitácora |
| `Cache::flush()` en `beforeEach` | Evita contaminación de caché entre tests | PermisosTest únicamente |
| `auth()->forgetGuards()` | Fuerza re-autenticación del guard Sanctum entre requests del mismo test | RecepcionesTest, ProduccionTest, DespachoTest, IntegracionTest |

### 5.2 Helpers reutilizables por módulo

Cada módulo define sus propios helpers globales con nombres únicos para evitar colisiones (Pest los define en el scope global de PHP):

| Helper | Módulo | Propósito |
|---|---|---|
| `crearUsuario()` | Auth | Usuario con rol, password y sin bloqueos |
| `crearUsuarioCatalogo()` | Catálogo | Usuario + token |
| `crearMp()`, `crearPt()`, `unidadKg()` | Catálogo | Datos maestros |
| `crearUsuarioPermisos()` | Permisos | Usuario + token |
| `crearUsuarioRec()`, `crearOrden()`, `crearMpRec()` | Recepciones | Fixtures de órdenes |
| `crearUsuarioInv()`, `crearLoteMp()`, `crearMpInv()` | Inventario Stock | Lotes con stub de recepción |
| `crearUsuarioTraslado()`, `crearLoteEnPrincipal()` | Traslados | Lotes con nombre único |
| `crearUsuarioProd()`, `crearPtConMp()`, `crearLoteProd()` | Producción | Catálogo + stock listos para producir |
| `crearUsuarioDespacho()`, `crearLotePtEnVentas()`, `crearLotePtEnProduccion()`, `crearOrdenProduccionStub()` | Despacho | Lotes PT en distintas bodegas |
| `crearUsuarioReporte()`, `crearLoteMpRpt()`, `crearLotePtVentasReporte()`, `crearDespachoDirecto()` | Reportes | Datos para KPIs y reportes |
| `crearUsuarioBitacora()`, `crearRegistrosBitacora()` | Bitácora | Registros de acceso |

### 5.3 Convenciones de naming

- **Prefijo:** todos los tests usan `test_` + verbo + objeto + resultado (snake_case).
  - Ejemplo: `test_encargado_puede_listar_materias_primas`, `test_sin_token_no_puede_trasladar`
- **Comentarios de bloque:** cada test está precedido de un comentario descriptivo con `// ───` y referencia al RF.
- **Estructura AAA** (Arrange, Act, Assert) aplicada implícitamente en todos los tests, con comentarios explícitos solo en tests complejos del módulo Auth.
- Los tests E2E usan nombres sin prefijo `test_` (función global: `flujo_completo_...`).

### 5.4 Aserciones más usadas

| Aserción | Uso típico |
|---|---|
| `assertStatus(200/201/401/403/404/422)` | Verificación de código HTTP |
| `assertJson(['success' => true/false])` | Estructura estándar de respuesta |
| `assertJsonPath('data.campo', $valor)` | Campo específico en respuesta |
| `assertJsonCount($n, 'data')` | Cantidad de ítems en colección |
| `assertJsonStructure([...])` | Presencia de claves en respuesta |
| `expect($valor)->toBe()`, `toBeNull()`, `toBeFalse()`, `toBeTrue()` | Aserciones de estado en BD |
| `expect($coleccion)->toContain()`, `not->toContain()` | Verificar elementos en listas |
| `expect($val)->toBeGreaterThanOrEqual()` | Comparaciones numéricas |

### 5.5 Técnica `auth()->forgetGuards()`

Patrón específico de este proyecto para evitar el bug de caché de Sanctum entre requests del mismo test. Se usa en:

- `PermisosTest.php` — Test 13 (caché de permisos con 2 usuarios)
- `RecepcionesTest.php` — Test 14 (listar después de crear)
- `ProduccionTest.php` — Tests 5, 6, 7, 8, 9, 10
- `DespachoTest.php` — Test 8
- `IntegracionTest.php` — múltiples puntos del flujo E2E

---

## 6. Cobertura por requisito funcional

| Requisito | Descripción | Tests que lo cubren |
|---|---|---|
| **RFAUT01** | Login seguro | Auth T1, T2, T3, T4 |
| **RFAUT02** | Gestión de usuarios y roles | Auth T7, T8, T9, T10, T11, T12, T15, T16 |
| **RFAUT03** | Logout + revocación de token | Auth T5 |
| **RFAUT04** | Creación de usuarios (admin) | Auth T4, T8 |
| **RFREC** | Recepción contra orden | Recepciones T1–T15, E2E T1 y T3 |
| **RFINV01** | Stock de materias primas y alertas | Inventario T1–T10 |
| **RFINV02** | Trazabilidad por lote | Recepciones T8, E2E T1 |
| **RFINV03** | FEFO | Traslados T8, Producción T7 |
| **RFINV04** | Atomicidad en traslados | Traslados T3–T9, E2E T2 |
| **RFPROD01** | Crear y anular orden de producción | Producción T1, T4, T6, T10 |
| **RFPROD02** | Calcular requerimientos de MP | Producción T4 (indirecto) |
| **RFPROD03** | Ejecutar producción + despacho | Producción T5, T8, Despacho T1–T10, E2E T1 |
| **RFPROD05** | Rechazo por stock insuficiente | Producción T4, E2E T3 |
| **HU-002** | Visibilidad de inventario por rol | Inventario T3, T4, Catálogo T14 |
| **HU-004** | CRUD de materias primas | Catálogo T1–T8 |
| **HU-006** | CRUD de productos terminados + relaciones | Catálogo T9–T12 |
| **HU-007** | Presentaciones | Catálogo T16 |
| **HU-027** | Inmutabilidad de movimientos | Traslados T5, Despacho T5, E2E T1 (6 tipos verificados) |
| **RNFSEC-01** | Campos sensibles ocultos | Auth T17 |
| **RNFSEC-04** | RBAC por rol/permiso | Auth T7, T10, T16; Catálogo T5, T15; Permisos T3, T10, T11; Recepciones T3b; Inventario T4; Traslados T2; Producción T3; Despacho T3; Reportes T2; Bitácora T2, T3, T4 |

---

## 7. Gaps y áreas de mejora

### 7.1 Sin cobertura de Unit Tests reales

El directorio `tests/Unit/` solo contiene el placeholder de Laravel. **No existen Unit Tests** para:

- `FefoService` / lógica FEFO aislada (borde: lotes con misma fecha, lotes agotados, stock total = 0)
- `InventarioService` — cálculo de stock agregado y alertas
- `CheckPermission` middleware de forma aislada
- `ApiResponseTrait` — métodos `successResponse()`, `errorResponse()`, `createdResponse()`
- Modelos con lógica de dominio: `LoteProductoTerminado::estaDisponibleParaDespacho()`, `User::estaBloqueado()`, etc.

> El CLAUDE.md (§TestAgent) señala explícitamente que la lógica FEFO amerita Unit Tests de borde por su criticidad.

### 7.2 Tests de autenticación con gaps menores

| Escenario faltante | Endpoint |
|---|---|
| `POST /api/v1/auth/logout` sin token → esperaría 401 | Logout |
| `GET /api/v1/auth/me` sin token → esperaría 401 | Perfil |
| `POST /api/v1/auth/usuarios` con validación 422 (email duplicado, password sin confirmar) | Crear usuario |
| Login con email no existente (similar a credenciales inválidas, pero distinto path de código) | Login |

### 7.3 Casos de borde en producción no cubiertos

| Escenario | Módulo |
|---|---|
| `cantidad_producida < cantidad_planificada` (producción real distinta a la planificada) | Producción |
| FEFO con múltiples lotes donde se agota el primero y hay que continuar con el segundo | Producción |
| FEFO con lotes con la misma `fecha_vencimiento` (desempate por `fecha_ingreso`) | Producción |
| Rechazo en ejecución (Etapa 2) cuando stock cambia entre creación y ejecución de orden | Producción |
| Traslado de todo el stock de una MP específica dejando una bodega en cero | Traslados |

### 7.4 Módulo de reportes con cobertura de roles incompleta

El `ReportesTest` no verifica que Jefe de Producción y Encargado tengan acceso a todos los reportes, ni que el filtro por fechas funcione en KPIs.

### 7.5 Movimientos compensatorios (inmutabilidad HU-027)

Aunque los tests verifican que los movimientos se **crean** correctamente, **no existe ningún test** que verifique:
- Que un movimiento no puede borrarse (PUT/DELETE sobre `/movimientos` debería ser 405 o 403).
- Que una corrección crea un movimiento compensatorio con `movimiento_origen_id` referenciando al original.

### 7.6 Concurrencia

No existen tests de concurrencia (condiciones de carrera). El `lockForUpdate()` se usa en producción pero no hay tests que lo validen bajo condiciones simultáneas. Esto es esperado para tests de integración sobre SQLite `:memory:`, pero debe documentarse como limitación conocida.

### 7.7 Bitácora — acciones registradas por el sistema

Los tests de bitácora solo verifican el endpoint de consulta. **No hay tests** que verifiquen que las acciones `login_exitoso`, `login_fallido`, `logout`, `cuenta_bloqueada` se **registran automáticamente** como efecto secundario de los flujos de autenticación.

---

> **Documento generado:** 2026-06-10
> **Rama analizada:** `feature/login-minimal-response`
> **Total de tests documentados:** 129 (127 funcionales + 2 placeholders)
