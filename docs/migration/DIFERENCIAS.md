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
| Comportamiento | 404 si email no existe | Pendiente decision |

**Riesgo:** El PHP actual permite enumerar emails validos.
**Opciones:**
- A) Replicar comportamiento PHP (misma respuesta 200 independientemente)
- B) Cambiar a no-enumeracion (misma respuesta para existente/inexistente)

**PREGUNTA ABIERTA:** Ver PREGUNTAS_ABIERTAS.md #PA-001

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

## D-007: Gemini — Modelo de IA del Chat

| | PHP | Laravel |
|---|---|---|
| Modelo | Verificar `ChatController.php` | `gemini-1.5-flash` (configurable via `GEMINI_MODEL`) |

**Pendiente:** Leer `ChatController.php` para confirmar el modelo exacto.
