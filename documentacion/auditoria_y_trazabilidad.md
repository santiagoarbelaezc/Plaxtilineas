# Sistema de Auditoría y Trazabilidad de Administradores

Este documento describe la arquitectura, diseño de base de datos, lógica de negocio y componentes frontend del módulo de **Auditoría y Trazabilidad de Administradores** implementado en Plaxtilineas.

---

## 1. Objetivos del Sistema

1. **Control de Sesiones y Permanencia**: Registrar automáticamente cada inicio y cierre de sesión de administradores, midiendo el tiempo exacto que permanecen logueados en el panel de control.
2. **Trazabilidad de Operaciones Críticas**: Dejar constancia inmutable con fecha, hora exacta (`HH:mm:ss`), IP, usuario y snapshots de datos (estado anterior vs. estado nuevo) de acciones administrativas como:
   - Eliminación de cuentas de clientes.
   - Modificación de estado o cancelación de pedidos.
   - Eliminación de pedidos no pagados.
   - Respuesta a tickets de PQRS y cambio de estado de solicitudes.
   - Eliminación de tickets de PQRS.
   - Creación, edición y reordenamiento de componentes dinámicos de la web.
   - Actualización de configuraciones globales del sistema (ej. Pasarela Wompi).
3. **Inspección Visual en el Dashboard**: Proveer al administrador de una vista dedicada con métricas en tiempo real, cronómetro en vivo de la sesión actual, buscador predictivo, filtros por módulo y detalle técnico desplegable.

---

## 2. Modelo de Datos y Migraciones

La migración `2026_11_10_000001_create_admin_auditoria_tables.php` define dos tablas relacionales en la base de datos MySQL:

### Tabla `admin_sesiones`
Almacena cada sesión individual de un administrador:

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `BIGINT UNSIGNED PK AUTO_INCREMENT` | Identificador único de la sesión |
| `admin_id` | `FOREIGN KEY (usuarios.id)` | Administrador titular de la sesión |
| `token_id` | `BIGINT UNSIGNED NULLABLE` | ID del token Sanctum emitido |
| `ip_address` | `VARCHAR(45)` | Dirección IP de conexión (IPv4/IPv6) |
| `user_agent` | `TEXT` | Navegador y sistema operativo |
| `inicio_sesion_at` | `TIMESTAMP` | Fecha y hora exacta de login |
| `ultima_actividad_at` | `TIMESTAMP NULLABLE` | Marca de tiempo de la última petición HTTP |
| `fin_sesion_at` | `TIMESTAMP NULLABLE` | Fecha y hora exacta de logout |
| `duracion_segundos` | `INT UNSIGNED DEFAULT 0` | Duración acumulada en segundos |
| `activa` | `BOOLEAN DEFAULT TRUE` | Indicador de sesión activa en tiempo real |
| `created_at` / `updated_at` | `TIMESTAMP` | Marcas de tiempo de Eloquent |

### Tabla `admin_auditoria_logs`
Almacena el registro cronológico de cada operación ejecutada:

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `BIGINT UNSIGNED PK AUTO_INCREMENT` | Identificador único del evento |
| `sesion_id` | `FOREIGN KEY (admin_sesiones.id) NULLABLE` | Sesión activa en la que ocurrió el evento |
| `admin_id` | `FOREIGN KEY (usuarios.id)` | Administrador que ejecutó la acción |
| `modulo` | `VARCHAR(50)` | Módulo afectado (`AUTH`, `USUARIOS`, `PEDIDOS`, `PQRS`, `COMPONENTES`, `CONFIGURACION`) |
| `accion` | `VARCHAR(80)` | Código de la acción (ej. `ELIMINAR_USUARIO`, `RESPONDER_PQR`, `LOGIN`) |
| `descripcion` | `TEXT` | Descripción legible de la operación |
| `entidad_tipo` | `VARCHAR(60) NULLABLE` | Entidad afectada (`Usuario`, `Pedido`, `Pqr`, etc.) |
| `entidad_id` | `VARCHAR(64) NULLABLE` | Clave primaria o código del recurso afectado |
| `datos_anteriores` | `JSON NULLABLE` | Snapshot previo a la modificación o datos eliminados |
| `datos_nuevos` | `JSON NULLABLE` | Snapshot con los nuevos valores aplicados |
| `ip_address` | `VARCHAR(45)` | IP desde la cual se realizó la petición |
| `created_at` | `TIMESTAMP` | Marca de tiempo inmutable del evento |

---

## 3. Lógica del Backend (Laravel 12)

