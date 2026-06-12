# Plan Integral de Pruebas — IPN DEV Inventario

**Versión:** 1.0  
**Fecha:** 10 de mayo de 2026  
**Proyecto:** Sistema de Gestión de Inventario (Monolito Modular Laravel + Next.js)  
**Corporación:** Corporación Universitaria Alexander von Humboldt (CUE)  
**Equipo de QA:** Equipo de Desarrollo IPN

---

## 📑 Contenido

1. [Introducción y Alcance](#introducción-y-alcance)
2. [Estrategia de Pruebas](#estrategia-de-pruebas)
3. [Entorno de Pruebas](#entorno-de-pruebas)
4. [Casos de Prueba](#casos-de-prueba)
5. [Métricas de Aceptación](#métricas-de-aceptación)
6. [Cronograma](#cronograma)
7. [Roles y Responsabilidades](#roles-y-responsabilidades)
8. [Gestión de Defectos](#gestión-de-defectos)

---

## Introducción y Alcance

### Descripción del Sistema

**IPN DEV** es un sistema integral de gestión de inventario y logística desarrollado como proyecto académico nuclear 3. La arquitectura implementa un **monolito modular en Laravel** con separación clara de responsabilidades (Controller → Service → Repository → Model) y un frontend en **Next.js** con validación y manejo de sesiones.

### Módulos a Validar

#### ✅ Implementados y en Alcance de QA

1. **Módulo de Autenticación (Auth)**
   - Login / Logout
   - Gestión de usuarios (creación)
   - Bloqueo automático tras intentos fallidos
   - Auditoría de accesos (bitácora)
   - Control de acceso basado en roles (RBAC)

2. **Componentes Frontend**
   - Formulario de login
   - Manejo de tokens
   - Navegación básica

#### ⏳ No Implementados [PENDIENTE DE IMPLEMENTACIÓN]

- Módulo de Inventario (CRUD de items, stock, etc.)
- Lógica FEFO (First Expired, First Out)
- Dashboard de Gerencia
- Reportes
- Gestión de categorías de productos
- Asignaciones de roles dinámicas

### Objetivos del Plan

1. **Validación funcional** de endpoints de autenticación
2. **Validación de seguridad** (contraseñas, tokens, permisos)
3. **Validación de reglas de negocio** (bloqueo, intentos, roles)
4. **Validación de auditoría** (bitácora de accesos)
5. **Validación del frontend** (formularios, manejo de errores)
6. **Cobertura de código** mínima del 70% en módulos críticos
7. **Preparación** de la estructura para pruebas de módulos futuros

---

## Estrategia de Pruebas

### Tipos de Pruebas

#### 1. Pruebas Unitarias
**Stack:** PHPUnit + Pest (Backend), Jest (Frontend)

- **Alcance:** Métodos individuales sin dependencias externas
- **Cobertura objetivo:** 80% de lógica de negocio
- **Ejemplos:**
  - `AuthService::login()` con credenciales válidas e inválidas
  - `User::estaBloqueado()` con diferentes fechas
  - `UserRepository` métodos de persistencia
  - Validadores `LoginRequest`, `CreateUserRequest`

#### 2. Pruebas de Integración
**Stack:** PHPUnit con base de datos de prueba, Feature tests de Pest

- **Alcance:** Interacción entre capas (Controller → Service → Repository → BD)
- **Cobertura objetivo:** 100% de endpoints reales
- **Ejemplos:**
  - POST `/api/v1/auth/login` con usuario válido e inválido
  - GET `/api/v1/auth/me` con y sin token
  - POST `/api/v1/auth/logout` verificando revocación de token
  - POST `/api/v1/auth/usuarios` como admin vs usuario normal

#### 3. Pruebas Funcionales
**Stack:** Postman/Insomnia + Next.js Testing Library

- **Alcance:** Flujos de usuario completos (E2E light)
- **Ejemplos:**
  - Flujo: Login → token guardado → GET /me → Logout
  - Flujo: Intentos fallidos → Bloqueo → Esperar 15 min → Login exitoso
  - Flujo: Usuario admin crea usuario → usuario nuevo hace login
  - Flujo: Frontend renderiza formulario → envía credenciales → redirige a dashboard

#### 4. Pruebas No Funcionales

**Rendimiento:**
- Tiempo de respuesta del login: < 500 ms
- Validación de token: < 50 ms
- Búsqueda de usuario por email: < 100 ms

**Seguridad:**
- Contraseñas nunca en logs ni respuestas
- Contraseña mínimo 8 caracteres (creación)
- Bcrypt con cost factor 12
- Token Sanctum con expiración 30 min
- Mensajes de error genéricos (no revelan emails)

**Escalabilidad:**
- 100 logins simultáneos sin fallos
- Bitácora con 10,000 registros sin degradación

**Usabilidad:**
- Validación frontend (errores claros)
- Accesibilidad WCAG 2.1 AA
- Respuesta en español

---

## Entorno de Pruebas

### Stack Tecnológico

| Componente    | Herramienta/Versión | Propósito |
|---------------|---------------------|----------|
| **Backend**   | PHP 8.3 + Laravel 11 | Servidor API |
| **BD Pruebas**| SQLite (test) / MySQL 8.0 (staging) | Persistencia |
| **Pruebas API** | PHPUnit 11.x + Pest 2.x | Pruebas de integración |
| **Frontend**  | Next.js 14 + Testing Library | Renderizado + validación |
| **Tests UI**  | Jest + React Testing Library | Componentes frontend |
| **API Testing** | Postman / Insomnia | Validación de endpoints |
| **Performance** | Laravel Telescope / DevTools | Monitoreo |
| **CI/CD**     | GitHub Actions (recomendado) | Automatización |

### Configuración de Ambientes

#### Development
```bash
# Backend
cd backend
php artisan serve  # http://localhost:8000
php artisan migrate
php artisan db:seed

# Frontend
cd frontend
npm run dev  # http://localhost:3000
```

#### Testing
```bash
# Backend — SQLite en memoria
php artisan test --env=testing

# Frontend
npm test
```

#### Staging (Opcional)
```bash
docker-compose up -d  # docker-compose.yml
# Backend: http://localhost:8000/api/v1
# Frontend: http://localhost:3000
```

### Datos de Prueba

**Roles precargados (seeders):**
```php
- administrador
- gerencia
- jefe_produccion
- encargado_inventarios
```

**Usuarios de prueba (UserSeeder):**
```
Admin:
  Email: admin@inventario.test
  Password: Admin1234!
  Rol: administrador
  Activo: true

Gerente:
  Email: gerente@inventario.test
  Password: Gerente1234!
  Rol: gerencia
  Activo: true

Operario:
  Email: operario@inventario.test
  Password: Operario1234!
  Rol: encargado_inventarios
  Activo: true
```

---

## Casos de Prueba

### Módulo: Autenticación (AUTH)

#### 🔐 **Grupo: Login**

---

##### **TC-AUTH-01: Login exitoso con credenciales válidas**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-01 |
| **Módulo** | Autenticación |
| **Descripción** | Validar que un usuario registrado puede iniciar sesión y recibe un token válido |
| **Precondiciones** | <ul><li>Usuario admin@inventario.test registrado y activo</li><li>Contraseña: Admin1234!</li><li>Base de datos sincronizada</li></ul> |
| **Pasos** | 1. Hacer POST a `/api/v1/auth/login`<br/>2. Body: `{"email": "admin@inventario.test", "password": "Admin1234!"}`<br/>3. Verificar respuesta HTTP 200<br/>4. Validar estructura: `success=true`, `message`, `data.token`, `data.usuario`, `data.rol` |
| **Resultado Esperado** | <ul><li>HTTP 200 OK</li><li>Token generado (Bearer token válido)</li><li>Datos del usuario incluyen: id, name, email, rol</li><li>Campo `password` NO aparece en respuesta</li><li>Rol devuelto: "administrador"</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **ALTA** |
| **Notas** | Requisito RFAUT01: autenticación básica |

---

##### **TC-AUTH-02: Login fallido — email incorrecto**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-02 |
| **Módulo** | Autenticación |
| **Descripción** | Validar manejo de email inexistente en login |
| **Precondiciones** | Base de datos sin usuario noexiste@test.com |
| **Pasos** | 1. POST `/api/v1/auth/login`<br/>2. Body: `{"email": "noexiste@test.com", "password": "Admin1234!"}`<br/>3. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 401 Unauthorized</li><li>Mensaje genérico: "Credenciales incorrectas"</li><li>NO revela si el email existe</li><li>Bitácora registra: `login_fallido`, user_id=null</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **ALTA** |
| **Notas** | Seguridad RNFSEC-01: mensajes genéricos |

---

##### **TC-AUTH-03: Login fallido — contraseña incorrecta**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-03 |
| **Módulo** | Autenticación |
| **Descripción** | Validar rechazo de contraseña incorrecta e incremento de intentos |
| **Precondiciones** | <ul><li>Usuario admin@inventario.test existe</li><li>intentos_fallidos = 0</li></ul> |
| **Pasos** | 1. POST `/api/v1/auth/login`<br/>2. Body: `{"email": "admin@inventario.test", "password": "WrongPassword123!"}`<br/>3. Verificar respuesta<br/>4. Consultar BD: SELECT intentos_fallidos FROM users WHERE email='admin@inventario.test' |
| **Resultado Esperado** | <ul><li>HTTP 401 Unauthorized</li><li>Mensaje: "Credenciales incorrectas"</li><li>intentos_fallidos incrementado a 1</li><li>Bitácora: `login_fallido`, user_id = id_del_usuario</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **ALTA** |
| **Notas** | RFAUT01: conteo de intentos |

---

##### **TC-AUTH-04: Bloqueo automático tras 5 intentos fallidos**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-04 |
| **Módulo** | Autenticación |
| **Descripción** | Validar bloqueo de cuenta después de 5 intentos fallidos durante 15 minutos |
| **Precondiciones** | <ul><li>Usuario testeo@test.com existe, activo</li><li>intentos_fallidos = 0, bloqueado_hasta = null</li></ul> |
| **Pasos** | 1. Hacer 5 POST `/api/v1/auth/login` con contraseña incorrecta<br/>2. Verificar después del 5to intento<br/>3. Verificar BD: bloqueado_hasta debe ser 15 minutos en el futuro<br/>4. Intentar login nuevamente |
| **Resultado Esperado** | <ul><li>Primeros 4 intentos: HTTP 401</li><li>Quinto intento: HTTP 401 + "Cuenta bloqueada. Intente nuevamente en 15 minuto(s)."</li><li>bloqueado_hasta = NOW() + 15 min</li><li>Sexto intento inmediatamente: rechazado con mensaje de bloqueo</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **ALTA** |
| **Notas** | RFAUT01: seguridad contra fuerza bruta |

---

##### **TC-AUTH-05: Desbloqueo automático tras expirar tiempo de bloqueo**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-05 |
| **Módulo** | Autenticación |
| **Descripción** | Validar que la cuenta se desbloquea después de 15 minutos |
| **Precondiciones** | <ul><li>Usuario bloqueado@test.com con bloqueado_hasta = NOW() - 1 minuto (pasado)</li></ul> |
| **Pasos** | 1. POST `/api/v1/auth/login` con credenciales correctas<br/>2. Verificar respuesta<br/>3. Consultar BD: intentos_fallidos, bloqueado_hasta |
| **Resultado Esperado** | <ul><li>HTTP 200 OK</li><li>Token generado</li><li>intentos_fallidos reseteado a 0</li><li>bloqueado_hasta seteado a null</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **MEDIA** |
| **Notas** | Recuperación de bloqueo |

---

##### **TC-AUTH-06: Usuario inactivo no puede hacer login**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-06 |
| **Módulo** | Autenticación |
| **Descripción** | Validar que usuarios con activo=false no pueden autenticarse |
| **Precondiciones** | <ul><li>Usuario inactivo@test.com existe con activo=false</li><li>Contraseña correcta: Inactivo1234!</li></ul> |
| **Pasos** | 1. POST `/api/v1/auth/login` con credenciales<br/>2. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 403 Forbidden</li><li>Mensaje: "Usuario inactivo. Contacte al administrador."</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **ALTA** |
| **Notas** | RFAUT04: gestión de usuarios activos/inactivos |

---

##### **TC-AUTH-07: Validación de formato de entrada — email inválido**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-07 |
| **Módulo** | Autenticación |
| **Descripción** | Validar rechazo de emails mal formateados |
| **Precondiciones** | Ninguna |
| **Pasos** | 1. POST `/api/v1/auth/login`<br/>2. Body: `{"email": "notanemail", "password": "Test1234!"}`<br/>3. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 422 Unprocessable Entity</li><li>Error: "El correo electrónico no tiene un formato válido."</li><li>Campo `errors` contiene validación de email</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **MEDIA** |
| **Notas** | Validación FormRequest en backend |

---

##### **TC-AUTH-08: Validación de longitud de contraseña — muy corta**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-08 |
| **Módulo** | Autenticación |
| **Descripción** | Validar rechazo de contraseñas menores a 6 caracteres en login |
| **Precondiciones** | Ninguna |
| **Pasos** | 1. POST `/api/v1/auth/login`<br/>2. Body: `{"email": "admin@test.com", "password": "123"}`<br/>3. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 422 Unprocessable Entity</li><li>Error: "La contraseña debe tener al menos 6 caracteres."</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **MEDIA** |

---

##### **TC-AUTH-09: Validación de campos requeridos — falta email**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-09 |
| **Módulo** | Autenticación |
| **Descripción** | Validar rechazo cuando falta el campo email |
| **Precondiciones** | Ninguna |
| **Pasos** | 1. POST `/api/v1/auth/login`<br/>2. Body: `{"password": "Test1234!"}`<br/>3. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 422 Unprocessable Entity</li><li>Error: "El correo electrónico es obligatorio."</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **BAJA** |

---

#### 🚪 **Grupo: Logout**

---

##### **TC-AUTH-10: Logout exitoso — revoca token actual**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-10 |
| **Módulo** | Autenticación |
| **Descripción** | Validar que logout revoca el token del usuario |
| **Precondiciones** | <ul><li>Usuario autenticado con token válido</li><li>Token obtenido de login exitoso</li></ul> |
| **Pasos** | 1. GET `/api/v1/auth/me` con token (verificar que funciona)<br/>2. POST `/api/v1/auth/logout` con mismo token<br/>3. Verificar respuesta<br/>4. Intentar GET `/api/v1/auth/me` con el token revocado |
| **Resultado Esperado** | <ul><li>Logout: HTTP 200 OK, "Sesión cerrada exitosamente."</li><li>Segundo GET /me: HTTP 401 Unauthorized</li><li>Bitácora: evento `logout` registrado</li><li>Token eliminado de personal_access_tokens</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **ALTA** |
| **Notas** | RFAUT03: revocación de sesión |

---

##### **TC-AUTH-11: Logout sin autenticación — debe rechazarse**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-11 |
| **Módulo** | Autenticación |
| **Descripción** | Validar que logout requiere autenticación |
| **Precondiciones** | Ninguna (sin token) |
| **Pasos** | 1. POST `/api/v1/auth/logout` sin header Authorization<br/>2. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 401 Unauthorized</li><li>Mensaje: "Unauthenticated" o similar</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **MEDIA** |

---

#### 👤 **Grupo: Obtener usuario autenticado**

---

##### **TC-AUTH-12: GET /me con token válido**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-12 |
| **Módulo** | Autenticación |
| **Descripción** | Validar recuperación de datos del usuario autenticado |
| **Precondiciones** | <ul><li>Token válido obtenido de login</li><li>Usuario: admin@inventario.test, rol: administrador</li></ul> |
| **Pasos** | 1. GET `/api/v1/auth/me` con header `Authorization: Bearer {token}`<br/>2. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 200 OK</li><li>Estructura: `success=true`, `data.id`, `data.name`, `data.email`, `data.role.nombre`</li><li>Campo `password` NO aparece</li><li>role cargado (relación belongsTo)</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **ALTA** |
| **Notas** | RFAUT02: información del usuario |

---

##### **TC-AUTH-13: GET /me sin token — debe rechazarse**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-13 |
| **Módulo** | Autenticación |
| **Descripción** | Validar que /me requiere autenticación |
| **Precondiciones** | Ninguna |
| **Pasos** | 1. GET `/api/v1/auth/me` sin header Authorization<br/>2. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 401 Unauthorized</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **MEDIA** |

---

##### **TC-AUTH-14: GET /me con token expirado**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-14 |
| **Módulo** | Autenticación |
| **Descripción** | Validar rechazo de token expirado (> 30 min) |
| **Precondiciones** | <ul><li>Token generado hace 35 minutos</li><li>Configuración: expiración 30 min</li></ul> |
| **Pasos** | 1. GET `/api/v1/auth/me` con token antiguo<br/>2. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 401 Unauthorized</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **MEDIA** |
| **Notas** | [PENDIENTE: Confirmar config de expiración en Sanctum] |

---

#### 👥 **Grupo: Crear usuario (Admin)**

---

##### **TC-AUTH-15: Crear usuario exitoso como administrador**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-15 |
| **Módulo** | Autenticación |
| **Descripción** | Validar creación de nuevo usuario con rol por administrador |
| **Precondiciones** | <ul><li>Token de administrador válido</li><li>Rol: administrador</li><li>Email nuevo@test.com no existe</li></ul> |
| **Pasos** | 1. POST `/api/v1/auth/usuarios`<br/>2. Headers: `Authorization: Bearer {admin_token}`<br/>3. Body:<br/>`{`<br/>`"name": "Nuevo Usuario",`<br/>`"email": "nuevo@test.com",`<br/>`"password": "NewPass1234!",`<br/>`"password_confirmation": "NewPass1234!",`<br/>`"role_id": 2`<br/>`}`<br/>4. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 201 Created</li><li>Estructura: `success=true`, `data.id`, `data.name`, `data.email`</li><li>Usuario creado en BD con activo=true</li><li>Contraseña hasheada con bcrypt (nunca en plaintext)</li><li>Relación a role_id verificada</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **ALTA** |
| **Notas** | RFAUT02: solo admin puede crear usuarios |

---

##### **TC-AUTH-16: Crear usuario — email duplicado rechazado**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-16 |
| **Módulo** | Autenticación |
| **Descripción** | Validar rechazo de email duplicado |
| **Precondiciones** | <ul><li>Token de administrador</li><li>Email admin@inventario.test ya existe</li></ul> |
| **Pasos** | 1. POST `/api/v1/auth/usuarios`<br/>2. Body con email existente<br/>3. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 422 Unprocessable Entity</li><li>Error: "Ya existe un usuario registrado con ese correo electrónico."</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **ALTA** |

---

##### **TC-AUTH-17: Crear usuario — contraseña no coincide**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-17 |
| **Módulo** | Autenticación |
| **Descripción** | Validar validación de password_confirmed |
| **Precondiciones** | Token de administrador |
| **Pasos** | 1. POST `/api/v1/auth/usuarios`<br/>2. Body: password="Pass1234!", password_confirmation="DifferentPass1234!"<br/>3. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 422 Unprocessable Entity</li><li>Error: "La confirmación de la contraseña no coincide."</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **MEDIA** |

---

##### **TC-AUTH-18: Crear usuario — contraseña muy corta**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-18 |
| **Módulo** | Autenticación |
| **Descripción** | Validar contraseña mínimo 8 caracteres en creación |
| **Precondiciones** | Token de administrador |
| **Pasos** | 1. POST `/api/v1/auth/usuarios`<br/>2. Body: password="Short1!", password_confirmation="Short1!"<br/>3. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 422 Unprocessable Entity</li><li>Error: "La contraseña debe tener al menos 8 caracteres."</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **MEDIA** |

---

##### **TC-AUTH-19: Crear usuario — rol inexistente**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-19 |
| **Módulo** | Autenticación |
| **Descripción** | Validar que role_id debe existir |
| **Precondiciones** | Token de administrador |
| **Pasos** | 1. POST `/api/v1/auth/usuarios`<br/>2. Body: role_id=9999 (no existe)<br/>3. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 422 Unprocessable Entity</li><li>Error: "El rol seleccionado no existe en el sistema."</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **MEDIA** |

---

##### **TC-AUTH-20: Crear usuario sin permiso — usuario normal rechazado**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-20 |
| **Módulo** | Autenticación |
| **Descripción** | Validar que solo administrador puede crear usuarios |
| **Precondiciones** | <ul><li>Token de usuario con rol: gerencia (NO admin)</li></ul> |
| **Pasos** | 1. POST `/api/v1/auth/usuarios` con token de gerencia<br/>2. Body: datos válidos de nuevo usuario<br/>3. Verificar respuesta |
| **Resultado Esperado** | <ul><li>HTTP 403 Forbidden</li><li>Mensaje: "No tienes permiso para esta acción"</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **ALTA** |
| **Notas** | RFAUT02: control de acceso por rol |

---

#### 📊 **Grupo: Auditoría (Bitácora de Accesos)**

---

##### **TC-AUTH-21: Bitácora registra login exitoso**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-21 |
| **Módulo** | Autenticación |
| **Descripción** | Validar que login exitoso se registra en bitácora |
| **Precondiciones** | <ul><li>Tabla bitacora_accesos vacía o con registros previos</li><li>Usuario: admin@inventario.test</li></ul> |
| **Pasos** | 1. Contar registros en bitacora_accesos: COUNT(*)<br/>2. POST `/api/v1/auth/login` exitoso<br/>3. Contar registros nuevamente<br/>4. SELECT * FROM bitacora_accesos ORDER BY created_at DESC LIMIT 1 |
| **Resultado Esperado** | <ul><li>Nuevo registro insertado</li><li>Campos: user_id=1, accion='login_exitoso', ip_address (IPv4 válida), user_agent (navegador), created_at (timestamp válido)</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **ALTA** |
| **Notas** | RNF-MAN: trazabilidad de accesos |

---

##### **TC-AUTH-22: Bitácora registra login fallido sin usuario identificado**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-22 |
| **Módulo** | Autenticación |
| **Descripción** | Validar que login fallido (email no existe) registra user_id=NULL |
| **Precondiciones** | <ul><li>Email noexiste@test.com no registrado</li></ul> |
| **Pasos** | 1. POST `/api/v1/auth/login` con email inexistente<br/>2. SELECT * FROM bitacora_accesos WHERE accion='login_fallido' ORDER BY created_at DESC LIMIT 1 |
| **Resultado Esperado** | <ul><li>Registro insertado con user_id=NULL</li><li>accion='login_fallido'</li><li>ip_address y user_agent capturados</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **MEDIA** |

---

##### **TC-AUTH-23: Bitácora registra logout**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-AUTH-23 |
| **Módulo** | Autenticación |
| **Descripción** | Validar que logout se registra en bitácora |
| **Precondiciones** | <ul><li>Token válido de usuario autenticado</li></ul> |
| **Pasos** | 1. POST `/api/v1/auth/logout`<br/>2. SELECT * FROM bitacora_accesos WHERE accion='logout' ORDER BY created_at DESC LIMIT 1 |
| **Resultado Esperado** | <ul><li>Registro insertado con accion='logout'</li><li>user_id = id del usuario que hizo logout</li></ul> |
| **Tipo** | Integración |
| **Prioridad** | **MEDIA** |

---

### Módulo: Frontend (Next.js)

---

##### **TC-FRONT-01: Renderizado del formulario de login**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-FRONT-01 |
| **Módulo** | Frontend |
| **Descripción** | Validar que formulario de login se renderiza correctamente |
| **Precondiciones** | Frontend en http://localhost:3000 |
| **Pasos** | 1. Navegar a /login<br/>2. Inspeccionar elementos<br/>3. Verificar presencia de inputs y botón |
| **Resultado Esperado** | <ul><li>Input email visible con label "Correo electrónico"</li><li>Input password visible con label "Contraseña"</li><li>Botón submit visible y clickeable</li><li>Toggle de mostrar/ocultar contraseña funcional</li></ul> |
| **Tipo** | Funcional |
| **Prioridad** | **MEDIA** |

---

##### **TC-FRONT-02: Envío de credenciales y guardado de token**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-FRONT-02 |
| **Módulo** | Frontend |
| **Descripción** | Validar que formulario envía credenciales y guarda token en localStorage |
| **Precondiciones** | <ul><li>Backend en http://localhost:8000</li><li>Usuario: admin@inventario.test / Admin1234!</li></ul> |
| **Pasos** | 1. Llenar email: admin@inventario.test<br/>2. Llenar password: Admin1234!<br/>3. Click en "Iniciar sesión"<br/>4. Inspeccionar localStorage<br/>5. Verificar redirección |
| **Resultado Esperado** | <ul><li>Petición POST a /api/v1/auth/login enviada</li><li>localStorage.token contiene Bearer token</li><li>Redirección a /dashboard</li></ul> |
| **Tipo** | Funcional |
| **Prioridad** | **ALTA** |

---

##### **TC-FRONT-03: Manejo de error de credenciales inválidas**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-FRONT-03 |
| **Módulo** | Frontend |
| **Descripción** | Validar que error del backend se muestra al usuario |
| **Precondiciones** | <ul><li>Email y/o password incorrectos</li></ul> |
| **Pasos** | 1. Llenar email: admin@test.com<br/>2. Llenar password: WrongPassword123!<br/>3. Submit<br/>4. Esperar respuesta del backend |
| **Resultado Esperado** | <ul><li>Mensaje de error visible: "Credenciales incorrectas"</li><li>Token NO guardado en localStorage</li><li>NO redirige a /dashboard</li></ul> |
| **Tipo** | Funcional |
| **Prioridad** | **ALTA** |

---

##### **TC-FRONT-04: Validación frontend — email vacío**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-FRONT-04 |
| **Módulo** | Frontend |
| **Descripción** | Validar validación HTML5 de email requerido |
| **Precondiciones** | Formulario visible |
| **Pasos** | 1. Dejar email vacío<br/>2. Llenar password<br/>3. Intentar submit |
| **Resultado Esperado** | <ul><li>Navegador muestra mensaje de validación nativa o custom</li><li>Petición NO se envía</li></ul> |
| **Tipo** | Funcional |
| **Prioridad** | **BAJA** |

---

##### **TC-FRONT-05: Redireccionamiento automático de / a /login**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-FRONT-05 |
| **Módulo** | Frontend |
| **Descripción** | Validar que página raíz redirige a login |
| **Precondiciones** | Ninguna |
| **Pasos** | 1. Navegar a http://localhost:3000/<br/>2. Verificar redirección |
| **Resultado Esperado** | <ul><li>Redirección automática a /login</li><li>URL final: http://localhost:3000/login</li></ul> |
| **Tipo** | Funcional |
| **Prioridad** | **MEDIA** |

---

### Pruebas No Funcionales

---

##### **TC-PERF-01: Tiempo de respuesta de login < 500ms**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-PERF-01 |
| **Módulo** | Rendimiento |
| **Descripción** | Validar que login responde en menos de 500ms |
| **Precondiciones** | <ul><li>BD en localhost o red local</li><li>Usuario válido</li></ul> |
| **Pasos** | 1. Medir tiempo de POST `/api/v1/auth/login`<br/>2. Repetir 10 veces<br/>3. Calcular promedio |
| **Resultado Esperado** | <ul><li>Promedio de tiempos < 500ms</li><li>P95 < 700ms</li></ul> |
| **Tipo** | No Funcional (Rendimiento) |
| **Prioridad** | **MEDIA** |

---

##### **TC-SEC-01: Contraseña nunca en logs ni respuestas**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-SEC-01 |
| **Módulo** | Seguridad |
| **Descripción** | Validar que contraseña nunca se expone |
| **Precondiciones** | <ul><li>Login exitoso</li><li>Logs habilitados</li></ul> |
| **Pasos** | 1. POST `/api/v1/auth/login` con password: AdminPassword123<br/>2. Revisar respuesta JSON<br/>3. Revisar logs del servidor<br/>4. Revisar NetworkTab del navegador |
| **Resultado Esperado** | <ul><li>Respuesta JSON: NO contiene `password`</li><li>Logs: NO contienen password en plaintext</li><li>Headers enviados: Encriptados (HTTPS en prod)</li></ul> |
| **Tipo** | No Funcional (Seguridad) |
| **Prioridad** | **ALTA** |
| **Notas** | RNFSEC-01 |

---

##### **TC-SEC-02: Bcrypt hash de contraseñas verificable**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-SEC-02 |
| **Módulo** | Seguridad |
| **Descripción** | Validar que contraseñas están hasheadas con bcrypt |
| **Precondiciones** | <ul><li>Usuario creado o migración ejecutada</li></ul> |
| **Pasos** | 1. SELECT password FROM users LIMIT 1<br/>2. Verificar formato bcrypt<br/>3. Intentar desencriptar (debe fallar)<br/>4. Usar Hash::check() en código |
| **Resultado Esperado** | <ul><li>Hash comienza con `$2y$` (bcrypt)</li><li>Longitud > 50 caracteres</li><li>Hash::check('plaintext', hash) retorna true solo con plaintext correcto</li></ul> |
| **Tipo** | No Funcional (Seguridad) |
| **Prioridad** | **ALTA** |

---

##### **TC-SEC-03: RBAC — middleware role rechaza usuarios sin permiso**

| Propiedad | Valor |
|-----------|-------|
| **ID** | TC-SEC-03 |
| **Módulo** | Seguridad |
| **Descripción** | Validar que middleware CheckRole funciona correctamente |
| **Precondiciones** | <ul><li>Rutas protegidas por `middleware('role:administrador')`</li><li>Tokens de usuarios con diferentes roles</li></ul> |
| **Pasos** | 1. POST `/api/v1/auth/usuarios` con token de gerencia<br/>2. Verificar respuesta<br/>3. POST con token de admin<br/>4. Verificar respuesta |
| **Resultado Esperado** | <ul><li>Token gerencia: HTTP 403 Forbidden</li><li>Token admin: HTTP 201 Created (si datos válidos)</li></ul> |
| **Tipo** | No Funcional (Seguridad) |
| **Prioridad** | **ALTA** |
| **Notas** | RFAUT02 |

---

## Métricas de Aceptación

### Cobertura de Código

| Métrica | Objetivo |
|---------|----------|
| Cobertura de líneas (Backend) | ≥ 70% en módulo Auth |
| Cobertura de funciones | ≥ 80% AuthService, UserRepository |
| Métodos no cubiertos | < 5 en módulos críticos |

**Cálculo:**
```bash
# Backend
php artisan test --coverage-html reports/
# Abrir reports/index.html

# Frontend
npm test -- --coverage
```

### Tasa de Éxito de Pruebas

| Categoría | Objetivo |
|-----------|----------|
| Pruebas unitarias | 100% paso |
| Pruebas de integración | ≥ 95% paso |
| Pruebas de E2E | ≥ 90% paso |

### Tiempo de Ejecución

| Suite | Objetivo |
|-------|----------|
| Unitarias (Backend) | < 5 segundos |
| Integración (Backend) | < 30 segundos |
| Unitarias (Frontend) | < 10 segundos |
| Suite completa | < 60 segundos |

### Defectos

| Métrica | Objetivo |
|---------|----------|
| Defectos críticos | 0 antes de release |
| Defectos altos | ≤ 2 antes de release |
| Defectos medios | ≤ 5 antes de release |

---

## Cronograma

### Sprint 1: Semanas 1-2 (10-21 Mayo 2026)

**Objetivo:** Preparar infraestructura de pruebas y validar módulo Auth

| Tarea | Duración | Responsable | Entregable |
|-------|----------|-------------|-----------|
| Configurar PHPUnit + Pest | 1 día | QA | phpunit.xml listo |
| Configurar Jest Frontend | 1 día | QA | jest.config.js listo |
| Crear seeders de prueba | 1 día | Dev | UserSeeder actualizado |
| TC-AUTH-01 a TC-AUTH-09 (Login) | 2 días | QA | 9 tests pasando |
| TC-AUTH-10 a TC-AUTH-14 (Logout/Me) | 1.5 días | QA | 5 tests pasando |
| **SUBTOTAL** | **6.5 días** | - | - |

**Criterio de aceptación:** ≥ 85% de tests pasando

---

### Sprint 2: Semanas 3-4 (24 Mayo - 4 Junio 2026)

**Objetivo:** Completar Auth y validar auditoría

| Tarea | Duración | Responsable | Entregable |
|-------|----------|-------------|-----------|
| TC-AUTH-15 a TC-AUTH-20 (Create User) | 2 días | QA | 6 tests pasando |
| TC-AUTH-21 a TC-AUTH-23 (Bitácora) | 1 día | QA | 3 tests pasando |
| TC-FRONT-01 a TC-FRONT-05 (Frontend) | 1.5 días | QA | 5 tests pasando |
| TC-PERF-01 (Rendimiento) | 0.5 día | QA | Reporte de rendimiento |
| TC-SEC-01 a TC-SEC-03 (Seguridad) | 1 día | QA | 3 tests pasando |
| Generación de reporte de cobertura | 1 día | QA | coverage.html |
| **SUBTOTAL** | **7 días** | - | - |

**Criterio de aceptación:** 100% de tests Auth completados, ≥ 70% cobertura

---

### Sprint 3: Semanas 5-6 (7-18 Junio 2026)

**Objetivo:** Preparación para módulos futuros

| Tarea | Duración | Responsable | Entregable |
|-------|----------|-------------|-----------|
| Refactor de tests (si aplica) | 1 día | QA | Code review completado |
| Documentación de procesos QA | 1 día | QA | Wiki/README QA |
| Configuración de CI/CD (GitHub Actions) | 1.5 días | DevOps | Workflows (.github/workflows/) |
| Capacitación de equipo | 1 día | QA Lead | Sesión de training |
| **SUBTOTAL** | **4.5 días** | - | - |

**Criterio de aceptación:** Infraestructura lista para próximos módulos

---

**Total estimado:** ~18 días de trabajo (equivalente a 3.6 semanas con 5 horas/día de dedicación QA)

---

## Roles y Responsabilidades

### Equipo de QA

| Rol | Responsabilidades | Persona (Sugerida) |
|-----|-------------------|--------------------|
| **QA Lead** | Coordinar plan, reportes, decisiones de release | A definir |
| **QA Engineer (Backend)** | Pruebas API, integración, seguridad | A definir |
| **QA Engineer (Frontend)** | Pruebas UI, E2E, navegadores | A definir |
| **QA Automation** | Configurar PHPUnit, Jest, CI/CD | A definir |

### Equipo de Desarrollo

| Rol | Responsabilidades |
|-----|-------------------|
| **Backend Dev** | Implementación de code según requisitos |
| **Frontend Dev** | Componentes, validación HTML5 |
| **DevOps** | Configuración de entornos y CI/CD |

### Stakeholders

| Rol | Responsabilidades |
|-----|-------------------|
| **Product Owner** | Validación de criterios de aceptación |
| **Project Manager** | Seguimiento de cronograma |

---

## Gestión de Defectos

### Clasificación de Severidad

| Nivel | Descripción | Ejemplo | SLA de Fix |
|-------|-------------|---------|-----------|
| **CRÍTICA** | Bloquea releases, falla de seguridad, pérdida de datos | Login no funciona, SQL injection | 4 horas |
| **ALTA** | Funcionalidad principal afectada, error de negocio | RBAC no funciona, token no se revoca | 24 horas |
| **MEDIA** | Funcionalidad secundaria afectada, UX degradada | Mensaje de error incorrecto, performance < requerida | 48 horas |
| **BAJA** | Cosméticos, sugerencias, no afecta operación | Typo en UI, color incorrecto | 1 semana |

### Ciclo de Vida del Defecto

```
ABIERTO → EN REVISIÓN → EN DESARROLLO → EN PRUEBA → CERRADO
   ↓
RECHAZADO (vuelve a ABIERTO)
```

### Plantilla de Reporte de Defecto

```markdown
## Defecto #[ID]

**Título:** [Descripción breve]
**Severidad:** [CRÍTICA | ALTA | MEDIA | BAJA]
**Módulo:** [Auth | Frontend | Inventario | etc.]
**Reportado por:** [Nombre QA]
**Fecha:** [Fecha]

### Descripción
[Descripción detallada del problema]

### Pasos para reproducir
1. Paso 1
2. Paso 2
3. ...

### Resultado esperado
[Qué debería pasar]

### Resultado actual
[Qué pasó realmente]

### Attachments
- Screenshot / Video
- Logs / Stack trace
- URL / Endpoint afectado

### Ambiente
- SO: [Windows/Mac/Linux]
- Navegador: [Chrome/Firefox/Safari]
- Versión: [v1.0]
```

### Herramientas Recomendadas

- **Reporte:** GitHub Issues + Labels (crítica, alta, media, baja)
- **Tracking:** GitHub Projects (Kanban)
- **Comunicación:** Slack / Discord para alertas
- **Logs:** Laravel Telescope (Backend), DevTools (Frontend)

---

## Apéndice A: Comandos de Ejecución

### Backend (PHPUnit + Pest)

```bash
# Todas las pruebas
php artisan test

# Solo pruebas del módulo Auth
php artisan test --filter=Auth

# Con cobertura
php artisan test --coverage-html

# Prueba específica
php artisan test tests/Feature/Auth/LoginTest.php

# Con output detallado
php artisan test --verbose

# Usando Pest
./vendor/bin/pest
./vendor/bin/pest --filter=login
```

### Frontend (Jest)

```bash
# Todas las pruebas
npm test

# Modo watch (desarrollo)
npm test -- --watch

# Con cobertura
npm test -- --coverage

# Prueba específica
npm test LoginForm.test.tsx

# Snapshot update (si aplica)
npm test -- -u
```

### Postman / Insomnia

```bash
# Importar colección
# 1. Abrir Postman/Insomnia
# 2. File → Import
# 3. Seleccionar auth-collection.json
# 4. Click en "Send" para cada endpoint

# O via CLI (newman)
npm install -g newman
newman run auth-collection.json -e staging-env.json
```

---

## Apéndice B: Matrices de Trazabilidad

### Requisitos vs Casos de Prueba

| Requisito | Descripción | TC Relacionados |
|-----------|-------------|-----------------|
| RFAUT01 | Autenticación con email/password | TC-AUTH-01, TC-AUTH-02, TC-AUTH-03 |
| RFAUT01 | Bloqueo tras 5 intentos fallidos | TC-AUTH-04, TC-AUTH-05 |
| RFAUT02 | RBAC (4 roles) | TC-AUTH-20, TC-SEC-03 |
| RFAUT03 | Revocación de sesión en logout | TC-AUTH-10 |
| RFAUT04 | Usuarios inactivos no pueden login | TC-AUTH-06 |
| RNFSEC-01 | Contraseña hasheada, nunca en plaintext | TC-SEC-01, TC-SEC-02 |
| RNF-MAN | Auditoría con trazabilidad | TC-AUTH-21, TC-AUTH-22, TC-AUTH-23 |
| Tokens | Sanctum con expiración 30 min | TC-AUTH-14 |

---

## Apéndice C: Ambiente de Prueba Automático

### CI/CD Pipeline (GitHub Actions) - RECOMENDADO

**.github/workflows/tests.yml**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: 8.3
      - name: Install dependencies
        run: cd backend && composer install
      - name: Run tests
        run: cd backend && php artisan test --coverage

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: cd frontend && npm install
      - name: Run tests
        run: cd frontend && npm test -- --coverage
```

---

## Apéndice D: Referencia de Requisitos

```
RFAUT01 = Requisito Funcional de Autenticación 1
RFAUT02 = Requisito Funcional de Autenticación 2
RFAUT03 = Requisito Funcional de Autenticación 3
RFAUT04 = Requisito Funcional de Autenticación 4
RNFSEC-01 = Requisito No Funcional de Seguridad 1
RNF-MAN = Requisito No Funcional de Mantenibilidad
```

---

## Historial de Cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-05-10 | Documento inicial — Módulo Auth completo |

---

**Documento preparado por:** Equipo QA / Ingeniero Senior QA  
**Aprobado por:** [A definir]  
**Última actualización:** 2026-05-10

---
