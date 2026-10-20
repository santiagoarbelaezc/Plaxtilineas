# Backend del Carrito — Especificación

Estado actual: **el carrito vive 100% en el frontend** (`localStorage` → `plaxtilineas_cart`).
La sincronización con backend está apagada con `CartService.BACKEND_SYNC_ENABLED = false`
([cart.service.ts](../frontend/src/app/services/cart.service.ts)). Este documento define cómo
debe ser el backend para encenderla.

---

## 1. Principios

1. **El catálogo es la fuente de verdad del precio y stock.** El frontend manda solo `producto_id`,
   `variante_id` y `cantidad`. El backend **recalcula** precio, subtotal, envío y total. Nunca se confía en `precio_unitario` del cliente.
2. **El carrito NO descuenta stock.** El implementado hoy (`CarritoController::sync`) hace
   `UPDATE productos SET stock = stock - ?` al agregar → un carrito abandonado bloquea inventario.
   Descontar stock solo al crear el pedido (`stock_reservas` con expiración) y confirmarlo al pagar.
3. **Frontend primero, backend como respaldo.** El carrito funciona sin sesión; al iniciar
   sesión se hace *merge* con el carrito del servidor.
4. **Login solo para finalizar** (checkout, captcha, Wompi).

---

## 2. Modelo de datos

