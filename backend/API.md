# Daluzed — Documentación de la API REST v1

**Proyecto Nuclear 3 · Corporación Universitaria Alexander von Humboldt (CUE)**

---

## Información general

| Parámetro | Valor |
|-----------|-------|
| URL base | `http://127.0.0.1:8000/api/v1` |
| Formato | JSON |
| Autenticación | Bearer Token (Laravel Sanctum) |
| Encoding | UTF-8 |

**Cabeceras obligatorias en toda petición:**
```
Content-Type: application/json
Accept:       application/json
Authorization: Bearer {token}   ← solo en rutas protegidas
```

---

## Formato de respuestas

```json
// Éxito (200 / 201)
{ "success": true,  "message": "...", "data": { } }

// Error (4xx / 5xx)
{ "success": false, "message": "...", "errors": { } }
```

| HTTP | Significado |
|------|-------------|
| 200 | OK — operación exitosa |
| 201 | Created — recurso creado |
| 401 | Unauthorized — sin token o token inválido |
| 403 | Forbidden — sin permiso para esta acción |
| 404 | Not Found — recurso no encontrado |
| 422 | Unprocessable — error de validación |
| 500 | Server Error — error interno |

---

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| `administrador` | Gestión de usuarios y permisos — no opera el inventario |
| `gerencia` | Supervisión y reportes — solo lectura operativa |
| `jefe_produccion` | Produce, traslada y despacha — lectura completa |
| `encargado_inventarios` | Operación diaria completa del inventario |

---

## Usuarios de prueba (desarrollo)

| Email | Contraseña | Rol |
|-----------------------------|---------------|------------------------|
| admin@inventario.test | Admin1234! | administrador |
| gerencia@inventario.test | Gerencia1234! | gerencia |
| produccion@inventario.test | Prod1234! | jefe_produccion |
| inventarios@inventario.test | Inv1234! | encargado_inventarios |

---

---

# MÓDULO AUTENTICACIÓN — `/api/v1/auth`

---

## POST /auth/login
Autentica al usuario y retorna un token Bearer.

**Acceso:** Público.

```json
// Body
{ "email": "admin@inventario.test", "password": "Admin1234!" }

// Respuesta 200
{
  "success": true,
  "data": {
    "usuario": { "id": 1, "nombre": "Administrador", "email": "...", "rol": "administrador" },
    "token": "1|AbCdEfGh...",
    "rol": "administrador"
  }
}
```

| Error HTTP | Causa |
|------------|-------|
| 401 | Email/contraseña incorrectos o cuenta bloqueada |
| 403 | Usuario inactivo |

---

## POST /auth/logout
Revoca el token actual.

**Acceso:** Requiere token.

```json
// Respuesta 200
{ "success": true, "message": "Sesión cerrada exitosamente.", "data": null }
```

---

## GET /auth/me
Retorna el perfil del usuario autenticado.

**Acceso:** Requiere token.

```json
// Respuesta 200
{
  "success": true,
  "data": { "id": 2, "nombre": "Juan Pérez", "email": "juan@daluzed.com", "rol": "encargado_inventarios" }
}
```

---

## GET /auth/usuarios
Lista todos los usuarios del sistema.

**Acceso:** `administrador`.

---

## POST /auth/usuarios
Crea un nuevo usuario.

**Acceso:** `administrador`.

```json
// Body
{
  "name": "Juan Pérez",
  "email": "juan@daluzed.com",
  "password": "MiPassword123!",
  "password_confirmation": "MiPassword123!",
  "role_id": 4
}
```

| `role_id` | Rol |
|-----------|-----|
| 1 | administrador |
| 2 | gerencia |
| 3 | jefe_produccion |
| 4 | encargado_inventarios |

---

## PATCH /auth/usuarios/{id}
Actualiza datos de un usuario (nombre, email, rol, estado activo).

**Acceso:** `administrador`.

---

---

# MÓDULO CATÁLOGO

---

## Materias Primas — `/api/v1/materias-primas`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/materias-primas` | `materias_primas.leer` | Listar todas |
| GET | `/materias-primas/{id}` | `materias_primas.leer` | Ver una |
| POST | `/materias-primas` | `materias_primas.escribir` | Crear |
| PATCH | `/materias-primas/{id}` | `materias_primas.escribir` | Actualizar |
| DELETE | `/materias-primas/{id}` | `materias_primas.escribir` | Eliminar |
| POST | `/materias-primas/importar` | `materias_primas.escribir` | Importar Excel |

