# 🛠️ Plan de Implementación: Corrección Integral de Stock, Carrito, Caché y Reintentos de Pago

Este documento detalla el plan técnico paso a paso para solucionar todos los hallazgos detectados entre **`Plaxtilineas`** y **`catalogo-php` (`catalogo-laravel`)**, garantizando los 14 Casos de Uso planteados.

---

## 📦 Fase 1: Sincronización de Caché y Eventos en Tiempo Real (`Plaxtilineas` ↔ `catalogo-laravel`)

### 1.1. Alinear el contrato de `/api/inventario/cambios` en `Plaxtilineas` Frontend
- **Archivo:** `Plaxtilineas/frontend/src/app/services/catalogo.service.ts`
- **Cambios:**
  - En `sincronizarCambiosInventario()`, cambiar el parámetro query de `?desde=${this.ultimoEventoId}` a `?since_id=${this.ultimoEventoId}` (soportando también en `catalogo-laravel` ambos parámetros `since_id` y `desde` por retrocompatibilidad).
  - Leer correctamente `res.data.events` (con fallback a `res.data.eventos`), `res.data.last_id` (con fallback a `res.data.ultimo_evento_id`) y manejar `res.data.reset`.
  - En `procesarEventoInventario(raw)`, leer `Number(raw.stock_nuevo ?? raw.stock)` para actualizar inmediatamente el stock del producto y sus variantes en memoria y en `localStorage`/`sessionStorage`.

### 1.2. Retrocompatibilidad e Invalidación en `catalogo-laravel`
- **Archivo:** `catalogo-php/catalogo-laravel/app/Http/Controllers/Api/InventoryController.php`
- **Cambios:**
  - Aceptar `$request->query('since_id') ?? $request->query('desde')` para que cualquier cliente reciba los eventos sin fallar.
- **Archivo:** `Plaxtilineas/backend-laravel/app/Services/Catalogo/CatalogoApiService.php`
- **Cambios:**
  - Agregar caché de respaldo de corta duración / snapshot en `getProductos()` y `getProducto()` para tolerar micro-cortes, pero enviando cabecera `Cache-Control: no-cache` cuando se consulta desde `verificarStockYPrecio()`.
  - Asegurar que cuando se actualice el stock por el fallback de BD (`ajustarStockDirectoEnBaseDatos`), también se invoque un endpoint o incremento de versión de caché para que `CatalogCacheService` no sirva stock antiguo.

---

## 🛒 Fase 2: Blindaje del Carrito y Concurrencia (`SyncCarritoAction` & `CartService`)

### 2.1. Bloqueo Pesimista y Agrupación en `SyncCarritoAction`
- **Archivo:** `Plaxtilineas/backend-laravel/app/Actions/Carrito/SyncCarritoAction.php`
- **Cambios:**
  - Dentro de `DB::transaction`, bloquear al usuario (`Usuario::where('id', $usuario->id)->lockForUpdate()->first()`) y las filas de `Carrito::where('usuario_id', $usuario->id)->lockForUpdate()->get()`.
  - Esto serializa peticiones concurrentes del mismo usuario (ej. múltiples clics rápidos en `+` o `-`) evitando que dos requests paralelos lean el mismo `$oldItems` y descuenten dos veces del catálogo.

### 2.2. Reversión Automática en `CartService` ante Error del Servidor y Limpieza Local sin Descuento Falso
- **Archivo:** `Plaxtilineas/frontend/src/app/services/cart.service.ts`
- **Cambios:**
  - Guardar una copia del estado previo antes de mutar optimísticamente, o recargar desde `GET /api/carrito` cuando `POST /api/carrito/sync` responda error (`409` / `422` / `500`), restaurando el stock local y mostrando el mensaje exacto del backend (`err?.error?.message || err?.error?.error`).
  - Crear el método **`clearLocalCartAfterCheckout()`**: limpia `itemsSubject` y `localStorage` cuando el carrito ya fue convertido en un Pedido en el backend, **sin** llamar a `ajustarStockLocal(+cantidad)` ni enviar `POST /api/carrito/sync` con `items: []`.

---

## 🧾 Fase 3: Corrección del Flujo de Checkout y Reserva Única (`PedidoController`, `CrearDraftPedidoAction`, `CreateCheckoutAction`)

### 3.1. Descontar lo ya reservado por el propio carrito en `PedidoController::verificarStock`
- **Archivo:** `Plaxtilineas/backend-laravel/app/Http/Controllers/Api/PedidoController.php`
- **Cambios:**
  - En `verificarStock(Request $request)`:
    1. Obtener el carrito actual del usuario autenticado (`Carrito::where('usuario_id', $user->id)->get()`) y sumar las unidades ya reservadas por `producto_id` (`$carritoPorProducto`).
    2. Agrupar los ítems solicitados en el request por `producto_id` (para cubrir correctamente múltiples variantes que comparten el stock del mismo producto).
    3. Calcular `$cantidadAdicional = max(0, $cantidadTotalProducto - $yaReservado)`.
    4. Validar con `$this->catalogo->verificarStockYPrecio($productoId, $varianteId, $cantidadAdicional)`.
  - **Efecto:** Si un producto tenía 1 unidad y el usuario la tiene en su carrito, al ir a pagar `$cantidadAdicional` es `0` y el sistema le permite pagar sin bloquearlo.

