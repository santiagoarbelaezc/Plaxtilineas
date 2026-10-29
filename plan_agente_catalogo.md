# Plan para el agente de `catalogoplaxtilineas.com`: notificar productos nuevos a Plaxtilíneas

## Objetivo
Cuando se **cree un producto de la marca Plaxtilíneas** en el catálogo, enviar una llamada HTTP firmada al backend de Plaxtilíneas. El backend se encarga de enviar el correo a los clientes. El catálogo solo notifica.

## Contrato del endpoint (ya implementado y en producción de BD)

`POST {BACKEND_URL}/api/notificaciones/producto-nuevo`

| Header | Valor |
|---|---|
| `Content-Type` | `application/json` |
| `Accept` | `application/json` |
| `X-Catalogo-Timestamp` | Hora actual en **segundos** (epoch). Se rechaza si difiere más de 5 min. |
| `X-Catalogo-Signature` | `hex(HMAC_SHA256(timestamp + "." + CUERPO_CRUDO, CATALOGO_WEBHOOK_SECRET))` |

> [!IMPORTANT]
> La firma se calcula sobre **exactamente los mismos bytes** que se envían como body. Serializa el JSON **una sola vez**, firma ese string y envía ese mismo string. No lo re-serialices después.

Body:
```json
{
  "producto": {
    "id": 245,
    "nombre": "Malla Pajarito Metálica",
    "descripcion": "Texto corto opcional (máx. 500)",
    "imagen_url": "https://res.cloudinary.com/.../malla.png",
    "precio": 16500,
    "unidad": "und",
    "categoria": "Mallas"
  }
}
```
Reglas: `id` (entero ≥ 1) y `nombre` (≤ 255) son obligatorios; `imagen_url` debe ser **https**; el resto es opcional. Cualquier otro campo se ignora.

| Respuesta | Significado | Qué hacer |
|---|---|---|
| `202` | Aceptado, envío en cola | OK |
| `200` + `duplicada: true` | Ese `producto.id` ya se notificó | OK, no reintentar |
| `401` | Firma o timestamp inválido | Revisar secreto, reloj del servidor y que se firme el body exacto |
| `422` | Payload inválido | Corregir datos; no reintentar igual |
| `429` | Límite (30/min por IP) | Reintentar con espera |
| `503` | Backend sin secreto configurado | Avisar al equipo del backend |
| `5xx` / timeout | Error temporal | Reintentar (ver abajo) |

## Pasos de implementación

1. **Variables de entorno** del proyecto catálogo (nunca en el frontend ni en el repositorio):
   - `PLAXTILINEAS_BACKEND_URL` = URL base del backend de Plaxtilíneas, sin barra final (ej. `https://<dominio-backend>`).
   - `PLAXTILINEAS_WEBHOOK_SECRET` = el mismo valor de `CATALOGO_WEBHOOK_SECRET` del backend. *(Se entrega por separado, no está en este documento.)*
   - `PLAXTILINEAS_NOTIFY_ENABLED` = `true`/`false` (interruptor de apagado).
2. **Crear un servicio `NotificadorPlaxtilineas`** (una sola clase/función) que:
   - Arme el payload a partir del producto recién creado, mapeando: `id`, `nombre`, `descripcion` (recortada a 500), `imagen_url` (https), `precio` (de la variante principal o la de menor precio), `unidad`, `categoria`.
   - Serialice el JSON una sola vez, calcule `timestamp` y firma HMAC-SHA256, y haga el POST con timeout de 10 s.
3. **Enganchar el servicio en el punto exacto donde se crea el producto**, **después** de confirmar el guardado en BD, y solo si:
   - la marca del producto es **Plaxtilíneas** (usar el mismo criterio que ya filtra `CATALOGO_MARCA`),
   - el producto está **activo/visible** y tiene imagen,
   - `PLAXTILINEAS_NOTIFY_ENABLED=true`.
4. **No bloquear ni romper la creación del producto.** La llamada debe ir en segundo plano (cola/job o `try/catch` que solo registre el error). Si falla, el producto se crea igual.
5. **Reintentos:** hasta 3 intentos con espera creciente (ej. 1 min, 5 min) solo para timeout, `429` y `5xx`. En cada reintento **recalcular timestamp y firma**. No reintentar `401`, `422` ni `200 duplicada`.
6. **Registro:** log con `producto_id`, status HTTP y número de intento. No loguear el secreto ni la firma.
7. **Solo productos nuevos.** No disparar al editar un producto ni en importaciones masivas/sincronizaciones (evita enviar correos por productos antiguos). Si hay carga masiva, apagar `PLAXTILINEAS_NOTIFY_ENABLED` durante la carga.

## Ejemplos de firma

**PHP**
```php
$producto = [/* id, nombre, descripcion, imagen_url, precio, unidad, categoria */];
$body = json_encode(['producto' => $producto], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$ts = (string) time();
$firma = hash_hmac('sha256', $ts . '.' . $body, getenv('PLAXTILINEAS_WEBHOOK_SECRET'));

$ch = curl_init(rtrim(getenv('PLAXTILINEAS_BACKEND_URL'), '/') . '/api/notificaciones/producto-nuevo');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $body,            // el MISMO string firmado
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'X-Catalogo-Timestamp: ' . $ts,
        'X-Catalogo-Signature: ' . $firma,
    ],
]);
$respuesta = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
```

**Node.js**
```js
import crypto from 'node:crypto';

const body = JSON.stringify({ producto });                 // serializar UNA vez
const ts = Math.floor(Date.now() / 1000).toString();
const firma = crypto.createHmac('sha256', process.env.PLAXTILINEAS_WEBHOOK_SECRET)
  .update(`${ts}.${body}`).digest('hex');

const res = await fetch(`${process.env.PLAXTILINEAS_BACKEND_URL}/api/notificaciones/producto-nuevo`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Catalogo-Timestamp': ts,
    'X-Catalogo-Signature': firma,
  },
  body,                                                    // el MISMO string firmado
  signal: AbortSignal.timeout(10000),
});
```

## Verificación
1. **Firma:** con `PLAXTILINEAS_NOTIFY_ENABLED=true` y un producto de prueba, el POST debe responder `202`. Reenviar el mismo `producto.id` debe responder `200` con `duplicada: true`.
2. **Seguridad:** alterar un byte del body o usar un timestamp viejo debe dar `401`.
3. **Resiliencia:** apuntar temporalmente a una URL inválida; el producto debe crearse igual y el error quedar en log.
4. **Prueba controlada:** usar un `producto.id` de prueba que no exista en el catálogo real (ej. `999001`). Avisar al equipo del backend para confirmar que llegó el correo a un cliente de prueba antes de activar en producción.
5. **No disparar** al editar productos ni en cargas masivas.

## Criterios de aceptación
- Al crear un producto de Plaxtilíneas se envía exactamente **una** notificación.
- Un fallo de red o del backend **nunca** impide crear el producto.
- El secreto solo vive en variables de entorno del servidor.
- Existe interruptor para apagar el envío sin desplegar.
