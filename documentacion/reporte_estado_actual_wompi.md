# Reporte de Estado Actual: Implementación de la Pasarela de Pagos Wompi

**Fecha del diagnóstico:** 24 de noviembre de 2026  
**Referencias evaluadas:**
- `documentacion/wompi-implementacion-segura.md`
- `documentacion/guia-webhooks-seguridad-wompi.md`

Este documento presenta una auditoría técnica del estado actual de la integración de **Wompi** en Plaxtilineas (**Backend Laravel** y **Frontend Angular**), verificando firma de integridad, concatenación criptográfica `SHA-256`, flujo de checkout, recepción y validación de webhooks, y puntos de riesgo detectados.

---

## 1. Resumen Ejecutivo

| Criterio Evaluado | Estado | Observación Principal |
| :--- | :---: | :--- |
| **Firma criptográfica generada en el backend** | ✅ Cumple | Se calcula exclusivamente en `SignatureService.php`. El secreto de integridad nunca se expone al frontend. |
| **Concatenación `ref + monto + moneda + secreto`** | ✅ Cumple | Orden exacto sin separadores: `$reference.$amountCents.$currency.$secret`, con monto entero en centavos obtenido desde la BD. |
| **Aplicación de `SHA-256`** | ✅ Cumple | Implementado con `hash('sha256', ...)` en formato hexadecimal. |
| **Segregación de credenciales (`.env`)** | ✅ Cumple | Variables configuradas en `backend-laravel/.env` (actualmente en modo `sandbox`: `pub_test_*`, `prv_test_*`, `test_integrity_*`, `test_events_*`). |
| **Uso efectivo de `signature:integrity` en checkout** | ⚠️ Observación | El backend genera `firma_integridad`, pero el frontend redirige a un **Payment Link** (`/v1/payment_links` con llave privada), no al Widget/Web Checkout con firma. |
| **Confirmación mediante Webhooks (`POST /api/wompi/webhook`)** | ❌ Crítico | El endpoint existe, pero **falla siempre ante webhooks reales de Wompi (`401`)** debido a 2 errores en `SignatureService::validateWebhookChecksum()`. |
| **Idempotencia y auditoría de webhooks** | ❌ Deficiente | `ProcessWompiEventAction` busca `$evento['id']` en la raíz del JSON, campo ausente en el payload oficial de Wompi. |

---

## 2. Arquitectura Actual del Flujo de Pago

### 2.1 Archivos Involucrados

**Backend (`backend-laravel/`):**
- `config/wompi.php` — Centraliza `WOMPI_ENV`, `base_url`, llaves (`public_key`, `private_key`), secretos (`integrity_secret`, `events_secret`) y `redirect_url`.
- `routes/api.php` — Registra `POST /api/wompi/datos-pago` (`auth:sanctum`) y `POST /api/wompi/webhook` (`throttle:wompi-webhook`).
- `app/Http/Controllers/Api/WompiController.php` — Controlador delgado que delega a los Actions.
- `app/Actions/Payments/CreateCheckoutAction.php` — Recalcula el total desde BD, marca el pedido como `pendiente_pago`, calcula `firma_integridad`, crea el Payment Link en Wompi y guarda `wompi_link_id`.
- `app/Services/Wompi/SignatureService.php` — Calcula `buildIntegritySignature()` y valida `validateWebhookChecksum()`.
- `app/Services/Wompi/WompiClient.php` — Cliente HTTP con `WOMPI_PRIVATE_KEY`, timeouts y reintentos.
- `app/Actions/Payments/ProcessWompiEventAction.php` — Orquesta el procesamiento del webhook, validación de monto, consulta a la API de Wompi y transición de estado en transacción DB con `lockForUpdate()`.
- `app/Http/Controllers/Api/PedidoController.php` (`verificarEstado`) — Endpoint `GET /api/pedidos/estado` usado por `/pago-exitoso` para consultar el estado y confirmar proactivamente vía API de Wompi.
- `app/Services/WompiService.php` — Puente de compatibilidad (*legacy*) con un método `verificarChecksum()` que actualmente no usa el webhook principal.

**Frontend (`frontend/`):**
- `src/app/services/wompi.service.ts` — Llama a `POST /api/wompi/datos-pago` y redirige con `window.location.href = checkoutUrl`.
- `src/app/pages/pago/pago.component.ts` — Inicia la creación del borrador de pedido y solicita los datos de pago a Wompi.
- `src/app/pages/pago-exitoso/pago-exitoso.component.ts` — Pantalla de retorno que consulta el estado real del pedido al backend (`GET /api/pedidos/estado`).

---

## 3. Auditoría de Firma de Integridad (`SHA-256`)

