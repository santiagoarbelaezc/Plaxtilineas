# Implementación segura de la pasarela de pagos Wompi

Guía para integrar Wompi (Colombia) en un comercio, con foco en seguridad. Basada en la documentación oficial: <https://docs.wompi.co/>

---

## 1. Visión general

Flujo recomendado de extremo a extremo:

```
Cliente → Tu backend (crea orden, referencia, firma de integridad)
        → Tu frontend (Widget / Web Checkout con los datos firmados)
        → Wompi procesa el pago
        → Wompi envía un EVENTO (webhook) a tu backend   ← fuente de verdad
        → Tu backend valida firma, verifica con la API y actualiza la orden
        → Wompi redirige al cliente a tu redirect-url      ← solo informativo
```

**Regla de oro:** el estado final de un pago se confirma **únicamente en tu servidor**, mediante el webhook (y opcionalmente consultando la API). Nunca por la redirección ni por lo que reporte el navegador.

---

## 2. Llaves y secretos

Wompi maneja varias credenciales distintas. No las confundas:

| Credencial | Prefijo ejemplo | Dónde se usa | ¿Puede ir en el frontend? |
|---|---|---|---|
| Llave pública | `pub_test_` / `pub_prod_` | Identifica al comercio en Widget/Checkout | Sí |
| Llave privada | `prv_test_` / `prv_prod_` | Llamadas a la API (ej. crear links de pago) vía `Authorization: Bearer` | **No** |
| Secreto de integridad | `test_integrity_` / `prod_integrity_` | Generar la firma de integridad de cada transacción | **No** |
| Secreto de eventos | `test_events_` / `prod_events_` | Validar el checksum de los webhooks | **No** |

Los secretos de integridad y de eventos se obtienen en el Dashboard de Comercios: **Desarrolladores > Secretos para integración técnica**.

### Buenas prácticas

- Guarda llaves y secretos en **variables de entorno** o un gestor de secretos (AWS Secrets Manager, GCP Secret Manager, Vault, etc.). Nunca en el repositorio, ni en el código del frontend, ni en logs.
- Usa llaves de **Sandbox** (`*_test_*`) para desarrollo y de **Producción** (`*_prod_*`) solo en producción. Nunca mezcles ambientes.
- Rota los secretos si sospechas una filtración.
- Limita quién del equipo puede ver los secretos (usa roles y usuarios del dashboard con el mínimo permiso necesario).
- Usa **HTTPS** en todo tu sitio y en tu URL de eventos.

---

## 3. Referencia única de pago

Cada compra debe tener una **referencia única** (similar a un número de factura).

- Alfanumérica, puede incluir guiones (`-`) y guiones bajos (`_`).
- **No la reutilices**: una vez completada una transacción con una referencia, no se debe volver a usar.
- Genérala en tu backend y guárdala asociada a la orden (con monto y moneda) **antes** de abrir el checkout.

Ejemplos válidos: `3b4393bafed398ba2`, `58e281-177ab976cbf9-d162d2`, `38932_3293298`.

---

## 4. Firma de integridad (obligatoria)

Protege que el monto, la moneda y la referencia no sean alterados en el navegador.

### Cadena a firmar (el orden importa)

Sin fecha de expiración:

```
<Referencia><MontoEnCentavos><Moneda><SecretoIntegridad>
```

Con `expiration-time`:

```
<Referencia><MontoEnCentavos><Moneda><FechaExpiracion><SecretoIntegridad>
```

Ejemplo:

```
sk8-438k4-xmxm392-sn2m2490000COPprod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6
```

Luego se aplica **SHA256** y se envía el resultado hexadecimal en `signature:integrity` (Web Checkout / Widget con atributos) o `signature: { integrity }` (Widget con JS).

### Reglas de seguridad

- **Genera la firma siempre en tu servidor.** Hacerlo en el frontend expone el secreto de integridad.
- **El monto sale de tu base de datos**, nunca de un parámetro enviado por el cliente. Si el cliente puede decidir el monto, podrá pagar menos.
- El monto va **en centavos** (ej. $95.000 COP → `9500000`). Moneda: `COP`.
- Si usas `expiration-time`, usa formato ISO 8601 UTC (ej. `2023-06-09T20:28:50.000Z`) y el **mismo valor** en la firma y en el checkout.

