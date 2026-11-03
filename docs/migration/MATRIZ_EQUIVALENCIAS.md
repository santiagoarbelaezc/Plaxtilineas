# MATRIZ DE EQUIVALENCIAS: PHP LEGACY VS LARAVEL 11

> Mapeo completo de los 12 controladores legacy (`backend-php/api/controllers/`) a la arquitectura Laravel 11 (`backend-laravel/`).

---

## 1. Resumen de Controladores

| # | Controlador Legacy | Controlador Laravel 11 | Fase | Test Suite | Estado |
|---|---|---|:---:|---|:---:|
| 1 | `AuthController.php` | `App\Http\Controllers\Api\AuthController` | 4 | `tests/Feature/Auth/*` | ✅ 100% |
| 2 | `AdminUserController.php` | `App\Http\Controllers\Api\AdminUserController` | 4 | `tests/Feature/Admin/*` | ✅ 100% |
| 3 | `CarritoController.php` | `App\Http\Controllers\Api\CarritoController` | 5 | `tests/Feature/Carrito/*` | ✅ 100% |
| 4 | `PedidoController.php` | `App\Http\Controllers\Api\PedidoController` | 6 | `tests/Feature/Pedidos/*` | ✅ 100% |
| 5 | `WompiController.php` | `App\Http\Controllers\Api\WompiController` | 6 | `tests/Feature/Wompi/*` | ✅ 100% |
| 6 | `PqrsController.php` | `App\Http\Controllers\Api\PqrsController` | 7 | `tests/Feature/Pqrs/*` | ✅ 100% |
| 7 | `ChatController.php` | `App\Http\Controllers\Api\ChatController` | 7 | `tests/Feature/Chat/ChatTest.php` | ✅ 100% |
| 8 | `DashboardAssistantController.php` | `App\Http\Controllers\Api\DashboardAssistantController` | 7 | `tests/Feature/Chat/DashboardAssistantTest.php` | ✅ 100% |
| 9 | `LeadsController.php` | `App\Http\Controllers\Api\LeadsController` | 7 | `tests/Feature/Leads/*` | ✅ 100% |
| 10 | `ComponentesController.php` | `App\Http\Controllers\Api\ComponentesController` | 8 | `tests/Feature/Componentes/*` | ✅ 100% |
| 11 | `ConfiguracionController.php` | `App\Http\Controllers\Api\ConfiguracionController` | 8 | `tests/Feature/Configuracion/*` | ✅ 100% |
| 12 | `StatsController.php` | `App\Http\Controllers\Api\StatsController` | 8 | `tests/Feature/Stats/*` | ✅ 100% |

---

## 2. Mapeo Detallado de Endpoints

### 🔐 Autenticación & Perfil (`/api/auth/*`)
- `GET /api/auth/captcha` -> `AuthController@captcha` (público)
- `POST /api/auth/login` -> `AuthController@login` (`throttle:auth`)
- `POST /api/auth/register` -> `AuthController@register` (`throttle:auth`)
- `POST /api/auth/google` -> `AuthController@googleLogin` (`throttle:auth`)
- `POST /api/auth/recuperar-password` -> `AuthController@recuperarPassword` (`throttle:auth`)
- `GET /api/auth/verificar-email` -> `AuthController@verificarEmail` (público)
- `POST /api/auth/cambiar-password-temporal` -> `AuthController@cambiarPasswordTemporal` (`auth:sanctum`)
- `GET /api/auth/perfil` -> `AuthController@perfil` (`auth:sanctum`)
- `PUT /api/auth/actualizar` -> `AuthController@actualizar` (`auth:sanctum`)
- `DELETE /api/auth/cuenta` -> `AuthController@cuenta` (`auth:sanctum`)

### 👥 Administración de Usuarios (`/api/admin/*`)
- `GET /api/admin/usuarios-detalle` -> `AdminUserController@obtenerUsuariosDetalle` (`auth:sanctum`, `admin`)
- `DELETE /api/admin/usuarios/{id}` -> `AdminUserController@eliminarUsuario` (`auth:sanctum`, `admin`)

### 🛒 Carrito de Compras (`/api/carrito/*`)
- `POST /api/carrito/sync` -> `CarritoController@sync` (`auth:sanctum`)