### 3.1 Implementación Actual
En `backend-laravel/app/Services/Wompi/SignatureService.php` (líneas 32–44):

```php
public function buildIntegritySignature(
    string $reference,
    int $amountCents,
    string $currency = 'COP'
): string {
    $secret = (string) config('wompi.integrity_secret', '');

    if ($secret === '') {
        Log::warning('SignatureService::buildIntegritySignature — integrity_secret no configurado');
    }

    return hash('sha256', $reference.$amountCents.$currency.$secret);
}
```

### 3.2 Verificación contra la Especificación de Wompi
- **Cálculo exclusivo en backend:** ✅ Sí. El frontend nunca recibe ni almacena `WOMPI_INTEGRITY_SECRET`.
- **Fuente de verdad del monto:** ✅ Sí. En `CreateCheckoutAction.php` (líneas 49–51) se ejecuta `$pedido->refresh()` y `$amountCents = (int) round((float) $pedido->total * 100)`.
- **Orden de concatenación:** ✅ Exacto: `<Referencia><MontoEnCentavos><Moneda><SecretoIntegridad>` sin separadores.
- **Algoritmo criptográfico:** ✅ `hash('sha256', ...)` devuelve el digest hexadecimal estándar en minúsculas.
- **Observaciones menores:**
  1. Si `WOMPI_INTEGRITY_SECRET` llegara a estar vacío, solo se registra un `Log::warning` en lugar de abortar con error.
  2. Actualmente `wompi.service.ts` redirige a `https://checkout.wompi.co/l/{linkId}` (Payment Link creado servidor-a-servidor con `WOMPI_PRIVATE_KEY`), por lo que la `firma_integridad` devuelta por `/api/wompi/datos-pago` no es consumida por un Widget/Web Checkout. El enfoque de Payment Link es seguro porque el monto queda fijado en Wompi desde el backend, pero conviene tener presente que `firma_integridad` solo entraría en efecto si se migra a Widget JS o Web Checkout (`/p/`).

---

## 4. Auditoría de Confirmación mediante Webhooks

Aunque el endpoint `POST /api/wompi/webhook` está implementado con una base sólida (control de concurrencia con `lockForUpdate()`, protección contra reversión de pedidos `PAGADO` y consulta a la API de Wompi), se identificaron **4 defectos críticos/altos** y **2 mejoras de endurecimiento**:

### 4.1 ❌ Bug Crítico #1 — Concatenación incorrecta del `timestamp` en el checksum
**Ubicación:** `backend-laravel/app/Services/Wompi/SignatureService.php` (línea 74)

```php
$timestamp = (string) ($signature['checksum'] ?? $evento['timestamp'] ?? '');
```

- **Problema:** Wompi siempre incluye `signature.checksum` en el cuerpo del evento. Debido al operador `??`, el código toma el propio checksum en lugar de `$evento['timestamp']`.
- **Impacto:** El hash SHA-256 calculado **nunca coincide** con el header `X-Event-Checksum`, provocando que **todos los webhooks reales de Wompi sean rechazados con `HTTP 401 Firma de evento inválida`** cuando `WOMPI_EVENTS_SECRET` está configurado.

### 4.2 ❌ Bug Crítico #2 — Ruta incorrecta al extraer `signature.properties`
**Ubicación:** `backend-laravel/app/Services/Wompi/SignatureService.php` (líneas 78–80)

```php
foreach ($properties as $prop) {
    $cadena .= $this->extractNestedValue($evento, $prop);
}
```

- **Problema:** Wompi entrega `signature.properties` con rutas relativas al nodo `data` (por ejemplo, `["transaction.id", "transaction.status", "transaction.amount_in_cents"]`), **no** relativas a la raíz `$evento`.
- **Impacto:** `extractNestedValue($evento, 'transaction.id')` busca `$evento['transaction']['id']` en lugar de `$evento['data']['transaction']['id']`, devolviendo `""` para todas las propiedades y rompiendo nuevamente la validación del checksum.

### 4.3 ❌ Bug Crítico #3 — Modo permisivo cuando `WOMPI_EVENTS_SECRET` está vacío
**Ubicación:** `backend-laravel/app/Services/Wompi/SignatureService.php` (líneas 60–64) y `backend-laravel/app/Services/WompiService.php` (líneas 53–57)

```php
if ($eventsSecret === '') {
    Log::warning('... permitiendo webhook (modo permisivo)');
    return true;
}
```

- **Problema:** Si en algún entorno faltara la variable `WOMPI_EVENTS_SECRET`, el sistema acepta cualquier petición POST al webhook sin validar firma.
- **Impacto:** Riesgo de falsificación de pagos (*webhook spoofing*). El comportamiento seguro debe ser *fail-closed* (`return false`).