### Ejemplo (Node.js)

```js
const crypto = require("crypto");

function integritySignature({ reference, amountInCents, currency = "COP", expirationTime }) {
  const secret = process.env.WOMPI_INTEGRITY_SECRET;
  const str =
    `${reference}${amountInCents}${currency}` +
    (expirationTime ? expirationTime : "") +
    secret;
  return crypto.createHash("sha256").update(str).digest("hex");
}
```

Ejemplo (PHP): `hash("sha256", $cadenaConcatenada);`
Ejemplo (Python): `hashlib.sha256(cadena.encode()).hexdigest()`

---

## 5. Integración del checkout

Hay dos métodos. Ambos requieren los parámetros obligatorios: `public-key`, `currency`, `amount-in-cents`, `reference` y `signature:integrity`.

### 5.1 Widget (el cliente no sale de tu sitio)

```html
<form>
  <script
    src="https://checkout.wompi.co/widget.js"
    data-render="button"
    data-public-key="pub_prod_XXXXXXXX"
    data-currency="COP"
    data-amount-in-cents="4950000"
    data-reference="ORDEN-12345"
    data-signature:integrity="<FIRMA_GENERADA_EN_TU_SERVIDOR>"
    data-redirect-url="https://mitienda.com.co/pagos/respuesta"
  ></script>
</form>
```

Notas:

- Parámetros con prefijo `data-` y guiones (`-`), no guiones bajos.
- Para `shipping-address`, `customer-data` y `tax-in-cents` se usan dos puntos (`:`), por ejemplo `data-customer-data:email`.

Alternativa con JavaScript (botón personalizado):

```js
const checkout = new WidgetCheckout({
  currency: "COP",
  amountInCents: 2490000,
  reference: "AD002901221",
  publicKey: "pub_prod_XXXXXXXX",
  signature: { integrity: "<FIRMA_DEL_SERVIDOR>" },
  redirectUrl: "https://mitienda.com.co/pagos/respuesta",
});

checkout.open(function (result) {
  const transaction = result.transaction;
  // Solo informativo: NO marques la orden como pagada aquí.
  // Confirma en tu backend con el webhook / API usando transaction.id
});
```

### 5.2 Web Checkout (redirección a Wompi)

```html
<form action="https://checkout.wompi.co/p/" method="GET">
  <input type="hidden" name="public-key" value="pub_prod_XXXXXXXX" />
  <input type="hidden" name="currency" value="COP" />
  <input type="hidden" name="amount-in-cents" value="4950000" />
  <input type="hidden" name="reference" value="ORDEN-12345" />
  <input type="hidden" name="signature:integrity" value="<FIRMA_DEL_SERVIDOR>" />
  <input type="hidden" name="redirect-url" value="https://mitienda.com.co/pagos/respuesta" />
  <button type="submit">Pagar con Wompi</button>
</form>
```

### 5.3 Parámetros opcionales útiles

- `redirect-url`: URL de tu sitio a la que vuelve el cliente (con `?id=<ID_TRANSACCION>`).
- `expiration-time`: activa un contador de expiración (recuerda incluirlo en la firma).
- `customer-data` (`email`, `full-name`, `phone-number` + `phone-number-prefix`, `legal-id` + `legal-id-type`): prellena datos del pagador. Tipos de documento: `CC`, `CE`, `NIT`, `PP`, `TI`, `DNI`, `RG`, `OTHER`.
- `shipping-address` y `collect-shipping`: datos de envío.
- `tax-in-cents:vat` / `tax-in-cents:consumption`: detalle de impuestos. **No se suman al total**: el monto de la transacción ya debe incluirlos.

### 5.4 Transporte `postMessage` (si usas cifrado JWE en PSE)