### A. Servicio `AdminAuditService`
Centraliza la lógica de negocio y evita duplicidad de código:
* **`iniciarSesion(Usuario $admin, ?int $tokenId, ?Request $request)`**: Inicia la sesión al autenticarse en `AuthController::login` y registra el log `LOGIN`.
* **`actualizarActividad(Usuario $admin, ?Request $request)`**: Invocado en cada petición por el middleware `EnsureUserIsAdmin`, actualiza `ultima_actividad_at` y recalcula la duración en segundos.
* **`cerrarSesion(Usuario $admin, ?Request $request)`**: Se activa al llamar a `POST /api/auth/logout`. Marca `activa = false`, registra `fin_sesion_at`, consolida los segundos totales y genera el log `LOGOUT` con la duración formateada.
* **`registrarOperacion(...)`**: Método universal para registrar cualquier cambio administrativo con snapshots `datos_anteriores` y `datos_nuevos`.

### B. Middleware `EnsureUserIsAdmin`
Monitorea todas las rutas agrupadas bajo `prefix('admin')` o con middleware `'admin'`. Si el usuario autenticado es un administrador, actualiza de inmediato su última actividad y la duración de su sesión activa.

### C. Controlador `AdminAuditoriaController`
Expone dos endpoints protegidos para consulta administrativa:
* **`GET /api/admin/auditoria`**: Devuelve métricas globales, tarjetas KPI, la sesión activa actual y el listado de logs paginados con filtros dinámicos (`modulo`, `accion`, `sesion_id`, `fecha_inicio`, `fecha_fin`, `q`).
* **`GET /api/admin/auditoria/sesiones`**: Devuelve el historial de sesiones con desglose de operaciones efectuadas por cada conexión.

---

## 4. Endpoints de la API

| Método | Endpoint | Middleware | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/logout` | `auth:sanctum` | Cierra sesión de admin (calcula tiempo final) y revoca token |
| `GET` | `/api/admin/auditoria` | `auth:sanctum, admin` | Consulta logs de auditoría y estadísticas |
| `GET` | `/api/admin/auditoria/sesiones` | `auth:sanctum, admin` | Consulta histórico de sesiones de administradores |

---

## 5. Implementación en el Frontend (Angular 20)

* **Servicio**: [`frontend/src/app/services/admin-auditoria.service.ts`](file:///c:/Users/Santiago/OneDrive/Escritorio/Repositorios/Plaxtilineas/frontend/src/app/services/admin-auditoria.service.ts)
* **Componente**: [`frontend/src/app/pages/dashboard/auditoria/admin-auditoria.ts`](file:///c:/Users/Santiago/OneDrive/Escritorio/Repositorios/Plaxtilineas/frontend/src/app/pages/dashboard/auditoria/admin-auditoria.ts)
* **Ruta**: `/admin/auditoria` (accesible desde el sidebar lateral del Dashboard).

### Características Visuales:
1. **Cronómetro en Vivo**: Contador visual de la sesión activa que incrementa segundo a segundo mientras el administrador se encuentra navegando.
2. **Tarjetas KPI**:
   - *Sesión Actual*: Tiempo transcurrido con indicador verde animado de conexión.
   - *Operaciones Registradas*: Total acumulado y operaciones realizadas hoy.
   - *Registros Eliminados*: Conteo de bajas críticas (usuarios, pedidos o PQRS).
   - *Total de Sesiones*: Historial acumulado de accesos al panel.
3. **Pestañas de Vista**:
   - **Registro de Operaciones**: Tabla con hora exacta (`HH:mm:ss`), fecha, administrador, badges por módulo, tags de acción y botón *"Detalles"* para ver los datos previos y posteriores en formato clave-valor.
   - **Historial de Sesiones**: Tarjetas y tabla por cada conexión con botón de despliegue para ver la línea de tiempo de operaciones ocurridas en dicha sesión.
4. **Filtros Avanzados**: Búsqueda libre en tiempo real, selector de módulo, filtro por fecha y filtro directo por ID de sesión.

---

## 6. Pruebas Automatizadas

El archivo [`backend-laravel/tests/Feature/Admin/AdminAuditoriaTest.php`](file:///c:/Users/Santiago/OneDrive/Escritorio/Repositorios/Plaxtilineas/backend-laravel/tests/Feature/Admin/AdminAuditoriaTest.php) cubre el 100% de los casos de uso:
* `login de administrador crea sesion activa y registro LOGIN en auditoria`: APROBADO.
* `logout de administrador cierra la sesion, calcula tiempo logueado y registra LOGOUT`: APROBADO.
* `eliminar un usuario como admin registra la operacion en auditoria con hora y datos anteriores`: APROBADO.
* `actualizar estado y eliminar un pedido como admin quedan registrados en auditoria`: APROBADO.
* `responder, cambiar estado y eliminar una PQR como admin quedan registrados en auditoria`: APROBADO.
* `endpoints de consulta de auditoria y sesiones retornan trazabilidad completa y bloquean clientes`: APROBADO.

