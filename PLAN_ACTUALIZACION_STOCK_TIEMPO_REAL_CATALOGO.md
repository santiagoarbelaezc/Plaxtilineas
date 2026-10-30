# Especificación Técnica: Actualización de Stock en Tiempo Real sin Recargar (F5)

**Destinatario:** Agente de desarrollo / Equipo técnico del proyecto **`catalogoplaxtilineas` (`catalogoplaxtilineas.sembradoresdevida.org`)**.  
**Fecha:** 2026-10-21  
**Objetivo:** Permitir que la interfaz web del catálogo (panel administrativo y listados) actualice las cifras de inventario en pantalla de manera instantánea y automática cuando el e-commerce reserve o libere stock mediante el endpoint de integración, **sin necesidad de que el usuario recargue la página (`F5`)**.

---

## 1. Contexto de la Integración

El e-commerce (Plaxtilineas) ya se encuentra consumiendo activamente el endpoint dedicado de inventario:

```http
PUT /api/integraciones/inventario/productos/{id}
Authorization: Bearer <INVENTORY_SYNC_TOKEN>
Origin: http://localhost:4200 (o dominio de producción)
Content-Type: application/json

{"stock": 14}
```

### El Problema Actual en el Catálogo
1. Cuando el e-commerce envía esta petición `PUT`, la API del catálogo actualiza correctamente la columna `products.stock` en la base de datos MySQL.
2. Sin embargo, el administrador o usuario que se encuentra navegando en el panel del catálogo continúa viendo el stock antiguo hasta que presiona `F5` manualmente.

---

## 2. Arquitectura de la Solución: Server-Sent Events (SSE)

Para evitar dependencias complejas (como servidores Node.js, WebSockets o Redis en un hosting Apache/PHP tradicional), la solución recomendada es **Server-Sent Events (SSE)** mediante el objeto nativo del navegador `EventSource`:

1. **El e-commerce invoca el `PUT`**: La API actualiza `products.stock` y añade un registro liviano a la tabla `inventario_eventos`.
2. **El backend emite el evento**: El endpoint `GET /api/inventario/stream` transmite en tiempo real el evento `stock_update` con `{ producto_id, stock_nuevo }`.
3. **El frontend del catálogo reacciona**: El navegador escucha el flujo y actualiza el DOM de la fila del producto inmediatamente con una animación visual sutil.

---

## 3. Paso a Paso para la Implementación en el Backend (PHP)

### Paso 1: Crear tabla de eventos de inventario en MySQL
Ejecutar la siguiente instrucción SQL en la base de datos del catálogo:

```sql
CREATE TABLE IF NOT EXISTS `inventario_eventos` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `producto_id` INT NOT NULL,
  `stock_nuevo` INT NOT NULL,
  `origen` VARCHAR(50) DEFAULT 'ecommerce',
  `creado_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_creado_at` (`creado_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Paso 2: Registrar el evento en el controlador al recibir el `PUT`
En el método que procesa `PUT /api/integraciones/inventario/productos/{id}` (por ejemplo en `api/controllers/ProductController.php`):

```php
// Tras actualizar el stock del producto con UPDATE products SET stock = ? WHERE id = ?
$stmtEvento = $pdo->prepare("INSERT INTO inventario_eventos (producto_id, stock_nuevo, origen) VALUES (?, ?, 'ecommerce')");
$stmtEvento->execute([(int)$productoId, (int)$nuevoStock]);
```

### Paso 3: Crear el Endpoint SSE (`GET /api/inventario/stream`)
Registrar la ruta en el router principal (`api/index.php`) o en un controlador dedicado:

```php
<?php
// Endpoint: GET /api/inventario/stream

// 1. Cabeceras obligatorias para SSE y compatibilidad con Apache/Nginx
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache, no-transform');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // Evita buffer en LiteSpeed / Nginx
header('Access-Control-Allow-Origin: *'); // O restringido a tu frontend

// 2. Desactivar límites de tiempo de ejecución y compresión de búfer
@ini_set('zlib.output_compression', '0');
@ini_set('output_buffering', 'off');
set_time_limit(0);
ob_implicit_flush(true);

// 3. Obtener el último evento recibido por el cliente (reconexión automática de EventSource)
$lastEventId = isset($_SERVER['HTTP_LAST_EVENT_ID']) 
    ? (int)$_SERVER['HTTP_LAST_EVENT_ID'] 
    : (isset($_GET['last_id']) ? (int)$_GET['last_id'] : 0);

// Si es la primera conexión y no hay id, usar el último id actual para no saturar con histórico
if ($lastEventId === 0) {
    $stmtMax = $pdo->query("SELECT IFNULL(MAX(id), 0) AS max_id FROM inventario_eventos");
    $lastEventId = (int)$stmtMax->fetchColumn();
}

// 4. Ciclo de transmisión (hasta 25 segundos para evitar timeouts de PHP en hosting)
$inicio = time();
while (time() - $inicio < 25) {
    if (connection_aborted()) {
        break;
    }

    $stmt = $pdo->prepare("SELECT id, producto_id, stock_nuevo, creado_at FROM inventario_eventos WHERE id > ? ORDER BY id ASC");
    $stmt->execute([$lastEventId]);
    $eventos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($eventos)) {
        foreach ($eventos as $ev) {
            $lastEventId = (int)$ev['id'];
            echo "id: {$lastEventId}\n";
            echo "event: stock_update\n";
            echo "data: " . json_encode($ev) . "\n\n";
        }
        @ob_flush();
        flush();
    } else {
        // Heartbeat para mantener viva la conexión
        echo ": heartbeat\n\n";
        @ob_flush();
        flush();
    }

    // Esperar 1 segundo antes de la siguiente verificación
    sleep(1);
}
```