Si cifras los campos de referencia de PSE (`referenceOne/Two/Three`) con JWE, la URL del iframe puede superar los límites seguros de longitud (~2.048 bytes) y el widget puede quedar en blanco. Activa:

```js
const checkout = new WidgetCheckout({
  // ...configuración habitual
  paymentMethod: {
    referenceOne: "<TOKEN-JWE>",
    referenceTwo: "<TOKEN-JWE>",
    referenceThree: "<TOKEN-JWE>",
  },
  bootstrapTransport: "postmessage",
});
```

Ventajas: los datos sensibles no viajan en la URL (logs, historial, herramientas de red). El mecanismo usa un nonce de 128 bits, valida el origen, acepta la configuración una sola vez y tiene un timeout fijo de 8 segundos. No cambia la firma de integridad ni los datos que recibe tu backend. Puede usarse siempre, aunque no cifres.

### 5.5 Campos de referencia PSE (servicios financieros)

Para comercios de la categoría *Servicios Financieros*, se recomienda enviar el objeto `payment-method` con `reference-one` (IP del usuario), `reference-two` (fecha de apertura del producto, `yyyymmdd`) y `reference-three` (documento del beneficiario). Pueden cifrarse con JWE (Wompi detecta si vienen cifrados o en texto plano).

---

## 6. Redirección: solo informativa

Tras el pago, Wompi puede redirigir al cliente a tu `redirect-url` con el `id` de la transacción:

```
https://mitienda.com.co/pagos/respuesta?id=01-1531231271-19365
```

- Úsala **solo para mostrar un mensaje** al cliente (“estamos validando tu pago…”).
- **No** actualices el estado de la orden basándote en esa redirección: cualquiera puede visitar esa URL con un `id` inventado.
- La consulta directa a la API desde el frontend no está soportada; hazla desde tu backend.
- Muestra el estado final consultando **tu propia base de datos** (actualizada por el webhook).

---

## 7. Webhooks (Eventos): la fuente de verdad

### 7.1 Configuración

1. En el Dashboard de Comercios, configura la **URL de eventos**.
2. Configura una URL **distinta para Sandbox y para Producción**, para evitar mezclar transacciones de prueba con datos reales.
3. Usa **HTTPS**.

### 7.2 Entrega y reintentos

- Wompi hace un `POST` con un JSON a tu URL.
- Debes responder **HTTP 200** (el cuerpo no importa).
- Si respondes otra cosa, Wompi reintenta hasta 3 veces en 24 horas: ~30 minutos, ~3 horas y ~24 horas después.

### 7.3 Estructura del evento

```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "1234-1610641025-49201",
      "amount_in_cents": 4490000,
      "reference": "MZQ3X2DE2SMX",
      "currency": "COP",
      "payment_method_type": "NEQUI",
      "status": "APPROVED"
    }
  },
  "environment": "prod",
  "signature": {
    "properties": ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
    "checksum": "3476DDA50F64CD7CBD160689640506FEBEA93239BC524FC0469B2C68A3CC8BD0"
  },
  "timestamp": 1530291411,
  "sent_at": "2018-07-20T16:45:05.000Z"
}
```

Tipos de evento documentados: `transaction.updated` (estados finales `APPROVED`, `VOIDED`, `DECLINED`, `ERROR`), `nequi_token.updated` y `bancolombia_transfer_token.updated`. La lista puede crecer, así que maneja con tolerancia los tipos desconocidos (responde 200 y registra).

### 7.4 Verificación del checksum (obligatoria)

El checksum llega en el header `X-Event-Checksum` y en `signature.checksum`. Para validarlo:

1. Concatena, **en orden**, los valores de `signature.properties` tomados de `data`.
2. Concatena el campo `timestamp`.
3. Concatena tu **secreto de eventos**.
4. Calcula SHA256 (hexadecimal).
5. Compara con el checksum recibido. Si no coinciden, **ignora el evento**.

Ejemplo del flujo:

```
1234-1610641025-49201APPROVED4490000   (properties)
+ 1530291411                            (timestamp)
+ prod_events_xxxxxxxx                  (secreto)
→ SHA256 → 3476DDA5...
```

