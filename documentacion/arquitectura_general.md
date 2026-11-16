# Arquitectura General del Sistema Plaxtilineas

Este documento presenta una visión técnica global de la plataforma e-commerce de **Plaxtilineas S.A.S.**, abarcando su infraestructura, stack tecnológico, seguridad y flujos de integración.

---

## 1. Stack Tecnológico

```
┌────────────────────────────────────────────────────────┐
│                      FRONTEND                          │
│     Angular 20 (Standalone Components + Signals)       │
│     TailwindCSS + CSS Modules + FontAwesome            │
└───────────────────────────▲────────────────────────────┘
                            │  HTTPS / REST JSON
                            │  Bearer Tokens (Sanctum)
┌───────────────────────────▼────────────────────────────┐
│                      BACKEND                           │
│     Laravel 12.70 (PHP 8.5)                            │
│     Laravel Sanctum (Autenticación API)                │
│     Pest 3.0 / PHPUnit 11 (Testing Automatizado)       │
└───────────────────────────▲────────────────────────────┘
                            │  PDO Connection
┌───────────────────────────▼────────────────────────────┐
│                   BASE DE DATOS                        │
│     MySQL 8.0 / MariaDB en Hostinger Producción        │
│     SQLite en Memoria para Testing (CI / Pest)         │
└────────────────────────────────────────────────────────┘
```

### Frontend:
* **Framework**: Angular 20 (Standalone Components, Signals, Router standalone, HTTP Client).
* **Diseño Visual**: Estilo oscuro/blanco minimalista (*Bento Grid Design System*), responsive para móviles y desktop.
* **Iconografía**: FontAwesome SVG Core + Material Symbols Rounded.
* **Componentes clave**:
  * Catálogo de productos y variantes técnicas (espumas, plásticos, mallas, empaques).
  * Carrito de compras reactivo y checkout multi-paso.
  * Pasarela de pagos Wompi (Bancolombia, Nequi, Tarjetas, PSE).
  * Portal de Enlaces Rápidos oficiales (`/links`).
  * Panel de Administración (`/admin`): Inventario, Categorías, Pedidos, Usuarios, PQRS, Personalización Web y Auditoría.

### Backend:
* **Framework**: Laravel 12.70.1 sobre PHP 8.5.
* **Autenticación**: Laravel Sanctum mediante tokens de acceso personal con soporte para sesiones web y móviles.
* **Almacenamiento Multimedia**: Integración con Cloudinary API para imágenes de catálogo y adjuntos.
* **Correo Electrónico**: Hostinger Mail API SDK / SMTP para confirmaciones de pedidos, respuestas a PQRS y recuperación de contraseñas.
* **Pruebas Automatizadas**: Suite completa en Pest 3.0 con base de datos en memoria para validación continua.

---

## 2. Estructura de Directorios

```
Plaxtilineas/
├── backend-laravel/               # API REST en Laravel 12
│   ├── app/
│   │   ├── Actions/               # Acciones de dominio atómicas (Pedidos, Carrito, Pagos)
│   │   ├── Http/
│   │   │   ├── Controllers/Api/   # Controladores REST API
│   │   │   └── Middleware/        # Middlewares de seguridad (EnsureUserIsAdmin, etc.)
│   │   ├── Models/                # Modelos Eloquent (Usuario, Pedido, AdminSesion, etc.)
│   │   └── Services/              # Servicios de lógica de negocio (AdminAuditService, etc.)
│   ├── database/migrations/       # Migraciones estructuradas de base de datos
│   ├── routes/api.php             # Definición de rutas públicas y protegidas
│   └── tests/                     # Suite de pruebas Feature y Unit con Pest
├── frontend/                      # Aplicación Angular 20
│   ├── src/app/
│   │   ├── components/            # Componentes reutilizables y vistas del Dashboard
│   │   ├── pages/                 # Páginas de la tienda (Inicio, Catálogo, Links, etc.)
│   │   ├── services/              # Servicios HTTP en Angular (Auth, Pedido, Auditoria, etc.)
│   │   ├── guards/                # Guardias de rutas (AuthGuard)
│   │   └── shared/                # Layouts compartidos (Navbar, Footer, etc.)
├── documentacion/                 # Documentación técnica del sistema
└── README.md                      # Ficha técnica principal del proyecto
```

---

## 3. Seguridad y Control de Acceso

1. **Control de Acceso Basado en Roles (RBAC)**:
   - Rol `cliente`: Acceso a compras, carrito, seguimiento de pedidos propios y radicación de PQRS.
   - Rol `admin`: Acceso completo a inventario, órdenes de todos los clientes, métricas operativas y módulo de auditoría.
2. **Protección de Endpoints**:
   - Middleware `auth:sanctum` valida la autenticidad del token Bearer.
   - Middleware `admin` (`EnsureUserIsAdmin`) restringe el acceso exclusivamente a usuarios con rol administrativo y actualiza su sesión activa.
3. **Módulo de Auditoría**:
   - Registro automático e inmutable de operaciones sensibles (eliminaciones, modificaciones de pedidos, respuestas y configuraciones).



---

## 4. Capa de Dominio y Acciones Atómicas (*Action-Driven Design*)

El backend implementa el patrón Action para desacoplar la orquestación HTTP de las reglas de negocio:

* **`app/Actions/Pedidos/`**:
  * `CrearDraftPedidoAction`: Validación de cupo de órdenes simultáneas, comprobación de stock contra API externa, cálculo de subtotales y creación de reservas transaccionales en MySQL.
  * `ConfirmarPedidoAction`: Validación de transición de estados y despacho de correos de confirmación.
  * `CancelarPedidoAction` y `EliminarPedidoAction`: Liberación de reservas y trazabilidad en logs.
* **`app/Actions/Payments/`**:
  * `CreateCheckoutAction`: Generación de firmas de integridad SHA256 para el widget y API de Wompi.
  * `ProcessWompiEventAction`: Procesamiento idempotente de eventos de webhook con checksum.
* **`app/Actions/Carrito/`**:
  * `SyncCarritoAction`: Sincronización bidireccional reactiva entre el cliente Angular y la base de datos.

---

## 5. Resiliencia, Verificación de Stock y Rate Limiting

Para asegurar la alta disponibilidad de la plataforma en servidores en la nube:

1. **Verificación de Stock Externa**:
   * Mediante `CatalogoApiService`, se realizan validaciones en tiempo real (`/api/productos/verificar-stock`) antes de permitir la entrada a la pasarela de pagos.
2. **Rate Limiters en AppServiceProvider**:
   * Endpoints de API general: 120 peticiones/min.
   * Endpoints de Autenticación (`/login`, `/register`, `/recuperar`): 10 peticiones/min para mitigar ataques de denegación de servicio (DoS) y fuerza bruta.
   * Webhook de Wompi: 60 peticiones/min protegidas por verificación de firma criptográfica.
3. **Manejo Centralizado de Excepciones**:
   * Formato normalizado a través de `App\Support\ApiResponse`, garantizando compatibilidad 100% con los servicios HTTP de Angular.