```json
// POST /materias-primas — Body
{
  "nombre": "Harina de trigo",
  "unidad_medida_id": 1,
  "punto_reorden": 20
}

// Respuesta 201
{
  "success": true,
  "data": { "id": 1, "nombre": "Harina de trigo", "unidad_medida": "kg", "punto_reorden": "20.000", "activa": true }
}
```

---

## Productos Terminados — `/api/v1/productos-terminados`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/productos-terminados` | `productos_terminados.leer` | Listar todos |
| GET | `/productos-terminados/{id}` | `productos_terminados.leer` | Ver uno |
| POST | `/productos-terminados` | `productos_terminados.escribir` | Crear |
| PATCH | `/productos-terminados/{id}` | `productos_terminados.escribir` | Actualizar |
| DELETE | `/productos-terminados/{id}` | `productos_terminados.escribir` | Eliminar |
| GET | `/productos-terminados/{id}/materias-primas` | `productos_terminados.leer` | Ver receta |
| POST | `/productos-terminados/{id}/materias-primas` | `productos_terminados.escribir` | Asociar MP a receta |
| PATCH | `/productos-terminados/{id}/materias-primas/{mp_id}` | `productos_terminados.escribir` | Actualizar cantidad en receta |
| DELETE | `/productos-terminados/{id}/materias-primas/{mp_id}` | `productos_terminados.escribir` | Quitar MP de receta |
| GET | `/productos-terminados/{id}/presentaciones` | `productos_terminados.leer` | Ver presentaciones |
| POST | `/productos-terminados/{id}/presentaciones` | `productos_terminados.escribir` | Crear presentación |

```json
// POST /productos-terminados — Body
{ "nombre": "Pan artesanal", "unidad_medida_id": 2 }

// POST /productos-terminados/{id}/materias-primas — Body
{ "materia_prima_id": 1, "cantidad_requerida": 0.5, "unidad_medida_id": 1 }
```

---

## Bodegas — `/api/v1/bodegas`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/bodegas` | `bodegas.leer` | Listar todas |
| GET | `/bodegas/{id}` | `bodegas.leer` | Ver una |
| POST | `/bodegas` | `bodegas.escribir` | Crear |
| PATCH | `/bodegas/{id}` | `bodegas.escribir` | Actualizar |

Tipos de bodega del sistema: `principal` · `produccion` · `ventas` · `otro`

---

## Unidades de Medida — `/api/v1/unidades-medida`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/unidades-medida` | Autenticado | Listar todas |

---

---

# MÓDULO RECEPCIONES — `/api/v1/recepciones`

Gestiona la entrada de materias primas al inventario.

---

## Órdenes de Pedido

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/recepciones/ordenes` | `recepciones.leer` | Listar órdenes |
| GET | `/recepciones/ordenes/{id}` | `recepciones.leer` | Ver orden |
| POST | `/recepciones/ordenes` | `recepciones.escribir` | Crear orden de pedido |
| PATCH | `/recepciones/ordenes/{id}` | `recepciones.escribir` | Actualizar estado |

```json
// POST /recepciones/ordenes — Body
{
  "proveedor": "Molinos del Norte",
  "fecha_esperada": "2026-06-15",   // opcional
  "observaciones": "Urgente"         // opcional
}

// Respuesta 201
{
  "success": true,
  "data": { "id": 1, "proveedor": "Molinos del Norte", "estado": "pendiente", "created_at": "..." }
}
```

Estados de orden: `pendiente` → `en_recepcion` → `cerrada` | `anulada`

---

## Registrar Recepción

```
POST /recepciones/ordenes/{id}/recepciones
```

**Permiso:** `recepciones.escribir` — solo `encargado_inventarios`.

Registra la entrada física de MP. Crea un `LoteMateriaPrima` en **Bodega Principal** y genera un movimiento `RECEPCION_ENTRADA`.

```json
// Body
{
  "observaciones": "Lote revisado",   // opcional
  "items": [
    {
      "materia_prima_id": 1,
      "cantidad": 100,
      "fecha_vencimiento": "2026-12-01"   // opcional — null si la MP no vence
    }
  ]
}

// Respuesta 201
{
  "success": true,
  "data": {
    "id": 1,
    "orden_pedido_id": 1,
    "items": [
      {
        "materia_prima": "Harina de trigo",
        "cantidad": "100.000",
        "bodega": "Bodega Principal",
        "lote_id": 1
      }
    ]
  }
}
```

---

## Listar / Ver Recepciones

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/recepciones` | `recepciones.leer` | Listar todas |
| GET | `/recepciones/{id}` | `recepciones.leer` | Ver detalle |