```sql
-- Un carrito activo por usuario
CREATE TABLE carritos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT NOT NULL UNIQUE,
  estado        ENUM('activo','convertido','abandonado') NOT NULL DEFAULT 'activo',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Detalle del carrito = el producto del catálogo convertido en línea
CREATE TABLE carrito_items (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  carrito_id       INT NOT NULL,
  producto_id      INT NOT NULL,
  variante_id      INT NULL,
  cantidad         INT NOT NULL CHECK (cantidad > 0),
  -- Snapshot informativo (se refresca en cada lectura con el catálogo vigente)
  nombre           VARCHAR(255) NOT NULL,
  variante_nombre  VARCHAR(255) NULL,
  sku              VARCHAR(100) NULL,
  imagen_url       VARCHAR(500) NULL,
  precio_unitario  DECIMAL(12,2) NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_item (carrito_id, producto_id, variante_id),
  FOREIGN KEY (carrito_id) REFERENCES carritos(id) ON DELETE CASCADE,
  INDEX idx_producto (producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> La tabla `carritos` actual guarda una fila por producto (`usuario_id`, `producto_id`, `cantidad`).
> Migrar a cabecera + `carrito_items` y eliminar `limpiarCarritosExpirados` que devuelve stock.

### Mapeo frontend → backend

| Frontend (`CartItem.detalle`) | Columna `carrito_items` |
|---|---|
| `producto_id` | `producto_id` |
| `variante_id` | `variante_id` |
| `cantidad` | `cantidad` |
| `nombre` / `variante_nombre` | `nombre` / `variante_nombre` |
| `sku`, `imagen_url` | `sku`, `imagen_url` |
| `precio_unitario` | `precio_unitario` (**solo informativo**, se recalcula) |
| `categoria`, `material`, `marca`, `slug`… | no se guardan; se obtienen del catálogo al leer |

---

## 3. Endpoints

Base: `/api`. Autenticación: `Authorization: Bearer <JWT>` (excepto verificar-stock).

### `GET /carrito`
Devuelve el carrito del usuario ya **validado contra el catálogo**.

```json
{
  "items": [
    {
      "producto_id": 12, "variante_id": 3, "cantidad": 2,
      "nombre": "Cuerina Premium", "variante_nombre": "Negro",
      "sku": "CUE-001", "imagen_url": "https://...",
      "unidad": "metro",
      "precio_unitario": 18500.00, "subtotal": 37000.00,
      "stock_disponible": 40, "minimo_compra": 1,
      "avisos": ["precio_actualizado"]
    }
  ],
  "resumen": { "subtotal": 37000.00, "iva": 0, "envio": 10000, "total": 47000.00 },
  "actualizado_en": "2026-10-19T18:30:00Z"
}
```

`avisos` posibles: `precio_actualizado`, `stock_insuficiente`, `producto_no_disponible`, `bajo_minimo_compra`.

### `PUT /carrito`  (reemplaza `POST /carrito/sync`)
Sincroniza el carrito completo (idempotente). Body:

```json
{ "items": [ { "producto_id": 12, "variante_id": 3, "cantidad": 2 } ] }
```

Reglas:
- Agrupar duplicados por `(producto_id, variante_id)`.
- Validar `cantidad >= minimo_compra`, `cantidad <= stock` si `controlar_stock = 1`.
- Items inválidos **no abortan todo**: se devuelven en `items_con_error`.
- **No modificar `productos.stock`.**
- Respuesta: igual que `GET /carrito`.

### `POST /carrito/items`
Agrega/incrementa un item. Body: `{ "producto_id", "variante_id", "cantidad" }`. `201` con el carrito.

### `PATCH /carrito/items/{id}`
Body `{ "cantidad": 3 }`. `cantidad = 0` elimina el item.

### `DELETE /carrito/items/{id}` · `DELETE /carrito`
Elimina un item / vacía el carrito. `204`.

### `POST /carrito/merge`
Se llama **una vez tras el login**: recibe el carrito local y lo fusiona con el del servidor
(suma cantidades, tope por stock). Devuelve el carrito final; el frontend lo pisa en `localStorage`.

### `POST /productos/verificar-stock` (ya existe)
Público. Body `{ "items": [ { "producto_id", "variante_id", "cantidad" } ] }` →
`{ "valido": bool, "items_con_error": [ { "producto_id", "nombre", "error" } ] }`.

---

## 4. Checkout (convertir carrito → pedido)

`POST /pedidos/draft` (ya existe, usado por `CartSummaryComponent.confirmarPedido`):

1. Validar JWT + **captcha** (`captchaId`, `captchaCode`).
2. Releer items **desde el carrito del servidor** (o del body, pero recalculando precios).
3. Dentro de una transacción:
   - `SELECT ... FOR UPDATE` de productos → validar stock.
   - Insertar `pedidos` + `pedido_items` (con `nombre_producto`, `precio_unitario` y `subtotal` congelados).
   - Insertar `stock_reservas` con `expira_at = NOW() + 30 min`.
   - Marcar `carritos.estado = 'convertido'` (o vaciar items) **solo al confirmar pago**, no al crear el draft.
4. Responder `{ pedido_id, codigo_pedido, total }`.
5. Wompi: webhook confirma pago → descuenta stock definitivo y borra reservas;
   si expira o falla → liberar reserva.

Costos: `envio` hoy es tarifa plana `10000` (`CartService.getCostoEnvio`). Moverlo a
`configuraciones` y calcularlo en el backend; el frontend solo lo muestra.

---

## 5. Seguridad y validación

- JWT obligatorio en todo `/carrito*`; el `usuario_id` sale del token, nunca del body.
- Rate limit: 60 req/min por usuario en `/carrito*`.
- Límites: máx. 50 líneas por carrito, `cantidad` 1–9999, enteros.
- Prepared statements (PDO) siempre; sanitizar `nombre` al guardar snapshot.
- Respuestas de error uniformes con `ResponseHandler::error(msg, code)`:
  `400` validación · `401` sin sesión · `404` producto inexistente · `409` conflicto de stock.
- Registrar con `Logger` los fallos de stock y de merge.

## 6. Jobs / mantenimiento

- Cron cada 15 min: borrar `stock_reservas` expiradas.
- Cron diario: carritos `activo` sin `updated_at` en 30 días → `abandonado` (sin tocar stock).
- (Opcional) Email/WhatsApp de carrito abandonado con `abandonado` + usuario con teléfono.

## 7. Plan de activación en el frontend

1. Implementar y probar `GET/PUT /carrito`, `POST /carrito/merge`.
2. En `AuthService`, tras login exitoso → llamar `merge` con `plaxtilineas_cart`.
3. Poner `BACKEND_SYNC_ENABLED = true` y apuntar `syncCartWithBackend` a `PUT /carrito` (payload sin `precio_unitario`).
4. En el cart-summary, mostrar `avisos` del servidor (precio cambiado, stock insuficiente).
5. Eliminar `CarritoController::limpiarCarritosExpirados` y la deducción de stock en `sync`.

## 8. Tests mínimos

| Caso | Esperado |
|---|---|
| Agregar producto sin stock | `409`, item en `items_con_error` |
| Cantidad < `minimo_compra` | `400` |
| Precio manipulado en el body | Se ignora; total del servidor manda |
| Merge con item repetido | Cantidades se suman, tope por stock |
| Carrito abandonado | No altera `productos.stock` |
| Draft + pago fallido | Reserva liberada al expirar |