### 3.2. Reutilización de `DRAFT` y Transferencia Limpia `Carrito` → `StockReserva`
- **Archivo:** `Plaxtilineas/backend-laravel/app/Actions/Pedidos/CrearDraftPedidoAction.php`
- **Cambios:**
  - Si el usuario ya tiene un pedido en estado `DRAFT`, reutilizarlo o eliminarlo limpiamente antes de contar los pedidos pendientes, para que el usuario **nunca quede bloqueado** si retrocede del checkout al carrito varias veces.
  - Cuando se crea el pedido y se registran sus filas en `StockReserva`, **transferir inmediatamente la reserva desde `Carrito` eliminando `Carrito::where('usuario_id', $user->id)->delete()`** dentro de la misma transacción para todos los métodos de pago (incluyendo Wompi).
  - De esta forma, a partir de la creación del pedido, la reserva vive **únicamente en `StockReserva`** (y ya no en `Carrito`).
- **Archivos Frontend:** `pago.component.ts`, `wompi.service.ts`, `pago-exitoso.component.ts`
  - Reemplazar las llamadas a `this.cartService.clearCart()` posteriores a la creación del pedido por `this.cartService.clearLocalCartAfterCheckout()`.
  - **Efecto:** Cuando el widget de Wompi abre o termina, el frontend limpia el carrito local sin enviar `POST /api/carrito/sync` vacío y sin devolver el stock al catálogo por error.

---

## 🔄 Fase 4: Cancelación Segura y Reintento de Pago sin Bloqueo

### 4.1. Idempotencia Estricta en `CancelarPedidoAction`, `EliminarPedidoAction` y `LiberarStockReservaAction`
- **Archivos:**
  - `Plaxtilineas/backend-laravel/app/Actions/Pedidos/CancelarPedidoAction.php`
  - `Plaxtilineas/backend-laravel/app/Actions/Pedidos/EliminarPedidoAction.php`
  - `Plaxtilineas/backend-laravel/app/Actions/Pedidos/LiberarStockReservaAction.php`
  - `Plaxtilineas/backend-laravel/app/Actions/Pedidos/AdminActualizarEstadoPedidoAction.php`
- **Cambios:**
  - En `CancelarPedidoAction` y `EliminarPedidoAction`, adquirir bloqueo pesimista `Pedido::where('id', $pedidoId)->lockForUpdate()->first()` **dentro** de `DB::transaction` antes de verificar el estado y antes de llamar a `LiberarStockReservaAction`.
  - En `LiberarStockReservaAction`:
    - Si existen registros en `StockReserva` para el pedido (`$reservas->isNotEmpty()`), devolver exactamente esas cantidades al catálogo y borrar las filas de `StockReserva`.
    - El fallback `else` (devolver stock desde `$pedido->items()`) **solo** se debe ejecutar si el pedido estaba en un estado pagado (`PAGADO`, `CONFIRMADO`, `EN_PREPARACION`) y está siendo cancelado expresamente por un administrador a solicitud del cliente. Para pedidos `DRAFT` / `PENDIENTE_PAGO` cuyas reservas ya fueron consumidas, no se vuelve a ejecutar el `else`, garantizando **cero inflación de stock**.

### 4.2. Reintentar Pago en Wompi desde "Mis Pedidos" sin Bloqueos
- **Archivo Backend:** `Plaxtilineas/backend-laravel/app/Actions/Payments/CreateCheckoutAction.php`
- **Cambios:**
  - Si el pedido está en `PENDIENTE_PAGO` y ya tiene un `wompi_transaction_id` registrado (o si se solicita reintentar pago tras un intento declinado/cerrado), **rotar `wompi_referencia`** generando una nueva referencia fresca `PLX-{timestamp}-{random4}` antes de firmar con SHA-256. Esto evita que Wompi bloquee el widget por referencia ya utilizada.
  - Verificar que el pedido tenga su `StockReserva` activa; si había expirado pero el pedido sigue `PENDIENTE_PAGO`, revalidar y reservar el stock.
- **Archivos Frontend:**
  - `Plaxtilineas/frontend/src/app/pages/mis-pedidos/mis-pedidos.ts`
  - `Plaxtilineas/frontend/src/app/pages/mis-pedidos/mis-pedidos.html`
- **Cambios:**
  - Agregar el botón **"Pagar Ahora / Reintentar Pago"** en las tarjetas de pedidos con estado `pendiente_pago` y `metodo_pago === 'wompi'`.
  - Al pulsarlo, invocar `wompiService.obtenerDatosPago(pedido.id)` y abrir el widget de Wompi (`wompiService.abrirWidget(datos)`) directamente desde *"Mis Pedidos"*, permitiendo completar el pago en un clic sin tener que cancelar ni volver a armar el carrito.

---

## ✅ Fase 5: Plan de Pruebas y Verificación

1. **Tests Automatizados (Pest / PHPUnit en `Plaxtilineas/backend-laravel` y `catalogo-laravel`):**
   - Test de compra de última unidad (`stock = 1`): agregar al carrito -> `verificarStock` -> `crearDraft` -> `datosPago` -> `ConfirmarPedidoAction` -> stock final `= 0`.
   - Test de cancelación de pedido: `stock = 5` -> agregar 2 al carrito (`stock = 3`) -> crear pedido (`stock = 3`) -> limpiar carrito post-checkout (`stock` sigue en `3`, NO sube a `5`) -> cancelar pedido (`stock` vuelve exactamente a `5`, NO a `7`).
   - Test de reintento de pago tras `DECLINED`: pedido en `PENDIENTE_PAGO` con `wompi_transaction_id` previo -> llamar a `/api/wompi/datos-pago` -> genera nueva `wompi_referencia` y firma válida -> confirmar pago -> estado `PAGADO`.
   - Test de `/api/inventario/cambios` con `?since_id=` y `?desde=`.