---

## 4. Paso a Paso para la Implementación en el Frontend del Catálogo

En la vista o script que gestiona la tabla / listado de productos del catálogo:

### Paso 1: Conexión con `EventSource`
```javascript
let streamInventario = null;

function conectarFlujoInventarioEnVivo() {
  if (streamInventario) return;

  const urlStream = 'https://catalogoplaxtilineas.sembradoresdevida.org/api/inventario/stream';
  streamInventario = new EventSource(urlStream);

  // Escuchar el evento personalizado de actualización de stock
  streamInventario.addEventListener('stock_update', function(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('[Realtime Stock] Evento recibido:', data);
      actualizarStockEnInterfaz(data.producto_id, data.stock_nuevo);
    } catch (e) {
      console.error('[Realtime Stock] Error parseando datos:', e);
    }
  });

  streamInventario.onerror = function(err) {
    console.warn('[Realtime Stock] Conexión interrumpida, EventSource reconectará automáticamente...');
  };
}

function actualizarStockEnInterfaz(productoId, nuevoStock) {
  // 1. Buscar la fila o celda del producto por atributo de datos
  const celdaStock = document.querySelector(`[data-product-id="${productoId}"] .stock-valor, #stock-prod-${productoId}`);
  
  if (celdaStock) {
    // 2. Reemplazar el número de stock en pantalla
    celdaStock.textContent = nuevoStock;

    // 3. Agregar animación de destello visual
    celdaStock.classList.remove('stock-actualizado-anim');
    void celdaStock.offsetWidth; // Forzar reflown en el navegador para reiniciar animación
    celdaStock.classList.add('stock-actualizado-anim');
  }
}

// Iniciar al cargar la página
document.addEventListener('DOMContentLoaded', conectarFlujoInventarioEnVivo);
```

### Paso 2: Optimización de Pestaña (Ahorro de batería y servidor)
```javascript
// Si el usuario cambia de pestaña o minimiza el navegador, cerrar conexión
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    if (streamInventario) {
      streamInventario.close();
      streamInventario = null;
    }
  } else {
    // Reanudar inmediatamente al volver
    conectarFlujoInventarioEnVivo();
  }
});
```

### Paso 3: Estilos CSS para el feedback visual
```css
@keyframes pulsoVerde {
  0% {
    background-color: rgba(34, 197, 94, 0.45);
    transform: scale(1.15);
    color: #15803d;
  }
  100% {
    background-color: transparent;
    transform: scale(1);
  }
}

.stock-actualizado-anim {
  animation: pulsoVerde 1.8s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 4px;
  padding: 2px 6px;
  display: inline-block;
  font-weight: 700;
}
```

---

## 5. Mantenimiento y Purga Automática de la Tabla

Para evitar que `inventario_eventos` crezca de forma innecesaria:
Añadir una rutina en el cron diario o al final del endpoint SSE:
```sql
DELETE FROM inventario_eventos WHERE creado_at < NOW() - INTERVAL 24 HOUR;
```

---

## 6. Criterios de Aceptación para el Agente

- [ ] La tabla `inventario_eventos` existe en la base de datos MySQL del catálogo.
- [ ] Al recibir un `PUT /api/integraciones/inventario/productos/{id}`, además de actualizar `products.stock`, se inserta una fila en `inventario_eventos`.
- [ ] El endpoint `GET /api/inventario/stream` responde con `Content-Type: text/event-stream` y emite eventos tipo `stock_update`.
- [ ] En el frontend del catálogo, al ejecutarse una actualización de inventario desde el e-commerce, el número de stock en la tabla cambia en tiempo real acompañado del destello visual sin tener que oprimir `F5`.
