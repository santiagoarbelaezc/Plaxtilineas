# Reporte de Arquitectura Técnica de Backend — Plaxtilineas S.A.S.

**Fecha de emisión:** 15 de Noviembre de 2026  
**Proyecto:** Plataforma de Comercio Electrónico y Gestión Operativa Plaxtilineas  
**Entorno de referencia:** Laravel 12.70.1 (PHP 8.5) / Angular 20.3  
**Autores:** Equipo de Arquitectura & Desarrollo de Software Plaxtilineas  

---

## 1. Resumen Ejecutivo y Propósito del Sistema

Plaxtilineas S.A.S. es una empresa líder en el Eje Cafetero especializada en la distribución y comercialización de plásticos técnicos, espumas industriales, mallas de protección agroindustrial y sistemas de embalaje. Su plataforma digital integra dos ecosistemas complementarios:
1. **Tienda Online B2B/B2C**: Catálogo interactivo con variantes dimensionales, carrito reactivo sincronizado, pasarela de pagos integrada y gestión de PQRS.
2. **Panel de Control Operativo (`/admin`)**: Módulo de inventario, auditoría forense en tiempo real, gestión de pedidos, administración de accesos y personalización visual.

Para soportar las exigencias transaccionales, de alta disponibilidad y de integridad financiera de la empresa, el backend no se estructuró bajo el patrón MVC tradicional plano, sino mediante un **Monolito Modular en Capas orientado a Acciones (*Action-Driven Layered Architecture*)** bajo el principio **API-First**.

---

## 2. Patrón de Dominio: Acciones Atómicas (*Action Pattern*)

Uno de los principales problemas del patrón MVC clásico en proyectos de comercio electrónico es el fenómeno de los *Fat Controllers* (controladores sobrecargados con lógica de negocio, validaciones y acceso a datos). En Plaxtilineas, cada caso de uso crítico está encapsulado en una clase atómica `final` bajo el namespace `App\Actions\`.

### Características del Patrón de Acciones en Plaxtilineas:
- **Responsabilidad Única (SRP)**: Cada acción representa un único verbo de negocio (`CrearDraftPedidoAction`, `ConfirmarPedidoAction`, `CancelarPedidoAction`, `ProcessWompiEventAction`, `SyncCarritoAction`).
- **Punto de Entrada Unificado**: Exponen un método público fuertemente tipado `execute()` que recibe entidades del modelo o DTOs.
- **Inmutabilidad y Seguridad Transaccional**: Toda acción que modifique el estado contable, pedidos o stock se envuelve en `DB::transaction()` garantizando atomicidad (ACID).
- **Reutilización Cruzada**: La misma acción puede invocarse sin duplicación de código desde:
  - Un controlador HTTP (`PedidoController`).
  - Un Job en segundo plano (`ReconcilePendingPaymentsJob`).
  - Un comando programado de consola de Artisan (`LiberarReservasExpiradasCommand`).

---

## 3. Inversión de Dependencias y Capa de Contratos (*Contracts & Adapters*)

Para evitar acoplamiento directo a proveedores externos de infraestructura, el sistema implementa el **Principio de Inversión de Dependencias (DIP)** mediante interfaces ubicadas en `App\Contracts\`.

### Mapeo de Abstracciones e Implementaciones:
1. **Pasarela de Pagos**: `WompiClientInterface` implementada por `WompiService`.
2. **Almacenamiento Multimedia**: `MediaStorageInterface` implementada por `CloudinaryStorageService`.
3. **Asistente Virtual IA**: `AiChatClientInterface` implementada por `GroqAiChatService`.
4. **Autenticación Federada**: `GoogleAuthClientInterface` implementada por `GoogleAuthService`.
5. **Transporte de Correos Transaccionales**: `HostingerMailTransport` integrado dinámicamente sobre el `MailManager` de Laravel en `AppServiceProvider`.

```
┌─────────────────────────────────┐
│     Controladores y Acciones    │
└────────────────┬────────────────┘
                 │ depende de
┌────────────────▼────────────────┐
│   App\Contracts\*Interface      │  <-- Inversión de Dependencias (IoC)
└────────────────▲────────────────┘
                 │ implementado por
┌────────────────┴────────────────┐
│     App\Services\*Service       │  <-- Wompi, Cloudinary, Groq, Hostinger
└─────────────────────────────────┘
```

Esta arquitectura permite que las pruebas automatizadas con Pest y PHPUnit se ejecuten en milisegundos mediante *mocks* o *fakes* sin realizar llamadas reales a APIs de pago o almacenamiento.

---

## 4. Arquitectura de Seguridad, Middleware Pipeline y RBAC

La seguridad perimetral y el control de accesos se gestionan mediante una cadena de responsabilidad (*Chain of Responsibility*) configurada a nivel de middleware en `bootstrap/app.php`:

### Pipeline de Middlewares:
- **`AssignRequestId`**: Inyecta un identificador UUID único a cada request entrante (`X-Request-ID`) tanto en el contexto de logging como en las cabeceras de respuesta HTTP, permitiendo trazabilidad forense de extremo a extremo.
- **`auth:sanctum`**: Valida tokens personales Bearer para usuarios y administradores, usando el modelo extendido `PersonalAccessToken`.
- **`admin` (`EnsureUserIsAdmin`)**: Aplica Control de Acceso Basado en Roles (RBAC), comprobando que el usuario autenticado posea el rol `admin` (`RolUsuario::ADMIN`). Adicionalmente, actúa como latido (*heartbeat*) actualizando `ultima_actividad` en `AdminSesion`.
- **`catalogo.firma` (`VerificarFirmaCatalogo`)**: Valida la integridad de peticiones del catálogo externo mediante firmas criptográficas HMAC SHA256.
- **Rate Limiters Diferenciados**:
  - `api`: 120 peticiones/min por IP.
  - `auth`: 10 peticiones/min para mitigación de ataques de fuerza bruta.
  - `chat`: 30 peticiones/min por Session ID/IP.
  - `wompi-webhook`: 60 peticiones/min protegidas por checksum.
