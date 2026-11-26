# Plan de Pruebas — Pasarela Wompi en Producción (API Real)

Este documento define el protocolo paso a paso para validar la pasarela de pagos **Wompi en ambiente de Producción** (`production.wompi.co`) en **Plaxtilineas**, cubriendo el flujo completo de checkout, webhooks, sincronización de stock con el catálogo, facturación por correo y gestión logística de pedidos.

---

## 1. Regla clave sobre Wompi Producción

> **Importante:** En Wompi Producción (`pub_prod_...`) **no existen tarjetas de prueba** ni dinero simulado.
> * Tarjetas como `4242 4242 4242 4242` **solo funcionan en Sandbox (`pub_test_...`)**. Usarlas en producción genera rechazos reales (`DECLINED`) y, si se repiten, puede activar alertas antifraude en tu comercio.
> * Por esta razón, el plan se divide en **pruebas de costo \$0** (apertura, firma, cierre sin pago y rechazo real) y **una única prueba aprobada reversible** por monto mínimo.

---

## 2. Checklist de Pre-requisitos (Antes de iniciar)

### 2.1 Variables de entorno (`Plaxtilineas/backend-laravel/.env`)
Verificar que **todas** las credenciales correspondan al ambiente de **Producción** (nunca mezclar `test` y `prod`):

```env
APP_ENV=production
WOMPI_ENV=production
WOMPI_PUBLIC_KEY=pub_prod_xxxxxxxxxxxxxxxx
WOMPI_PRIVATE_KEY=prv_prod_xxxxxxxxxxxxxxxx
WOMPI_EVENTS_SECRET=prod_events_xxxxxxxxxxxxxxxx
WOMPI_INTEGRITY_SECRET=prod_integrity_xxxxxxxxxxxxxxxx
WOMPI_REDIRECT_URL=https://plaxtilineas.com/perfil?tab=pedidos
```

> Después de actualizar `.env`, ejecutar `php artisan config:clear` (y `php artisan config:cache` en servidor).

### 2.2 Configuración en Wompi Comercios (`https://comercios.wompi.co`)
* [ ] Confirmar que la cuenta esté en modo **Producción** (no Sandbox).
* [ ] Ir a **Desarrolladores → Seguimiento de transacciones → URL de eventos** y configurar:
  `https://<tu-backend-produccion>/api/wompi/webhook`
* [ ] Verificar que tanto el frontend como el backend operen sobre **HTTPS válido** (Wompi Producción exige HTTPS para `redirectUrl` y webhooks).

### 2.3 Servicios dependientes activos
* [ ] **Catálogo (`catalogo-laravel`):** URL de producción configurada en `CATALOGO_API_URL`, token `CATALOGO_INVENTORY_TOKEN` válido y caché operativa.
* [ ] **Correo (Hostinger Mail API):** `MAIL_MAILER=hostinger` configurado (con normalización ASCII activa en `HostingerMailTransport`).
* [ ] **Cloudinary:** credenciales vigentes para subida de evidencias fotográficas de envío (`plaxtilineas/evidencias_envio`) y entrega (`plaxtilineas/evidencias_entrega`).
* [ ] **Migraciones al día:** confirmadas en BD las columnas `evidencia_envio_url`, `evidencia_entrega_url`, `fecha_entrega` en `pedidos`, y `tipo_documento`, `numero_documento` en `usuarios`.

---

## 3. Batería de Pruebas en Producción

### Fase 1 — Validación de Firma, Widget y Reserva de Stock (Costo: \$0)

| # | Escenario | Pasos | Resultado esperado | Estado |
| :-: | :--- | :--- | :--- | :-: |
| **1.1** | **Apertura del Widget real y firma `prod_integrity_`** | 1. Iniciar sesión con una cuenta cliente que tenga **C.C. o NIT** registrado.<br>2. Agregar 1 unidad de un producto (ej. stock `20`).<br>3. Ir a `/pago` y pulsar **Continuar al pago con Wompi**. | El stock baja exactamente en `1` (`20 → 19`). El Widget de Wompi Producción abre sin error de firma, mostrando el monto exacto en COP, referencia `PLX-...` y datos prellenados. | [ ] |
| **1.2** | **Cierre de Wompi sin pagar + Reintento en `/pago`** | 1. Cerrar la ventana/modal de Wompi sin pagar.<br>2. Sin salir de `/pago`, pulsar nuevamente **Pagar**. | Reabre Wompi sobre el **mismo pedido** con una nueva referencia rotada. **No** redirige a `/carrito` vacío, **no** crea pedido duplicado y el stock sigue exactamente en `19`. | [ ] |
| **1.3** | **Abandono desde `/pago` con botón Volver** | 1. Cerrar Wompi sin pagar.<br>2. Pulsar **Volver** en `/pago`. | El pedido pendiente se cancela automáticamente y el stock vuelve exactamente a `20` (0 unidades perdidas). | [ ] |

---

### Fase 2 — Validación de Webhook Real y Checksum con Pago Rechazado (Costo: \$0)

| # | Escenario | Pasos | Resultado esperado | Estado |
| :-: | :--- | :--- | :--- | :-: |
| **2.1** | **Transacción `DECLINED` real** | 1. Agregar 1 producto e ir a `/pago` → abrir Wompi.<br>2. Pagar con **Nequi y rechazar la notificación push** en tu celular (o usar una tarjeta virtual personal con \$0 de saldo / apagada temporalmente en tu banco). | Wompi rechaza la transacción sin cobro. Tu backend recibe el webhook real `transaction.updated` (`DECLINED`), valida el checksum `prod_events_` (HTTP `200`), **no** aprueba el pedido y libera/mantiene consistencia del stock. | [ ] |
| **2.2** | **Vista en *Mis Pedidos* tras cierre o rechazo** | Revisar el pedido en `/perfil?tab=pedidos`. | Se muestra correctamente el estado real y el botón **Reintentar Pago** funciona generando nueva referencia firmada. | [ ] |