### 📦 Pedidos (`/api/pedidos/*` y `/api/admin/pedidos/*`)
- `POST /api/pedidos/draft` -> `PedidoController@crearDraft` (`auth:sanctum`)
- `GET /api/pedidos/mis-pedidos` -> `PedidoController@obtenerMisPedidos` (`auth:sanctum`)
- `GET /api/pedidos/estado` -> `PedidoController@verificarEstado` (`auth:sanctum`)
- `POST /api/pedidos/{id}/cancelar` -> `PedidoController@cancelar` (`auth:sanctum`)
- `DELETE /api/pedidos/{id}` -> `PedidoController@eliminar` (`auth:sanctum`)
- `GET /api/admin/pedidos` -> `PedidoController@adminObtenerTodos` (`auth:sanctum`, `admin`)
- `PUT /api/admin/pedidos/{id}/estado` -> `PedidoController@adminActualizarEstado` (`auth:sanctum`, `admin`)
- *(Compatibilidad)* `GET /api/pedidos/admin/todos` -> `PedidoController@adminObtenerTodos`
- *(Compatibilidad)* `PUT /api/pedidos/admin/actualizar-estado/{id}` -> `PedidoController@adminActualizarEstado`

### 💳 Pasarela Wompi (`/api/wompi/*`)
- `POST /api/wompi/datos-pago` -> `WompiController@datosPago` (`auth:sanctum`)
- `POST /api/wompi/webhook` -> `WompiController@webhook` (`throttle:wompi-webhook`)

### 📩 PQRS (`/api/pqrs/*`)
- `POST /api/pqrs` -> `PqrsController@crearPQR` (público)
- `GET /api/pqrs/consulta/{id}` -> `PqrsController@obtenerPQRPorId` (público)
- `GET /api/pqrs` -> `PqrsController@obtenerPQRS` (`auth:sanctum`, `admin`)
- `GET /api/pqrs/estadisticas` -> `PqrsController@obtenerEstadisticas` (`auth:sanctum`, `admin`)
- `GET /api/pqrs/ultimas` -> `PqrsController@obtenerUltimaPQR` (`auth:sanctum`, `admin`)
- `GET /api/pqrs/buscar` -> `PqrsController@buscarPQRS` (`auth:sanctum`, `admin`)
- `PUT /api/pqrs/{id}/estado` -> `PqrsController@actualizarEstadoPQR` (`auth:sanctum`, `admin`)
- `POST /api/pqrs/{id}/respuestas` -> `PqrsController@agregarRespuesta` (`auth:sanctum`, `admin`)
- `DELETE /api/pqrs/{id}` -> `PqrsController@eliminarPQR` (`auth:sanctum`, `admin`)

### 🤖 Chat Asistente Mateo & Dashboard Assistant
- `POST /api/chat` -> `ChatController@chat` (`throttle:chat`)
- `GET /api/chat/historial` -> `ChatController@historial` (`throttle:chat`)
- `DELETE /api/chat/limpiar` -> `ChatController@limpiar` (`throttle:chat`)
- `POST /api/dashboard-assistant` -> `DashboardAssistantController@chat` (`auth:sanctum`, `admin`)

### 📋 Leads (`/api/leads/*`)
- `POST /api/leads` -> `LeadsController@create` (público)
- `GET /api/leads` -> `LeadsController@getAll` (`auth:sanctum`, `admin`)
- `GET /api/leads/stats` -> `LeadsController@getStats` (`auth:sanctum`, `admin`)

### 🎨 Componentes Dinámicos (`/api/componentes/*`)
- `GET /api/componentes` -> `ComponentesController@index` (público)
- `POST /api/componentes/upload` -> `ComponentesController@uploadImage` (`auth:sanctum`, `admin`)
- `PUT /api/componentes/reordenar` -> `ComponentesController@reordenar` (`auth:sanctum`, `admin`)
- `POST /api/componentes` -> `ComponentesController@create` (`auth:sanctum`, `admin`)
- `PUT /api/componentes/{id}` -> `ComponentesController@update` (`auth:sanctum`, `admin`)
- `DELETE /api/componentes/{id}` -> `ComponentesController@delete` (`auth:sanctum`, `admin`)

### ⚙️ Configuraciones de Tienda (`/api/configuraciones/*`)
- `GET /api/configuraciones` -> `ConfiguracionController@getAll` (público)
- `PUT /api/configuraciones/{clave}` -> `ConfiguracionController@update` (`auth:sanctum`, `admin`)

### 📊 Métricas & Analítica (`/api/stats/*`)
- `POST /api/stats/track` -> `StatsController@track` (público)
- `GET /api/stats/dashboard` -> `StatsController@getDashboardStats` (`auth:sanctum`, `admin`)
