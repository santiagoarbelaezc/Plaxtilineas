# DIFERENCIAS.md — PHP vs Laravel

> Diferencias intencionales o descubiertas entre `backend-php` y `backend-laravel`.
> Cada diferencia debe ser aprobada o revertida antes de la Fase 9.

---

## D-001: Formato de error

| | PHP | Laravel |
|---|---|---|
| Clave | `error` | `error` (replicado — NO se cambia) |
| Exito | payload directo | payload directo (replicado) |

**Decision:** Mantener formato PHP exacto para no romper el frontend.

---

## D-002: Autenticacion — Tokens

| | PHP | Laravel |
|---|---|---|
| Mecanismo | HMAC-SHA256 custom (header.payload.signature) | Laravel Sanctum (personal access tokens) |
| Compatibilidad | No compatible | Tokens nuevos |

**Impacto:** Al hacer el cambio a produccion, **todas las sesiones activas se invalidan**.
Los usuarios deben volver a iniciar sesion.
**Accion:** Comunicar el cambio con antelacion. Ventana de bajo trafico.

---

## D-003: Campo de login

| | PHP | Laravel |
|---|---|---|
| Campo | `correo` | `correo` (replicado — NO se cambia a `email`) |

**Decision:** El frontend usa `correo`. Mantener. El modelo Usuario tendra `$primaryKey`, `$fillable` y la logica de autenticacion con `correo`.

---

## D-004: Enumeracion de usuarios en recuperacion de password

| | PHP | Laravel |
|---|---|---|
| Comportamiento | 404 si email no existe | 404 si email no existe (replicado para paridad con frontend) |

**Decisión:** Se mantiene el comportamiento 404 legacy para preservar 100% de compatibilidad con la experiencia y mensajes del cliente Angular. Ver `PREGUNTAS_ABIERTAS.md` #PA-001.

---

## D-005: Tabla `usuarios` vs `users`

| | PHP | Laravel |
|---|---|---|
| Nombre tabla | `usuarios` | `usuarios` (replicado, model con `$table = 'usuarios'`) |

**Decision:** NO renombrar. El modelo Eloquent especifica la tabla manualmente.

---

## D-006: Tareas programadas

| | PHP | Laravel |
|---|---|---|
| Limpieza carritos | En cada request | Comando `carritos:limpiar-expirados` (cron cada hora) |
| Liberacion stock | Verificar PHP | Comando `stock:liberar-expirado` (cada 5-10 min) |
| Limpieza captchas | En cada request de captcha | Comando `captchas:purgar` (cron) |

**Impacto:** La limpieza en Laravel es asincrona (puede haber datos sucios entre ejecuciones de cron). Es preferible.

---

## D-007: Modelo de IA del Chat y Asistente

| | PHP | Laravel |
|---|---|---|
| Proveedor / Modelo | Groq API (`openai/gpt-oss-120b`) | Groq API (`openai/gpt-oss-120b`, configurable via `GROQ_MODEL`) con fallback a WhatsApp |
| Abstracción | Curl directo en controlador | `AiChatClientInterface` inyectado en constructor |

**Estado:** Resuelto con `GroqAiChatService` y fallback idéntico a WhatsApp oficial de Plaxtilineas.

---

## D-008: Rate Limiting & Throttling

| | PHP | Laravel |
|---|---|---|
| Mecanismo | Custom manual en base de datos (`ChatModerationService`) | Laravel RateLimiter integrado (`throttle:auth`, `throttle:chat`, `throttle:wompi-webhook`) + `ChatModerationService` para bans |

---

## D-009: Validación y Respuestas de Error

| | PHP | Laravel |
|---|---|---|
| Validación | `empty()` y `filter_var()` manuales en cada endpoint | `FormRequest` tipados por caso de uso con `failedValidation` personalizado |
| Formato Error | `{ "error": "mensaje" }` | `{ "error": "mensaje" }` idéntico para paridad frontend |

---

## D-010: Concurrencia e Inventario

| | PHP | Laravel |
|---|---|---|
| Control de Stock | Checks manuales en PHP con posible race condition | Bloqueo pesimista `lockForUpdate()` con tabla `stock_reservas` y two-phase commit |
