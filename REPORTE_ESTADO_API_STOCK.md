# Reporte de estado y plan de implementación

## Objetivo

Permitir que el e-commerce actualice en tiempo real el inventario del catálogo mediante una petición `PUT` accesible desde Internet, pero limitada por:

1. Orígenes permitidos.
2. Un token de integración.
3. Permisos únicamente para actualizar stock.

> “Público” debe significar que el endpoint es alcanzable desde Internet. No debe significar que sea anónimo ni que acepte cambios completos del producto.

## 1. Estado actual de la API

### Componentes revisados

- Punto de entrada y router: `api/index.php`.
- Actualización de productos: `api/controllers/ProductController.php`.
- Autenticación: `api/middleware/AuthMiddleware.php` y `api/controllers/AuthController.php`.
- Configuración Apache y reescritura: `api/.htaccess`.
- Modelo de datos: `api/schema.sql`.
- Configuración local: `api/.env` (revisada sin incluir sus valores en este documento).

### Endpoint `PUT` existente

Actualmente existe:

```text
PUT /api/productos/{id}
```

La ruta está definida en `api/index.php`. Antes de llamar al controlador exige:

```http
Authorization: Bearer <JWT>
```

El método `updateProduct()` permite modificar varios campos, entre ellos:

- Datos generales: `name`, `slug`, `description`, `material`.
- Clasificación: `category`, `category_id`, `subcategory_id`.
- Inventario: `stock`.
- Banderas: `isNew`, `isFeatured`.
- Marca y gramaje.
- Imágenes, colores y variantes.

La actualización usa transacción para el producto y las relaciones, y el campo `products.stock` existe en el esquema. Las variantes también tienen su propio campo `product_variants.stock`.

### CORS existente

`api/index.php` ya contiene una lista explícita de orígenes permitidos, incluyendo los dominios del catálogo y dos dominios locales de desarrollo. También responde `OPTIONS` y permite `Authorization`.

Esto es útil para navegadores, pero no es un mecanismo de autenticación: un cliente que no sea navegador puede ignorar CORS. El token debe seguir siendo obligatorio.

### Autenticación existente

El login genera un JWT con duración de 24 horas. El middleware comprueba que el token tenga tres partes y que no esté vencido.

Sin embargo, el middleware actual **no verifica la firma HMAC del JWT**. Solo decodifica el payload. Por tanto, un token manipulado podría ser aceptado mientras conserve una estructura válida y una fecha de expiración válida. Esto debe corregirse antes de confiar en el JWT para una integración externa.

Además:

- Hay valores de respaldo para `JWT_SECRET` si la variable no está configurada.
- El JWT actual no contiene un permiso específico para inventario.
- El `PUT` existente entrega permisos de edición completa a quien tenga un JWT válido.
- La ruta de registro acepta el `role` enviado por el cliente, lo que debe revisarse porque permitiría solicitar un rol privilegiado.

## 2. Diagnóstico para el caso de uso del e-commerce

| Aspecto | Estado actual | Evaluación |
|---|---|---|
| Actualizar stock del producto | Posible mediante `PUT /productos/{id}` | Funciona, pero tiene demasiado alcance |
| Actualizar stock de variante | Posible dentro del arreglo `variants` | Riesgo de sobrescribir todas las variantes |
| Endpoint público por Internet | La ruta es publicable | Falta una autenticación específica de integración |
| Restricción por origen | CORS con lista blanca | Debe mantenerse, pero no reemplaza el token |
| Token requerido | JWT administrativo | No es apropiado para un sistema externo |
| Verificación criptográfica del JWT | No implementada en middleware | Bloqueador de seguridad |
| Actualización parcial de stock | No existe una ruta dedicada | Debe agregarse |
| Protección contra reintentos | No existe idempotencia ni control de versión | Recomendado para sincronización en tiempo real |
| Auditoría de cambios | No hay auditoría específica de inventario | Recomendado para trazabilidad |

## 3. Diseño recomendado

### Endpoint dedicado

Agregar una ruta de mínimo privilegio:

```text
PUT /api/integraciones/inventario/productos/{id}
```

Este endpoint ya fue implementado en `api/index.php`, con lógica en
`api/controllers/ProductController.php` y autenticación en
`api/middleware/InventoryTokenMiddleware.php`.