---

---

# MÓDULO INVENTARIO — `/api/v1/inventario`

---

## Consultar stock de MP

```
GET /inventario/stock/mp
GET /inventario/stock/mp/{id}
```

**Permiso:** `inventario.leer`

```json
// Respuesta 200
{
  "success": true,
  "data": {
    "materia_prima_id": 1,
    "nombre": "Harina de trigo",
    "unidad_medida": "kg",
    "punto_reorden": 20,
    "stock_total": 95.0,
    "bajo_reorden": false,
    "por_bodega": [
      { "bodega_id": 1, "bodega": "Bodega Principal", "stock": 95.0, "lotes_activos": 1, "proximo_vencimiento": "2026-12-01" }
    ]
  }
}
```

---

## Alertas de reorden

```
GET /inventario/alertas
```

**Permiso:** `alertas.leer`

Retorna MP cuyo stock total está por debajo del `punto_reorden`.

```json
// Respuesta 200
{
  "success": true,
  "data": [
    {
      "materia_prima_id": 2,
      "nombre": "Mantequilla",
      "stock_total": 5.0,
      "punto_reorden": 20,
      "bajo_reorden": true,
      "faltante": 15.0
    }
  ]
}
```

---

## Trasladar MP entre bodegas

```
POST /inventario/traslados
```

**Permiso:** `inventario.escribir` — `jefe_produccion` y `encargado_inventarios`.

Mueve una cantidad de MP de una bodega a otra. Genera movimientos `TRASLADO_SALIDA` y `TRASLADO_ENTRADA`.

- **Traslado parcial** (`cantidad < stock del lote`): reduce el lote origen y crea un nuevo lote en destino heredando `recepcion_id` y `fecha_vencimiento`.
- **Traslado total** (`cantidad == stock del lote`): actualiza `bodega_id` del lote directamente.

```json
// Body
{
  "lote_id": 1,
  "bodega_destino_id": 2,
  "cantidad": 30
}

// Respuesta 201
{
  "success": true,
  "data": {
    "lote_origen_id": 1,
    "lote_destino_id": 5,
    "materia_prima": "Harina de trigo",
    "cantidad": 30,
    "bodega_origen_id": 1,
    "bodega_destino_id": 2,
    "traslado_total": false
  }
}
```

| Error | Causa |
|-------|-------|
| 422 | Stock insuficiente (detalle con disponible / solicitada / faltante) |
| 422 | Bodega destino igual a bodega origen |

---

---

# MÓDULO PRODUCCIÓN — `/api/v1/produccion`

Gestiona el ciclo productivo en 4 etapas.

---

## Etapa 1 — Crear orden de producción

```
POST /produccion/ordenes
```

**Permiso:** `produccion.escribir` — `jefe_produccion` y `encargado_inventarios`.

Valida stock disponible en Bodega Principal antes de persistir. Si alguna MP no tiene stock suficiente, retorna 422.

```json
// Body
{
  "producto_terminado_id": 1,
  "cantidad_planificada": 10,
  "fecha_planificada": "2026-06-01",
  "observaciones": "Lote mañana"   // opcional
}

// Respuesta 201
{
  "success": true,
  "data": {
    "id": 1,
    "estado": "pendiente",
    "producto_terminado": { "id": 1, "nombre": "Pan artesanal" },
    "cantidad_planificada": "10.000",
    "requerimientos": [
      { "materia_prima_id": 1, "materia_prima": "Harina de trigo", "cantidad_requerida": "5.000" }
    ]
  }
}
```

| Error | Causa |
|-------|-------|
| 422 | Stock insuficiente — indica qué MP falta y cuánta |

---

## Etapa 2 — Ejecutar producción

```
POST /produccion/ordenes/{id}/ejecutar
```

**Permiso:** `produccion.escribir`

Consume MP de Bodega Principal usando **FEFO** (lote más próximo a vencer primero). Crea un `LoteProductoTerminado` en Bodega Producción.

```json
// Body
{ "cantidad_producida": 10 }

// Respuesta 200
{
  "success": true,
  "data": {
    "id": 1,
    "estado": "producido",
    "cantidad_producida": "10.000"
  }
}
```

| Error | Causa |
|-------|-------|
| 422 | Orden no está en estado `pendiente` |
| 422 | Stock insuficiente al momento de ejecutar |

