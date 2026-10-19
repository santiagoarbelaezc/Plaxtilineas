# REGLAS_NEGOCIO.md — Plaxtilineas

> Extraidas del codigo PHP real. Fuente de verdad para la migracion Laravel.

---

## Precios y Totales

- **Costo de envio:** `$10,000 COP` fijo (`COSTO_ENVIO_COP = 10000`). Sin excepciones, sin rangos.
- **IVA:** `0%` (`IVA_PORCENTAJE = 0.0`). El IVA ya esta incluido en el precio del producto.
- **Moneda Wompi:** `COP` siempre.
- **Monto en centavos Wompi:** `total_cop * 100` (entero largo, BIGINT).
- **Calculo de total:** `subtotal + iva + costo_envio` donde `iva = subtotal * 0.0 = 0`.
- **Precision:** columnas DECIMAL(12,2). Calculos con enteros (centavos) para Wompi.

---

## Estados de Pedido (Transiciones)

```
draft -> pendiente_pago -> pagado -> pendiente -> confirmado -> en_preparacion -> en_camino -> entregado
                                  \-> cancelado (desde draft, pendiente_pago, pagado, pendiente, confirmado)
```

- **No se puede cancelar** un pedido en estado `entregado`.
- **No se puede cancelar** un pedido en estado `en_camino` o `en_preparacion` (verificar PHP exacto).
- Al cancelar: liberar `stock_reservas` del pedido.
- Al pagar (webhook Wompi APPROVED): cambiar estado a `pagado`, registrar `wompi_transaction_id`, `wompi_pagado_at`.
- Al actualizar estado (admin): disparar email al cliente.

---

## Captcha

- **Duracion:** 5 minutos (`expires_at = NOW() + 300s`)
- **Uso unico:** se elimina de la BD al intentar verificarlo (incluso si falla la verificacion del codigo)
- **Case-insensitive:** el texto se normaliza con `strtolower(trim())` antes de verificar bcrypt
- **Caracteres:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin I, O, 0, 1 para evitar confusion)
- **Longitud:** 5 caracteres

---

## Verificacion de Email

- **Codigo:** 6 digitos numericos (`rand(100000, 999999)`)
- **Duracion:** 24 horas (`token_expira_en = NOW() + 24h`)
- **Uso unico:** `token_verificacion = NULL` tras verificacion exitosa
- **Login bloqueado** si `email_verificado = 0 AND google_id IS NULL`
- Usuarios de Google siempre tienen `email_verificado = 1`

---

## Recuperacion de Password

- **Formato:** `Plx-` + 5 caracteres aleatorios (letras y numeros, sin ambiguos)
- Tras generar: `password = bcrypt(tempPassword)`, `requiere_cambio_password = 1`
- Tras cambiar password exitosamente: `requiere_cambio_password = 0`
- El endpoint PHP **no** implementa no-enumeracion (revela 404 si email no existe)

---

## Stock y Reservas

- Al crear `pedido/draft`: crear registros en `stock_reservas` con `expira_at = NOW() + 15 min` (verificar PHP)
- Al pagar: consolidar stock (decrementar en catalogo externo o marcar reservas como consolidadas)
- Al cancelar pedido: eliminar `stock_reservas` del pedido
- **Comando programado:** `stock:liberar-expirado` — elimina reservas donde `expira_at < NOW()`
  - Frecuencia: cada 5-10 minutos
- **Sobreventa:** usar `lockForUpdate` en transaccion DB al crear draft

---

## Carritos

- **Expiracion:** carritos sin actualizar por >24h se consideran expirados
- **Comando programado:** `carritos:limpiar-expirados` — cada hora
- **Sync:** reemplaza el carrito completo del usuario (DELETE todos los del usuario + INSERT nuevos)
- Aislamiento: cada usuario solo ve/modifica su propio carrito

---

## Wompi — Firma de Integridad

```
firma = SHA256(referencia + monto_centavos + "COP" + WOMPI_INTEGRITY_KEY)
```
- `referencia`: codigo unico del pedido (ej: `PLX-1234567890`)
- `monto_centavos`: total en centavos (BIGINT)

---

## Wompi — Firma de Evento (Webhook)

```
checksum = SHA256(evento.data.transaction.id + evento.data.transaction.status +
                  evento.data.transaction.amount_in_cents + evento.timestamp + WOMPI_EVENTS_KEY)
```
- Comparar con `evento.signature.checksum` usando `hash_equals` (timing-safe)
- Si firma invalida: responder 200 pero NO procesar (log de intento)
- **Idempotencia:** verificar `wompi_evento_id` antes de procesar; si ya existe, retornar 200 sin cambios

---

## Moderacion de Chat

- **Niveles:** 1=advertencia, 2=bloqueo, 3=ban
- **Ban de IP/sesion:** registro en `chat_session_bans` con `banned_until`
- **Reincidencia:** N violaciones -> ban temporal
- Tipos de deteccion: `profanity | jailbreak | spam | injection`
- Chat historial: por `session_id` (UUID del cliente)

---

## PQRS — Codigo Unico

- Formato a verificar en `PqrsController.php` (ej: `PQR-YYYYMMDD-NNNN`)
- Estados: `pendiente | en_proceso | resuelto | cerrado`
- Al crear: enviar email al cliente con numero de ticket
- Al responder: enviar email al cliente con respuesta

---

## Rate Limiting (a implementar en Laravel)

| Endpoint | Limite sugerido |
|---|---|
| `POST /api/auth/login` | 10/min por IP |
| `POST /api/auth/register` | 5/min por IP |
| `POST /api/chat` | 20/min por IP |
| `POST /api/pqrs` | 3/min por IP |
| `POST /api/leads` | 5/min por IP |
| `POST /api/stats/track` | 30/min por IP |

---

## Roles

| Valor | Descripcion |
|---|---|
| `cliente` | Usuario normal registrado |
| `admin` | Administrador del sistema |

- Rutas admin verifican `rol = 'admin'` en el token/sesion
- El campo en la tabla es `rol` (VARCHAR o ENUM)

---

## Cloudinary — Firma de Upload

```
signature = SHA1(params_ordenados + API_SECRET)
```
- Subida directa via HTTP a `https://api.cloudinary.com/v1_1/{cloud}/image/upload`
- Tipos permitidos: image/* (verificar PHP para MIME types exactos)
- Tamano maximo: 5 MB (`UPLOAD_MAX_SIZE = 5242880`)

---

## CORS

Origenes permitidos:
- `https://plaxtilineas.com`
- `https://www.plaxtilineas.com`
- `http://localhost:4200`
- `http://127.0.0.1:4200`
- Variable `FRONTEND_URL` del .env (si es diferente)

Headers: `Content-Type, Authorization`
Metodos: `GET, POST, PUT, DELETE, OPTIONS`
Credentials: `true`
