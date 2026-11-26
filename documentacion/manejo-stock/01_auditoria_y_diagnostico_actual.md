# 🔍 Auditoría Técnica: Caché, Carrito, Stock y Ciclo de Compra (`Plaxtilineas` ↔ `Catalogo-Laravel`)

Este documento presenta el diagnóstico técnico exhaustivo de la integración entre **Plaxtilineas** (`backend-laravel` + `frontend`) y **Catálogo** (`catalogo-laravel` + `Catalogo`), evaluando el sistema de caché, sincronización de inventario en tiempo real, reserva de carrito, checkout, cancelación de pedidos y reintentos de pago con Wompi.

---

## 📊 1. Comparativa de Caché y Sincronización (`Catalogo` vs `Plaxtilineas`)

| Capa / Característica | `catalogo-php` (`catalogo-laravel` + `Catalogo`) | `Plaxtilineas` (`backend-laravel` + `frontend`) | Estado / Brecha Detectada |
| :--- | :--- | :--- | :--- |
| **Caché de Backend** | `CatalogCacheService`: Caché versionada (`catalog:version`), TTL 24h, cabeceras `ETag` (`304 Not Modified`), `Cache-Control: public, max-age=60, stale-while-revalidate=120` y fallback a snapshots JSON en disco (`storage/app/catalog_snapshot`) ante saturación de MySQL. | `CatalogoApiService`: No cachea localmente ni guarda snapshots de respaldo; hace peticiones HTTP en crudo a `catalogo-laravel` en cada consulta. | ⚠️ **Brecha:** Si `catalogo-laravel` experimenta latencia o caída HTTP, `CatalogoApiService::getProducto()` y `getProductos()` devuelven `null` / `[]` sin fallback a caché o BD. |
| **Invalidación de Caché en Ajuste Directo por BD** | Cuando el ajuste entra por HTTP (`POST /api/integraciones/inventario/productos/{id}/ajustar`), `ProductController` llama a `$this->catalogCache->invalidate()`. | Cuando el HTTP falla y `CatalogoApiService` usa el fallback `ajustarStockDirectoEnBaseDatos()` (`DB::connection('catalogo')`), actualiza `products` y `product_variants` por SQL directo. | 🚨 **Bug Crítico:** El fallback SQL directo **NO invalida `catalog:version`** en la caché de `catalogo-laravel`. La API del catálogo sigue devolviendo el stock viejo cacheado hasta por 24 horas. |
| **Sincronización en Tiempo Real (Frontend)** | `RealtimeStockService`: Conecta por **SSE** (`/api/inventario/stream`) con fallback a polling cada 4s en `/api/inventario/cambios?since_id={id}`. Lee `res.data.events`, `ev.stock_nuevo` y `res.data.last_id`. | `CatalogoService`: Hace polling cada 60s a `/api/inventario/cambios?desde={ultimoEventoId}` y lee `res.data.eventos`, `raw.stock` y `res.data.ultimo_evento_id`. | 🚨 **Bug Crítico:** **Incompatibilidad total de contrato JSON y query param** (ver Hallazgo #1). El frontend de Plaxtilineas **nunca** recibe las actualizaciones incrementales de stock. |
| **Caché Persistente en Navegador (Frontend)** | Consume directamente con validación `ETag` del navegador y actualización reactiva vía `RealtimeStockService`. | `localStorage` + `sessionStorage` (`plaxti_catalogo_cache_v3`) con TTL de 5 minutos (`Stale-While-Revalidate`). | ⚠️ Al fallar el polling incremental (`/inventario/cambios`), el usuario de Plaxtilineas ve stock desactualizado en `localStorage` durante 5 minutos. |

---

## 🚨 2. Hallazgos Críticos en el Manejo de Carrito, Stock y Pagos

### Hallazgo #1: Incompatibilidad en `/api/inventario/cambios` (Sincronización en vivo rota en Plaxtilineas)
- **Ubicación:**
  - `catalogo-php/catalogo-laravel/app/Http/Controllers/Api/InventoryController.php` (líneas 17–81)
  - `Plaxtilineas/frontend/src/app/services/catalogo.service.ts` (líneas 138–180)
- **Causa raíz:**
  1. `InventoryController::changes()` espera el parámetro `?since_id={id}`, pero `CatalogoService` en Plaxtilineas envía `?desde={id}`. Al recibir `since_id = null`, el backend del catálogo siempre devuelve `'events' => []`.
  2. `InventoryController` devuelve `{ data: { last_id, events: [{ id, producto_id, stock_nuevo }] } }`, pero `CatalogoService` busca `res.data.ultimo_evento_id`, `res.data.eventos` y `raw.stock`.
- **Impacto:** Los cambios de stock hechos por otros compradores o desde el dashboard del catálogo no se reflejan incrementalmente en Plaxtilineas.

---

### Hallazgo #2: `PedidoController::verificarStock` bloquea al propio comprador al pagar las últimas unidades
- **Ubicación:**
  - `Plaxtilineas/backend-laravel/app/Http/Controllers/Api/PedidoController.php` (líneas 47–93)
  - `Plaxtilineas/frontend/src/app/pages/pago/pago.component.ts` (líneas 768–781)
- **Causa raíz:**
  1. Cuando el usuario agrega un producto al carrito (`POST /api/carrito/sync`), `SyncCarritoAction` **ya descuenta inmediatamente** esas unidades del catálogo (`ajustarStockProducto($id, -$cantidad)`).
  2. Si quedaban `2` unidades en el catálogo y el usuario agrega las `2` a su carrito, el stock libre en el catálogo pasa a ser **`0`**.
  3. Al pulsar **"Continuar al pago con Wompi"**, `PagoComponent` llama primero a `POST /api/productos/verificar-stock`.
  4. A diferencia de `CrearDraftPedidoAction` (que sí calcula `$yaReservado = $carritoPorProducto[$productoId] ?? 0` y solo exige en el catálogo la `$cantidadAdicional`), **`PedidoController::verificarStock` NO toma en cuenta lo que el propio usuario ya tiene reservado en su tabla `carritos`**.
- **Impacto:** El sistema le dice al usuario *"Producto agotado o no disponible / Stock insuficiente"* bloqueándole su propia compra, porque el stock lo tiene reservado su propio carrito.

---

### Hallazgo #3: Inflación y pérdida de control de stock cuando `clearCart()` se ejecuta al abrir/cerrar Wompi
- **Ubicación:**
  - `Plaxtilineas/backend-laravel/app/Actions/Pedidos/CrearDraftPedidoAction.php` (líneas 129, 170–215)
  - `Plaxtilineas/backend-laravel/app/Actions/Payments/CreateCheckoutAction.php` (líneas 66–70)
  - `Plaxtilineas/frontend/src/app/services/wompi.service.ts` (línea 123)
  - `Plaxtilineas/frontend/src/app/pages/pago-exitoso/pago-exitoso.component.ts` (línea 35)
- **Causa raíz:**
  1. Para pagos con Wompi, `CrearDraftPedidoAction` crea el pedido en estado `DRAFT` y crea los registros en `stock_reservas`, pero **NO elimina los registros de `carritos` en la base de datos** (línea 172: `if ($estadoInicial !== EstadoPedido::DRAFT)`).
  2. Luego `CreateCheckoutAction` (`POST /api/wompi/datos-pago`) cambia el pedido de `DRAFT` a `PENDIENTE_PAGO`, pero **tampoco transfiere ni elimina los registros de `carritos`**.
  3. En ese momento, la misma reserva existe duplicada lógicamente en dos tablas: en `carritos` y en `stock_reservas`.
  4. Cuando el widget de Wompi finaliza y ejecuta su callback en el navegador (`wompi.service.ts` línea 123), el frontend llama a **`this.cartService.clearCart()` ANTES de que termine la confirmación del pago**.
  5. `clearCart()` envía `POST /api/carrito/sync` con `items: []`.
  6. `SyncCarritoAction` ve que el usuario tenía `$oldItems` en la tabla `carritos` y ahora envía `[]`, por lo que calcula `$deltaCatalogo = +$cantidad` y **DEVUELVE EL STOCK AL CATÁLOGO (`+cantidad`) aunque el pedido siga en `PENDIENTE_PAGO` o haya sido pagado**.
  7. Si posteriormente el pedido se cancela (por el usuario, por rechazo `VOIDED`/`ERROR`, o por expiración de 30 minutos), `LiberarStockReservaAction` lee `stock_reservas` y **vuelve a sumar `+$cantidad` al catálogo por segunda vez**, inflando el inventario por encima del stock real físico.

---

### Hallazgo #4: Bloqueo al reintentar el pago y ausencia de flujo de reintento directo
- **Ubicación:**
  - `Plaxtilineas/backend-laravel/app/Actions/Pedidos/CrearDraftPedidoAction.php` (líneas 35–49)
  - `Plaxtilineas/backend-laravel/app/Http/Controllers/Api/PedidoController.php` (línea 126)
  - `Plaxtilineas/frontend/src/app/pages/mis-pedidos/mis-pedidos.html` (líneas 574–604)
  - `Plaxtilineas/backend-laravel/app/Actions/Payments/CreateCheckoutAction.php` (líneas 57–70)
- **Causa raíz:**
  1. **Límite estricto de 2 pedidos pendientes incluyendo `DRAFT`:** `CrearDraftPedidoAction` bloquea al usuario si tiene `>= 2` pedidos en `[DRAFT, PENDIENTE_PAGO, PENDIENTE]`.
  2. **Pedidos `DRAFT` invisibles para el usuario:** Si un usuario entra al checkout 2 veces y retrocede (o falla la red antes de `datos-pago`), se crean 2 pedidos `DRAFT`. Pero `obtenerMisPedidos()` filtra `where('estado', '!=', EstadoPedido::DRAFT)`. El usuario queda bloqueado sin poder ver ni cancelar esos `DRAFT`.
  3. **Falta de acción "Reintentar Pago" en Mis Pedidos:** Cuando un pedido queda en `pendiente_pago` (porque el pago fue declinado o el usuario cerró el widget de Wompi), en `/mis-pedidos` solo aparecen los botones *"Ver Comprobante"*, *"Cancelar Pedido"* y *"Eliminar"*, pero **no existe un botón "Reintentar Pago / Pagar Ahora"** que regenere una referencia fresca o abra nuevamente el checkout de Wompi para esa orden.
  4. **Reutilización de referencia en Wompi tras intento fallido:** Si una referencia `wompi_referencia` ya tuvo una transacción finalizada como `DECLINED` o `ERROR` en Wompi, intentar abrir el widget con la misma referencia es rechazado por Wompi. Para reintentar el pago de un pedido `PENDIENTE_PAGO` con transacción previa fallida, debe rotarse/generarse una nueva `wompi_referencia` mantendo la trazabilidad del pedido.

---

### Hallazgo #5: Condiciones de carrera (Race Conditions) en `SyncCarritoAction`, `CancelarPedidoAction` y `LiberarStockReservaAction`
- **Ubicación:**
  - `Plaxtilineas/backend-laravel/app/Actions/Carrito/SyncCarritoAction.php` (líneas 39–126)
  - `Plaxtilineas/backend-laravel/app/Actions/Pedidos/CancelarPedidoAction.php` (líneas 24–64)
  - `Plaxtilineas/backend-laravel/app/Actions/Pedidos/LiberarStockReservaAction.php` (líneas 21–66)
- **Causa raíz:**
  1. En `SyncCarritoAction`, la lectura `Carrito::where('usuario_id', $usuario->id)->get()` no utiliza bloqueo pesimista (`lockForUpdate()`). Si el usuario pulsa `+` rápidamente varias veces en el frontend, salen múltiples peticiones `POST /api/carrito/sync` concurrentes que leen el mismo `$oldItems` y descuentan la diferencia varias veces en el catálogo.
  2. En `CartService` (frontend), `addToCart` y `updateQuantity` modifican el estado local optimísticamente, pero si `POST /api/carrito/sync` falla (ej. `409 Stock Insuficiente` porque otro usuario compró la última unidad), el bloque `error:` **no revierte la cantidad en el carrito local** ni recarga el estado real desde `GET /api/carrito`.
  3. En `LiberarStockReservaAction`, si `StockReserva` está vacío, ejecuta un bloque `else` que devuelve el stock basándose en `$pedido->items()`. Si dos procesos concurrentes (ej. doble clic en cancelar o colisión con cron) invocan la liberación sin `lockForUpdate()` sobre el `Pedido`, el primero consume `StockReserva` y el segundo entra al `else`, devolviendo el stock dos veces.
  4. En `AdminActualizarEstadoPedidoAction`, cuando un administrador cancela un pedido que ya estaba `PAGADO` (`$solicitudCliente = true`), `ConfirmarPedidoAction` ya había borrado `StockReserva`, por lo que `LiberarStockReservaAction` entra al `else` y devuelve el stock correctamente, pero debe quedar protegido dentro de una transacción con `lockForUpdate()` verificando que el estado previo no sea ya `CANCELADO`.

---

### Hallazgo #6: Stock por Producto vs Stock por Variante
- **Ubicación:**
  - `catalogo-php/catalogo-laravel/app/Http/Controllers/Api/ProductController.php` (líneas 359–360, 411)
  - `Plaxtilineas/backend-laravel/app/Services/Catalogo/CatalogoApiService.php` (líneas 289–290, 535–538)
- **Observación:**
  - Actualmente el catálogo maneja un stock global a nivel de producto (`products.stock`) y replica ese mismo número en todas las filas de `product_variants.stock` (`UPDATE product_variants SET stock = ? WHERE product_id = ?`).
  - Sin embargo, en el carrito de Plaxtilineas un usuario puede agregar **Variante A** (ej. 3 unidades) y **Variante B** (ej. 3 unidades) del mismo `producto_id` cuando el producto solo tiene `stock = 4`.
  - En el frontend (`CartService::addToCart`), el stock local se descuenta a nivel de `producto.id`, lo cual protege en memoria, pero en `PedidoController::verificarStock` cada ítem del array se validaba por separado sin acumular las cantidades de distintas variantes que comparten el mismo `producto_id`.
