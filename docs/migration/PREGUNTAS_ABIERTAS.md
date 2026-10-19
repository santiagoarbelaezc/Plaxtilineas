# PREGUNTAS_ABIERTAS.md — Plaxtilineas

> Ambiguedades o decisiones pendientes durante la migracion.
> Cada pregunta debe ser respondida antes de cerrar la fase correspondiente.

---

## PA-001: No-enumeracion en recuperacion de password

**Contexto:** El PHP actual devuelve 404 si el email no existe en `/api/auth/recuperar-password`.
Esto permite a un atacante enumerar emails validos.

**Decision:** Se replica el comportamiento exacto del PHP (404 si no existe) para garantizar paridad con el frontend Angular.

**Fase:** 4 (Autenticacion)
**Estado:** Resuelto (Paridad PHP)

---

## PA-002: Expiracion de reservas de stock

**Contexto:** El PHP tiene logica de reservas de stock pero no es claro el tiempo de expiracion exacto.

**Pregunta:** Cual es el tiempo de expiracion de `stock_reservas.expira_at`?

**Accion:** Leer `PedidoController.php` para confirmar el valor exacto (probablemente 15 o 30 minutos).

**Fase:** 6 (Pedidos)
**Estado:** Pendiente — leer `PedidoController.php`

---

## PA-003: Autenticacion en `GET /api/pedidos/estado`

**Contexto:** El plan indica "Auth: Sí/Pública (verificar en PHP)" para este endpoint.

**Pregunta:** ¿El endpoint es público (sin token) o requiere autenticación?

**Accion:** Leer `PedidoController.php` para confirmar.

**Fase:** 6 (Pedidos)
**Estado:** Pendiente — leer `PedidoController.php`

---

## PA-004: Autenticacion en `GET /api/configuraciones`

**Contexto:** El plan indica "Auth: Pública/Admin (verificar)".

**Pregunta:** ¿Todas las configuraciones son publicas o solo algunas?

**Accion:** Leer `ConfiguracionController.php` para confirmar.

**Fase:** 8 (Configuracion)
**Estado:** Pendiente — leer `ConfiguracionController.php`

---

## PA-005: Tabla `productos` y catalogo externo

**Contexto:** El schema SQL tiene FKs a `productos` en `carritos` y `pedido_items`, pero `productos` no esta en `schema_completo.sql`.

**Decision:** El usuario instruyó utilizar SQLite y no conectarse a la BD remota real. Se modela `productos` localmente en SQLite con los campos identificados en `PedidoController` y `CarritoController`: `(id, nombre, precio, stock, controlar_stock, imagen_url, activo, created_at, updated_at)`.

**Fase:** 5 (Carrito)
**Estado:** Resuelto (Tabla local en SQLite)

---

## PA-006: Modelo Gemini del Chat

**Contexto:** No se ha leido aun `ChatController.php` para confirmar el modelo de Gemini usado.

**Pregunta:** ¿Cual es el modelo exacto de Gemini (gemini-pro, gemini-1.5-flash, etc.)?

**Accion:** Leer `ChatController.php`.

**Fase:** 7 (Chat)
**Estado:** Pendiente

---

## PA-007: Pqrs — formato del codigo de ticket

**Contexto:** Formato del código de ticket de PQRS verificado en `PqrsController.php`.

**Decision:** Formato verificado: `'PQR-' . date('ymd') . '-' . str_pad((string)mt_rand(0, 999), 3, '0', STR_PAD_LEFT)`. ID de PQR es UUID v4.

**Fase:** 7 (PQRS)
**Estado:** Resuelto (Confirmado en PqrsController.php)