> Las `properties` **pueden variar** entre eventos y en el tiempo. No las hardcodees: léelas siempre del evento.

### 7.5 Implementación de referencia (Node.js / Express)

```js
const express = require("express");
const crypto = require("crypto");

const EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET;
const EXPECTED_ENV = process.env.WOMPI_ENV || "prod"; // "prod" | "test"
const API_BASE = EXPECTED_ENV === "prod"
  ? "https://production.wompi.co/v1"
  : "https://sandbox.wompi.co/v1";

const app = express();
app.use(express.json({ limit: "100kb" }));

const getByPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

function computeChecksum(event) {
  const props = event?.signature?.properties;
  if (!Array.isArray(props) || props.length === 0) return null;
  let str = "";
  for (const p of props) {
    const v = getByPath(event.data, p);
    if (v === undefined || v === null) return null;
    str += String(v);
  }
  str += String(event.timestamp) + EVENTS_SECRET;
  return crypto.createHash("sha256").update(str).digest("hex");
}

function safeEqualHex(a, b) {
  const A = Buffer.from(String(a).toLowerCase());
  const B = Buffer.from(String(b).toLowerCase());
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

app.post("/webhooks/wompi", async (req, res) => {
  const event = req.body;
  const computed = computeChecksum(event);
  const received = req.get("X-Event-Checksum") || event?.signature?.checksum;

  if (!computed || !received || !safeEqualHex(computed, received)) {
    return res.sendStatus(401); // firma inválida: ignorar
  }
  if (event.environment !== EXPECTED_ENV) return res.sendStatus(200);

  res.sendStatus(200); // responder rápido y procesar después

  if (event.event === "transaction.updated") {
    const tx = event.data.transaction;
    // 1) Idempotencia: ¿ya procesé tx.id + tx.status? (índice único en BD)
    // 2) Confirmar con la API: GET `${API_BASE}/transactions/${tx.id}`
    // 3) Validar reference, amount_in_cents y currency contra tu orden
    // 4) Actualizar estado de la orden
  }
});

app.listen(process.env.PORT || 3000);
```

### 7.6 Reglas de seguridad del webhook

- **Valida la firma antes de hacer cualquier cosa** con el contenido.
- Usa **comparación en tiempo constante** (`timingSafeEqual`, `hash_equals` en PHP, `hmac.compare_digest` en Python).
- **Idempotencia:** el mismo evento puede llegar más de una vez (reintentos). Deduplica por `transaction.id` + `status` con un índice único.
- **No uses el `timestamp` como ventana anti-replay estricta**, porque los reintentos llegan hasta 24 horas después. La idempotencia es la defensa adecuada.
- **Doble verificación:** consulta `GET /v1/transactions/<id>` desde tu backend antes de dar por pagada una orden.
- **Valida la orden:** busca por `reference` y confirma monto y moneda. Rechaza discrepancias.
- **Valida `environment`** (`test` vs `prod`).
- **Responde 200 rápido**; encola el procesamiento pesado.
- **No registres secretos** en logs. Registra el `id` del evento y el resultado de la validación.
- Opcional: restringe la ruta del webhook a nivel de WAF/rate limiting y limita el tamaño del cuerpo.

---

## 8. Reintento de pagos

Wompi permite al pagador reintentar con otro método si el primer intento falla (ventana de 3 minutos).

- Un mismo pedido puede generar **dos transacciones con la misma referencia**: una `DECLINED` y otra `APPROVED`.
- El webhook notifica cada transacción con su propio ID (y puede cambiar el medio de pago).
- **No marques la orden como fallida solo porque llegó un `DECLINED`**; espera el estado final de la orden considerando todas las transacciones con esa referencia, y evita doble cobro/doble entrega.

---

## 9. Links de pago (API)

Para crear links de pago de forma programática (cobros por link, expiración, uso único, monto abierto):

```
POST /v1/payment_links
Authorization: Bearer <LLAVE_PRIVADA>
```

Cuerpo mínimo:

```json
{
  "name": "Pago de arriendo - AP 505",
  "description": "Arriendo mensual",
  "single_use": false,
  "collect_shipping": false
}
```

Campos útiles: `currency` (`COP`), `amount_in_cents` (si es monto fijo), `expires_at` (ISO 8601), `redirect_url`, `customer_data.customer_references` (máx. 2 campos personalizados) y `taxes` (`VAT` o `CONSUMPTION`).

Seguridad:

- Crea los links **solo desde tu backend** (la llave privada nunca va al frontend).
- Usa `single_use: true` y `expires_at` cuando sea posible.
- Para montos fijos, defínelos en la creación del link en lugar de dejarlos abiertos.
- El link tiene la forma `https://checkout.wompi.co/l/<ID_DEL_LINK>`.
- Los pagos de los links también se confirman por **webhook** (la transacción trae `payment_link_id`).

---

## 10. Sandbox y pruebas

- Desarrolla con llaves y secretos de **Sandbox**, con su propia URL de eventos.
- Prueba al menos: pago aprobado, rechazado, error, abandono del checkout, **webhook duplicado**, **firma inválida** y **monto manipulado**.
- Verifica que tu endpoint devuelva 200 solo cuando corresponde y que los reintentos no dupliquen acciones (entregas, correos, descuentos de inventario).
- Antes de salir a producción, cambia **llaves, secretos y URL de eventos** al ambiente de producción.

---

## 11. Permisos del equipo (roles y usuarios)

En el dashboard puedes crear roles con permisos granulares (transacciones, reportes, desarrolladores, roles y usuarios, etc.).

- Aplica el **principio de mínimo privilegio**: solo quien integra necesita el permiso de **Desarrolladores** (donde están los secretos).
- Revisa periódicamente quién tiene acceso y retira usuarios que ya no lo necesiten.
- Para reportería, asigna solo “Administrar reportes personalizados” y/o “Descarga de reportes” a quien lo requiera.

---

## 12. Checklist de seguridad antes de producción

**Credenciales**
- [ ] Llave privada, secreto de integridad y secreto de eventos solo en el backend (variables de entorno / gestor de secretos).
- [ ] Ningún secreto en repositorio, frontend ni logs.
- [ ] Llaves de producción (`prod`) en producción y de sandbox (`test`) en desarrollo.

**Checkout**
- [ ] Referencia única generada en el servidor y guardada con la orden.
- [ ] Monto y moneda salen de tu base de datos, no del cliente.
- [ ] Firma de integridad generada en el servidor (SHA256) con el orden correcto de campos.
- [ ] Sitio completo bajo HTTPS.

**Webhook**
- [ ] URL de eventos distinta para Sandbox y Producción, con HTTPS.
- [ ] Validación del checksum (`X-Event-Checksum`) con comparación en tiempo constante.
- [ ] `signature.properties` leídas del evento, no hardcodeadas.
- [ ] Validación de `environment`.
- [ ] Idempotencia con índice único en BD.
- [ ] Doble verificación vía `GET /v1/transactions/<id>`.
- [ ] Validación de `reference`, monto y moneda contra la orden.
- [ ] Respuesta HTTP 200 rápida; procesamiento asíncrono.
- [ ] Manejo tolerante de tipos de evento desconocidos.

**Negocio**
- [ ] La redirección solo muestra información; no cambia estados.
- [ ] Manejo correcto de reintentos de pago (misma referencia, múltiples transacciones).
- [ ] Alertas ante firmas inválidas repetidas o discrepancias de monto.
- [ ] Roles y usuarios del dashboard con mínimo privilegio.

---

## 13. Referencias oficiales

- Documentación: <https://docs.wompi.co/>
- Eventos (webhooks): <https://docs.wompi.co/en/docs/colombia/eventos/>
- Ambientes y llaves: <https://docs.wompi.co/en/docs/colombia/ambientes-y-llaves/>
- Referencia de la API: <https://docs.wompi.co/en/docs/colombia/referencia/>
- Dashboard de Comercios: <https://comercios.wompi.co/>
- Estado del servicio: <https://wompi.statuspage.io/>