### 4.4 ⚠️ Bug Alto #4 — Idempotencia y auditoría inactivas por ausencia de `$evento['id']`
**Ubicación:** `backend-laravel/app/Actions/Payments/ProcessWompiEventAction.php` (líneas 48, 77 y 209)

- **Problema:** El código lee `$eventoId = (string) ($evento['id'] ?? '')`, pero el payload estándar de eventos de Wompi no contiene un atributo `id` en la raíz del JSON (identifica el evento por `data.transaction.id`, `data.transaction.status`, `timestamp` y `signature.checksum`).
- **Impacto:** Con `$eventoId === ''`, se omiten tanto la verificación `WompiWebhookEvent::alreadyProcessed($eventoId)` como el registro de auditoría en la tabla `wompi_webhook_events`.

### 4.5 ⚠️ Observaciones de Endurecimiento en Conciliación API
1. **`ProcessWompiEventAction.php` (líneas 119–129):** Al consultar `GET /v1/transactions/{id}` contra la API de Wompi, únicamente toma `$confirmedTx['status']` sin volver a verificar `amount_in_cents`, `currency === 'COP'` ni `reference`/`payment_link_id`; además, si la API falla, hace *fallback* silencioso al estado del payload del webhook.
2. **`PedidoController::verificarEstado()` (líneas 204–226):** Es el mecanismo que actualmente logra confirmar pedidos cuando el usuario regresa a `/pago-exitoso` (ocultando el fallo de los webhooks). Sin embargo, antes de confirmar un pedido desde esa consulta proactiva tampoco valida que `amount_in_cents` coincida con `$pedido->total * 100` ni que `currency === 'COP'`.

---

## 5. Remediación Aplicada (Implementación Segura Oficial)

Se aplicaron las siguientes correcciones sobre **Backend** y **Frontend** siguiendo al pie de la letra `wompi-implementacion-segura.md` y `guia-webhooks-seguridad-wompi.md`:

1. **Web Checkout Oficial con `signature:integrity` activa (`CreateCheckoutAction.php` + `wompi.service.ts`):**
   - El backend recalcula el monto en centavos desde BD, exige `WOMPI_PUBLIC_KEY` y `WOMPI_INTEGRITY_SECRET` configurados (`503` si faltan) y firma `<Referencia><MontoEnCentavos>COP<SecretoIntegridad>` con `SHA-256`.
   - El frontend envía un formulario `GET` hacia `https://checkout.wompi.co/p/` con `public-key`, `currency`, `amount-in-cents`, `reference`, `signature:integrity` y `redirect-url` (más `customer-data` prellenado).
2. **Validación exacta y *fail-closed* de Webhooks (`SignatureService.php`):**
   - Lee `$evento['timestamp']` real (corrigiendo la lectura errónea de `signature.checksum`).
   - Extrae dinámicamente `signature.properties` desde `$evento['data']` en el orden recibido.
   - Rechaza de inmediato (`return false` → `401`) si `WOMPI_EVENTS_SECRET` está vacío o si alguna propiedad falta, comparando con `hash_equals` en tiempo constante.
3. **Idempotencia determinística, Doble Verificación S2S y Regla de Reintentos (`ProcessWompiEventAction.php`):**
   - Genera clave determinística `"{$transId}:{$txStatus}"` cuando el JSON raíz de Wompi no incluye `id`, garantizando deduplicación y auditoría en `wompi_webhook_events`.
   - Valida `environment` (`test`/`sandbox` vs `prod`/`production`), monto exacto en centavos y moneda `COP` tanto en el evento como en `GET /v1/transactions/{id}`.
   - Ante caída temporal de la API de Wompi retorna `503` para activar los reintentos automáticos oficiales (~30 min, ~3 h, ~24 h) sin aprobar a ciegas.
   - Respeta la ventana de reintento de Wompi (§8): un primer `DECLINED` conserva `pendiente_pago` y la reserva activa para permitir un segundo intento `APPROVED` con la misma referencia; `VOIDED` y `ERROR` cancelan y liberan reserva; un pedido `PAGADO` jamás retrocede.
4. **Desacoplamiento total de `/pago-exitoso` sin pantalla de carga ni polling (`PedidoController.php` + `pago-exitoso.component.ts`):**
   - `GET /api/pedidos/estado` pasó a ser **100% de solo lectura sobre la BD propia**: nunca consulta a Wompi ni aprueba/cancela órdenes desde la redirección del navegador.
   - En `/pago-exitoso` se eliminó por completo el *Limbo State* (spinner, barra de progreso falsa y polling cada 3 s), mostrando de inmediato una vista informativa limpia alineada al Manual de Marca Plaxtilineas mientras la confirmación ocurre servidor a servidor vía Webhook + correo electrónico.