---

## Etapa 3 — Trasladar PT a Ventas

```
POST /produccion/ordenes/{id}/traslado-pt
```

**Permiso:** `produccion.escribir`

Mueve el lote de PT de Bodega Producción → Bodega Ventas. Tras esto el PT queda **disponible para despacho**.

```json
// Body: ninguno

// Respuesta 200
{
  "success": true,
  "data": { "id": 1, "estado": "completada" }
}
```

| Error | Causa |
|-------|-------|
| 422 | Orden no está en estado `producido` |

---

## Anular orden

```
PATCH /produccion/ordenes/{id}/anular
```

**Permiso:** `produccion.escribir`

Solo se pueden anular órdenes en estado `pendiente`.

```json
// Respuesta 200
{ "success": true, "data": { "id": 1, "estado": "anulada" } }
```

---

## Consultar órdenes

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/produccion/ordenes` | `produccion.leer` | Listar todas |
| GET | `/produccion/ordenes/{id}` | `produccion.leer` | Ver detalle |

---

---

# MÓDULO DESPACHO — `/api/v1/despachos`

Gestiona la salida de PT desde Bodega Ventas hacia clientes.

**Requisito:** el lote de PT debe estar en bodega de tipo `ventas` (tras el traslado — Etapa 3).

---

## Registrar despacho

```
POST /despachos
```

**Permiso:** `despachos.escribir` — `jefe_produccion` y `encargado_inventarios`.

```json
// Body
{
  "lote_pt_id": 1,
  "cantidad": 6,
  "referencia_cliente": "Cafetería Central"   // opcional
}

// Respuesta 201
{
  "success": true,
  "data": {
    "id": 1,
    "cantidad": "6.000",
    "referencia_cliente": "Cafetería Central",
    "despachado_en": "2026-06-01 10:30:00",
    "lote_pt": {
      "id": 1,
      "cantidad_restante": "4.000",
      "producto_terminado": { "id": 1, "nombre": "Pan artesanal" },
      "bodega": { "nombre": "Área de Ventas" }
    },
    "movimiento_id": 8
  }
}
```

| Error | Causa |
|-------|-------|
| 422 | El lote no está en bodega tipo `ventas` |
| 422 | Stock insuficiente (detalle con disponible / solicitada) |

---

## Listar / Ver despachos

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/despachos` | `despachos.leer` | Listar todos |
| GET | `/despachos/{id}` | `despachos.leer` | Ver con trazabilidad completa |

---

---

# MÓDULO REPORTES — `/api/v1/reportes`

**Permiso:** `reportes.leer` — `gerencia`, `jefe_produccion`, `encargado_inventarios`.

Todos los endpoints admiten filtros opcionales por período: `?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD`

---

## KPIs globales

```
GET /reportes/kpis
```

Retorna indicadores del mes actual.

```json
// Respuesta 200
{
  "success": true,
  "data": {
    "ordenes_produccion": {
      "pendientes": 2, "producidas": 1, "completadas": 5, "anuladas": 0, "total": 8
    },
    "despachos_mes": 48.0,
    "mp_recibida_mes": 500.0,
    "alertas_reorden": 1,
    "periodo": { "desde": "2026-06-01", "hasta": "2026-06-30" }
  }
}
```

---

## Reporte de producción

```
GET /reportes/produccion?fecha_desde=2026-06-01&fecha_hasta=2026-06-30
```

```json
{
  "data": {
    "periodo": { "desde": "2026-06-01", "hasta": "2026-06-30" },
    "total_ordenes": 5,
    "total_planificado": 50.0,
    "total_producido": 48.0,
    "detalle": [
      {
        "id": 1, "estado": "completada", "fecha_planificada": "2026-06-01",
        "producto_terminado": "Pan artesanal", "unidad_medida": "unidad",
        "cantidad_planificada": 10.0, "cantidad_producida": 10.0
      }
    ]
  }
}
```

---

## Reporte de despachos

```
GET /reportes/despachos?fecha_desde=2026-06-01&fecha_hasta=2026-06-30
```

```json
{
  "data": {
    "total_despachos": 3,
    "total_unidades": 24.0,
    "por_producto": [
      { "producto_terminado": "Pan artesanal", "total_despachado": 24.0, "num_despachos": 3 }
    ],
    "detalle": [ ... ]
  }
}
```

---

## Reporte de movimientos de inventario

```
GET /reportes/movimientos?tipo=CONSUMO_MP&fecha_desde=2026-06-01
```