Para una variante, usar una ruta separada:

```text
PUT /api/integraciones/inventario/variantes/{variantId}
```

Separar producto y variante evita que una sincronización de una presentación sobrescriba accidentalmente las demás.

### Autenticación

Usar un token de integración independiente de los usuarios del panel:

```http
Authorization: Bearer <INVENTORY_SYNC_TOKEN>
Content-Type: application/json
Origin: https://dominio-del-ecommerce.example
```

Recomendación por fases:

1. **Primera versión:** token fuerte en una variable de entorno, comparación con `hash_equals()` y sin aceptarlo por query string.
2. **Evolución multi-integración:** tabla de tokens con identificador, hash del token, nombre de integración, permisos, estado, expiración y fecha de último uso. La base de datos debe guardar solo el hash, no el token en texto plano.
3. Permitir rotación con dos tokens activos durante una ventana de transición.

El token debe tener permiso exclusivo `inventory:write`. No debe reutilizarse el JWT del administrador ni los tokens de backup/sincronización existentes.

### CORS

Mantener una lista explícita, configurable por entorno:

```text
ALLOWED_ORIGINS=https://catalogoplaxtilineas.com,https://www.catalogoplaxtilineas.com
```

Reglas:

- No usar `*`.
- Normalizar origen y comparar con coincidencia exacta.
- Enviar `Access-Control-Allow-Origin` solo si el origen está autorizado.
- Mantener `Vary: Origin`.
- Responder `OPTIONS` sin modificar datos.
- No habilitar credenciales (`Access-Control-Allow-Credentials`) salvo que se necesiten cookies; el token Bearer no las requiere.
- Durante la fase de pruebas, `http://localhost:4200` permanece habilitado
  explícitamente incluso con `APP_ENV=production`. Debe retirarse cuando el
  e-commerce de pruebas deje de usarlo.

### Payload recomendado

Para producto:

```json
{
  "stock": 27,
  "version": 12,
  "event_id": "erp-2026-10-21-000123"
}
```

Reglas:

- `stock` es obligatorio, entero y mayor o igual a cero.
- Solo se modifica `products.stock`.
- No se aceptan `name`, `price`, `images`, `variants` ni otros campos en esta ruta.
- `version` es opcional en la primera entrega, pero recomendable para evitar que una actualización antigua sobrescriba una nueva.
- `event_id` permite hacer la operación idempotente cuando el proveedor reintenta una petición.

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Stock actualizado",
  "data": {
    "product_id": 123,
    "stock": 27,
    "updated_at": "2026-10-21T16:08:21Z"
  }
}
```

Errores mínimos:

- `401`: token ausente, inválido o revocado.
- `403`: origen no permitido o token sin permiso.
- `404`: producto inexistente o eliminado.
- `409`: conflicto de versión o evento duplicado incompatible.
- `422`: payload inválido.
- `429`: límite de solicitudes excedido.

## 4. Plan de implementación

### Fase 0 — Contención y preparación

1. Rotar inmediatamente las credenciales que aparecen en el `.env` local, porque ese archivo contiene secretos operativos.
2. Confirmar que `api/.env` nunca se publique ni se incluya en paquetes de despliegue.
3. Definir los orígenes reales de producción del e-commerce.
4. Generar un token de integración aleatorio de mínimo 32 bytes.
5. Configurar producción con `APP_ENV=production`.
6. Eliminar valores secretos de respaldo inseguros y fallar explícitamente si falta una variable crítica.

### Fase 1 — Middleware de integración

1. Crear un middleware dedicado, por ejemplo `InventoryTokenMiddleware`.
2. Leer el token únicamente desde `Authorization: Bearer`.
3. Comparar de forma constante con `hash_equals()`.
4. No registrar el token ni el header `Authorization`.
5. Devolver `401` de forma uniforme y sin detalles sensibles.
6. Añadir permiso lógico `inventory:write`.
7. Añadir rate limit por token e IP en el servidor o en el proxy de producción.

### Fase 2 — Endpoint de stock de producto

1. Añadir `PUT /integraciones/inventario/productos/{id}` al router.
2. Ejecutar CORS antes del router, pero exigir el token después.
3. Validar que el cuerpo sea JSON y que solo contenga los campos permitidos.
4. Consultar el producto activo.
5. Actualizar solo `products.stock`, usando una consulta preparada.
6. Devolver el stock persistido y la fecha de actualización.
7. Mantener el `PUT /productos/{id}` para el panel administrativo, sin cambiar su propósito.

### Fase 3 — Variantes e idempotencia

1. Añadir una ruta específica para `product_variants.stock`.
2. Validar que la variante pertenezca al producto cuando se envíen ambos identificadores.
3. Agregar una tabla de eventos procesados si el proveedor reintenta mensajes.
4. Implementar control optimista mediante `updated_at` o un campo `version`.
5. Definir si el stock del producto es independiente o si se calcula como suma de variantes. No deben coexistir dos fuentes de verdad sin una regla explícita.

### Fase 4 — Observabilidad y operación

1. Registrar fecha, producto/variante, resultado, integración y request id.
2. Nunca registrar tokens, contraseñas ni cuerpos completos que puedan contener secretos.
3. Añadir endpoint o métrica interna para revisar errores de sincronización.
4. Documentar rotación y revocación del token.
5. Configurar alertas ante muchos `401`, `403`, `409` o `429`.

### Fase 5 — Pruebas y despliegue gradual

1. Probar localmente con un origen autorizado y uno no autorizado.
2. Probar ausencia, formato incorrecto y token inválido.
3. Probar stock cero, entero válido, decimal, texto, negativo y valor excesivamente grande.
4. Confirmar que el endpoint dedicado no cambia nombre, precio, imágenes, colores ni variantes.
5. Probar producto inexistente, producto eliminado y variante ajena.
6. Probar reintentos y concurrencia.
7. Desplegar primero con un token de prueba y habilitar el proveedor real después de revisar logs.

## 5. Configuración para pruebas

Agregar en el `.env` del servidor, sin subirlo al repositorio:

```text
INVENTORY_SYNC_TOKEN=<token-aleatorio-de-minimo-32-caracteres>
```

La petición de prueba debe usar:

```http
PUT /api/integraciones/inventario/productos/123
Origin: http://localhost:4200
Authorization: Bearer <INVENTORY_SYNC_TOKEN>
Content-Type: application/json
```

```json
{"stock": 27}
```

El token nunca debe quedar dentro del código JavaScript del navegador si ese
cliente se distribuye públicamente. Para producción, lo ideal es que la
sincronización ocurra desde el backend del e-commerce.

## 6. Criterios de aceptación

- Una petición desde un origen permitido y con token válido actualiza el stock persistido.
- Una petición sin token recibe `401`.
- Una petición con token incorrecto recibe `401`.
- Una petición desde un origen no permitido no recibe `Access-Control-Allow-Origin` y no modifica datos.
- El endpoint dedicado no permite cambiar ningún campo distinto del stock.
- `OPTIONS` nunca modifica datos.
- El token no aparece en logs, respuestas, URLs ni repositorio.
- Dos actualizaciones concurrentes no pueden sobrescribirse silenciosamente si se habilita control de versión.
- El `PUT` administrativo existente continúa funcionando para el panel con sus permisos actuales.

## 7. Decisión recomendada

No exponer el `PUT /api/productos/{id}` actual al e-commerce con permisos administrativos. La opción más segura y clara es:

1. Mantener el `PUT` actual para el panel.
2. Crear un `PUT` dedicado para inventario.
3. Protegerlo con un token de integración independiente.
4. Restringir CORS a los dominios reales.
5. Corregir la verificación de firma JWT y retirar secretos de respaldo antes del despliegue.
6. Empezar actualizando `products.stock` y añadir variantes en una segunda etapa, después de definir la fuente de verdad del inventario.

## Archivos relevantes

- [api/index.php](api/index.php)
- [api/controllers/ProductController.php](api/controllers/ProductController.php)
- [api/middleware/AuthMiddleware.php](api/middleware/AuthMiddleware.php)
- [api/controllers/AuthController.php](api/controllers/AuthController.php)
- [api/schema.sql](api/schema.sql)
- [api/.htaccess](api/.htaccess)
- [api/.env.example](api/.env.example)
