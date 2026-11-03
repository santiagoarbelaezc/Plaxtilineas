# PREGUNTAS_ABIERTAS.md — Plaxtilineas

> Registro de ambigüedades, decisiones arquitectónicas y su resolución final en la migración a Laravel 11.

---

## PA-001: No-enumeración en recuperación de contraseña

- **Contexto:** El PHP legacy devolvía código HTTP 404 si el correo no existía en `/api/auth/recuperar-password`.
- **Decisión:** Se replicó exactamente el comportamiento para garantizar 100% paridad con el cliente Angular existente.
- **Fase:** 4 (Autenticación)
- **Estado:** ✅ Resuelto (Paridad con frontend preservada).

---

## PA-002: Expiración de reservas de stock

- **Contexto:** Tiempo de retención de stock reservado durante el proceso de compra.
- **Decisión:** Confirmado en `PedidoController.php` y `StockReservaService.php`. La reserva temporal expira a los 15 minutos (`now()->addMinutes(15)`). El comando programado `carrito:limpiar-expirados` libera automáticamente el stock retenido una vez cumplido este intervalo.
- **Fase:** 6 (Pedidos y Wompi)
- **Estado:** ✅ Resuelto (15 minutos con liberación programada).

---

## PA-003: Autenticación en `GET /api/pedidos/estado`

- **Contexto:** Verificación de permisos para consultar el estado de un pedido.
- **Decisión:** Confirmado en `PedidoController.php`. La ruta es pública para permitir la consulta por `referencia` o `id` tanto a usuarios invitados como a integraciones externas de confirmación de pago.
- **Fase:** 6 (Pedidos y Wompi)
- **Estado:** ✅ Resuelto (Ruta pública por referencia).

---

## PA-004: Autenticación y permisos en `GET /api/configuraciones`

- **Contexto:** Verificación de visibilidad pública vs administrativa de configuraciones.
- **Decisión:** `GET /api/configuraciones` es público para permitir que la tienda Angular obtenga costos de envío, teléfonos de contacto y parámetros generales. Las operaciones de mutación (`POST /api/configuraciones` y `PUT /api/configuraciones/{clave}`) están estrictamente protegidas bajo middleware `auth:sanctum` con validación de rol `admin`.
- **Fase:** 8 (Configuración)
- **Estado:** ✅ Resuelto (Lectura pública, mutaciones exclusivas de Admin).

---

## PA-005: Catálogo de productos externo y stock local

- **Contexto:** El catálogo completo de productos reside en una API externa (`catalogoplaxtilineas.sembradoresdevida.org`), mientras que los pedidos y carritos requieren control local de inventario y precios.
- **Decisión:** Se implementó el modelo local `Producto` con los campos necesarios para stock pesimista y validación de transacciones: `id, nombre, precio, stock, controlar_stock, imagen_url, activo`. Los controladores no intentan hacer JOINs directos con tablas de categorías del catálogo externo.
- **Fase:** 5 (Carrito) y 8 (Estadísticas y Chat)
- **Estado:** ✅ Resuelto (Modelo local sincronizado).

---

## PA-006: Proveedor y modelo de IA para el Asistente Mateo y Dashboard

- **Contexto:** En el plan preliminar se mencionaba Gemini AI.
- **Decisión:** Al auditar el código fuente legacy (`ChatController.php` y `DashboardAssistantController.php`), se constató que la implementación real utiliza la API de Groq con el modelo `openai/gpt-oss-120b` (o compatible como `llama-3.3-70b-versatile`), usando HTTP client estándar con endpoint OpenAI compatible. Se mantuvo y tipó fielmente esta integración en `GroqService.php`.
- **Fase:** 7 (Chat Mateo y Dashboard Assistant)
- **Estado:** ✅ Resuelto (Groq API en `GroqService`).

---

## PA-007: Formato de código de ticket en PQRS

- **Contexto:** Estructura del código identificador para seguimiento de reclamos.
- **Decisión:** Se confirmó la convención legacy: `'PQR-' . date('ymd') . '-' . str_pad((string)mt_rand(0, 999), 3, '0', STR_PAD_LEFT)`. El identificador interno principal es un UUID v4 (`Str::uuid()`).
- **Fase:** 7 (PQRS)
- **Estado:** ✅ Resuelto (Formato legacy preservado).

---

## PA-008: Compatibilidad de columnas en analítica (`estadisticas_visitas`)

- **Contexto:** Diferencia de nomenclatura histórica entre `(ip_address, pagina_url, session_id)` y `(ip, pagina)`.
- **Decisión:** La migración y el modelo `EstadisticaVisita` soportan ambos nombres de columnas mediante atributos dinámicos y columnas en base de datos con índices para optimizar los conteos de `StatsController`.
- **Fase:** 8 (Analítica)
- **Estado:** ✅ Resuelto (Dual-column compatibility).