---

### Fase 3 — Prueba E2E Completa de Pago Aprobado (1 prueba reversible)

> **Recomendación de costo mínimo:** Crear temporalmente un producto oculto de prueba con precio **\$1.500 COP** (mínimo permitido por Wompi Colombia) y stock `5`. Pagar preferiblemente con **tarjeta de crédito** para poder **anular el cargo el mismo día** desde Wompi Comercios antes del cierre bancario.

| # | Escenario | Pasos | Resultado esperado | Estado |
| :-: | :--- | :--- | :--- | :-: |
| **3.1** | **Pago `APPROVED` real** | Comprar 1 unidad del producto de prueba en `/pago` usando tarjeta de crédito, PSE o Nequi real. | Redirige a `/perfil?tab=pedidos`. El webhook `APPROVED` + verificación S2S contra `production.wompi.co` actualiza el pedido a **Pago Confirmado** automáticamente. | [ ] |
| **3.2** | **Precisión de inventario** | Consultar el producto en el catálogo y en los logs `[CATALOGO_STOCK]`. | El stock pasó exactamente de `5` a `4` (`delta: -1`, sin doble descuento). | [ ] |
| **3.3** | **Factura por correo y Comprobante PDF** | Revisar bandeja de entrada del cliente y abrir **Ver Comprobante** en *Mis Pedidos*. | Llega el correo de confirmación de compra mostrando **C.C. / NIT** del cliente, detalle de productos, subtotal, envío y total. El comprobante imprimible también muestra la identificación. | [ ] |
| **3.4** | **Despacho en Dashboard Admin (`En Camino`)** | En `/admin/pedidos`, abrir el pedido → **Asignar Transportadora y Guía** → seleccionar transportadora, ingresar guía, subir foto de evidencia y guardar. | El estado avanza automáticamente a **En Camino** (en admin y en *Mis Pedidos*), se guarda la foto en Cloudinary y llega correo al cliente con *«De Pago Confirmado a En Camino»* + enlace a la foto. | [ ] |
| **3.5** | **Entrega en Dashboard Admin (`Entregado`)** | Pulsar **Marcar como Entregado (Adjuntar Evidencia)** → intentar guardar sin foto (debe bloquear) → subir foto de entrega y confirmar. | El estado cambia a **Entregado**, se registra `fecha_entrega`, aparece el *toast* verde en la esquina superior derecha, el cliente ve ambas evidencias en *Mis Pedidos* y recibe el correo con la foto de entrega. | [ ] |
| **3.6** | **Anulación / Reembolso y limpieza** | 1. En `comercios.wompi.co`, ubicar la transacción y ejecutar **Anular / Reembolsar**.<br>2. Eliminar el producto temporal de prueba del catálogo. | El cargo se reversa a la tarjeta y no quedan productos de prueba visibles en la tienda. | [ ] |

---

## 4. Logs a Monitorear Durante las Pruebas

### En Comercio (`Plaxtilineas/backend-laravel/storage/logs/laravel.log`)
* **Checkout firmado:** `CreateCheckoutAction — Checkout firmado generado`
* **Stock y carrito:** `[SYNC_CARRITO]` y `[CATALOGO_API_STOCK]` (verificar `idempotency_key`, `delta`, `stock_antes`, `nuevo_stock`, `duracion_ms`).
* **Confirmación de pago:** `ConfirmarPedidoAction — Pedido confirmado y pagado OK`

### En Catálogo (`catalogo-php/catalogo-laravel/storage/logs/laravel.log`)
* **Ajuste atómico:** `[CATALOGO_STOCK] Ajuste de stock aplicado correctamente` (verificar que `request_id` e `idempotency_key` coincidan con el comercio y `stock_antes - stock_despues` sea exacto).

### Señales de alerta que detienen la salida a producción
| Error en log | Causa probable | Acción correctiva |
| :--- | :--- | :--- |
| `401` en `/api/wompi/webhook` | `WOMPI_EVENTS_SECRET` no coincide con el de Wompi Producción. | Copiar nuevamente el secreto `prod_events_...` desde Wompi Comercios y limpiar caché de config. |
| `webhook de ambiente cruzado (prod en sandbox)` | Mezcla de llaves `pub_test_` con eventos `prod` (o viceversa). | Verificar que todas las variables `WOMPI_*` sean `prod`. |
| `Timeout HTTP tras enviar ajuste` (`cURL error 28`) | Latencia alta entre Comercio y Catálogo. | Verificar conectividad/BD del catálogo; el reintento idempotente con `X-Idempotency-Key` evita doble descuento. |
| `Hostinger Mail API ... 500` | Error en proveedor de correo o formato de mensaje. | Revisar credenciales de Hostinger Mail API y contenido del Mailable. |

---

## 5. Plan de Contingencia (Rollback rápido)

Si durante las pruebas en producción se detecta cualquier anomalía antes de abrir a clientes:
1. Desactivar temporalmente Wompi desde la configuración del sistema (o revertir las variables `WOMPI_*` en `.env` a Sandbox `pub_test_...` y ejecutar `php artisan config:clear`).
2. Revisar `storage/logs/laravel.log` con el `request_id` de la operación fallida antes de reintentar.