**Filtros disponibles:** `fecha_desde`, `fecha_hasta`, `tipo`, `entidad_tipo`

Tipos de movimiento: `RECEPCION_ENTRADA` · `CONSUMO_MP` · `PRODUCCION_ENTRADA` · `TRASLADO_SALIDA` · `TRASLADO_ENTRADA` · `DESPACHO_SALIDA` · `AJUSTE_ENTRADA` · `AJUSTE_SALIDA`

```json
{
  "data": {
    "filtros": { "tipo": "CONSUMO_MP", "fecha_desde": "2026-06-01" },
    "total": 5,
    "por_tipo": [ { "tipo": "CONSUMO_MP", "cantidad": 25.0, "count": 5 } ],
    "detalle": [
      {
        "id": 3, "tipo": "CONSUMO_MP", "direccion": "salida",
        "bodega": "Bodega Principal", "cantidad": 5.0,
        "fecha": "2026-06-01 09:00:00", "compensatorio": false
      }
    ]
  }
}
```

---

## Stock de PT disponible

```
GET /reportes/stock-pt
```

Retorna lotes de PT en bodega `ventas` con `cantidad_actual > 0`.

```json
{
  "data": {
    "total_lotes": 2,
    "por_producto": [
      { "producto_terminado": "Pan artesanal", "stock_total": 4.0, "lotes_activos": 1 }
    ],
    "detalle": [
      {
        "lote_id": 1, "producto_terminado": "Pan artesanal",
        "bodega": "Área de Ventas", "cantidad_inicial": 10.0,
        "cantidad_actual": 4.0, "fecha_produccion": "2026-06-01"
      }
    ]
  }
}
```

---

---

# MÓDULO PERMISOS — `/api/v1` (solo administrador)

---

## Gestión de la matriz RBAC

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/permisos` | Listar todos los permisos disponibles |
| GET | `/roles/{roleId}/permisos` | Ver permisos asignados a un rol |
| POST | `/roles/{roleId}/permisos` | Asignar permiso a un rol |
| DELETE | `/roles/{roleId}/permisos/{permissionId}` | Revocar permiso de un rol |
| GET | `/roles` | Listar todos los roles |

**Acceso:** solo `administrador`.

```json
// POST /roles/{roleId}/permisos — Body
{ "permission_id": 5 }

// Respuesta 200
{ "success": true, "message": "Permiso asignado correctamente." }
```

> Los cambios en permisos surten efecto inmediatamente — el caché de 60 min se invalida automáticamente.

---

## Matriz de permisos actual

| Permiso | Gerencia | Jefe Prod. | Encargado |
|---------|:--------:|:----------:|:---------:|
| `materias_primas.leer` | ✅ | ✅ | ✅ |
| `materias_primas.escribir` | ✅ | ❌ | ✅ |
| `productos_terminados.leer` | ✅ | ✅ | ✅ |
| `productos_terminados.escribir` | ✅ | ❌ | ✅ |
| `bodegas.leer` | ✅ | ✅ | ✅ |
| `bodegas.escribir` | ✅ | ❌ | ✅ |
| `inventario.leer` | ✅ | ✅ | ✅ |
| `inventario.escribir` | ❌ | ✅ | ✅ |
| `produccion.leer` | ✅ | ✅ | ✅ |
| `produccion.escribir` | ❌ | ✅ | ✅ |
| `recepciones.leer` | ✅ | ✅ | ✅ |
| `recepciones.escribir` | ❌ | ❌ | ✅ |
| `despachos.leer` | ✅ | ✅ | ✅ |
| `despachos.escribir` | ❌ | ✅ | ✅ |
| `alertas.leer` | ✅ | ✅ | ✅ |
| `reportes.leer` | ✅ | ✅ | ✅ |

---

---

# Flujo de autenticación recomendado

```
1. POST /auth/login → guardar { token, rol } en el cliente

2. Cada petición → Authorization: Bearer {token}

3. Respuesta HTTP 401 → token expirado → redirigir a login

4. POST /auth/logout → eliminar token del cliente
```

---

# Manejo de errores recomendado

```
HTTP 200/201 → procesar data
HTTP 401     → limpiar token → redirigir a login
HTTP 403     → mostrar "Sin permisos para esta acción"
HTTP 404     → mostrar "Recurso no encontrado"
HTTP 422     → mostrar errores.campo por campo en el formulario
HTTP 500     → mostrar mensaje genérico de error del servidor
```
