# Guía de Implementación: Webhooks y Estándares de Seguridad para la Pasarela de Pago Wompi

La integración robusta de una pasarela de procesamiento de pagos requiere desacoplar por completo la experiencia visual del pagador en el navegador respecto al canal de confirmación financiera y actualización de órdenes en el backend. En la infraestructura de Wompi, el mecanismo principal para garantizar la finalización legítima de una compra es la entrega asíncrona de eventos vía Webhooks, respaldada por políticas criptográficas estrictas de firma de integridad y segregación de credenciales.

Este documento técnico consolida la especificación para implementar el receptor de eventos en el servidor, junto con la totalidad de normas de seguridad, directrices de hashing y buenas prácticas documentadas por Wompi para asegurar la trazabilidad y la inviolabilidad de las transacciones.

---

## 1. Arquitectura de Webhooks y Procesamiento Asíncrono de Eventos

El ciclo transaccional en comercio electrónico está expuesto a desconexiones de red, bloqueos del navegador o cierres intempestivos de pestañas antes de que el usuario regrese a la tienda. Por este motivo, la confirmación de una transacción nunca debe depender del retorno del cliente a la interfaz web, sino de la comunicación directa servidor a servidor que ejecuta Wompi a través de su arquitectura de eventos.

### 1.1 Configuración de la URL de Eventos en el Dashboard de Comercios

Para habilitar la recepción automatizada de notificaciones, el comercio debe registrar su punto de enlace (endpoint HTTP/HTTPS) en la consola administrativa de Wompi:

1. Ingresar al Dashboard de Comercios de Wompi con las credenciales asignadas al negocio.
2. Navegar al menú lateral y seleccionar la sección Desarrolladores, accediendo a la pestaña de configuración técnica.
3. Localizar el campo URL de Eventos dentro del módulo de configuración para desarrolladores.
4. Definir la URL pública y segura de tu servidor encargada de procesar las peticiones entrantes.
5. Guardar los cambios. Es indispensable configurar URLs diferenciadas para el entorno de pruebas (Sandbox) y el entorno de producción para prevenir colisiones de datos.

### 1.2 Recepción del Evento `transaction.updated` y Estructura del Payload

Cada vez que una transacción procesada por medio del Widget, Web Checkout, API de pagos o Links de pago alcanza un estado definitivo, Wompi despacha de manera automática una petición HTTP por método POST hacia la URL de Eventos configurada. El evento principal encargado de notificar cambios de estado en transacciones financieras se denomina `transaction.updated`.

El cuerpo del mensaje consiste en un objeto JSON estructurado que encapsula los metadatos del evento y los datos íntegros del pago. A continuación se ilustra la estructura representativa del payload entregado por la pasarela:

```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "01-1531231271-19365",
      "amount_in_cents": 2490000,
      "reference": "sk8-438k4-xmxm392-sn2m",
      "currency": "COP",
      "payment_method_type": "CARD",
      "status": "APPROVED",
      "status_message": null,
      "shipping_address": null,
      "redirect_url": "https://mitienda.com.co/pagos/respuesta",
      "payment_link_id": null,
      "customer_data": {
        "full_name": "Lola Flores",
        "phone_number": "3040777777"
      },
      "created_at": "2023-06-09T20:25:00.000Z",
      "finalized_at": "2023-06-09T20:25:30.000Z"
    }
  },
  "environment": "production",
  "signature": {
    "properties": [
      "transaction.id",
      "transaction.status",
      "transaction.amount_in_cents"
    ],
    "checksum": "a8f5c3b2e1d0987654321fedcba0987654321fedcba0987654321fedcba09876"
  },
  "timestamp": 1686342330,
  "sent_at": "2023-06-09T20:25:31.000Z"
}
```

### 1.3 Validación de Estados y Ciclo Transaccional

El atributo `status` contenido dentro del objeto `transaction` define la acción financiera que el sistema del comercio debe registrar. Los estados reportados por la plataforma son:

*   **`APPROVED`**: La transacción fue autorizada y debitada con éxito. En este punto el comercio procede a liberar los bienes, emitir facturación y actualizar la orden a estado pagado.
*   **`DECLINED`**: La transacción fue rechazada por el banco emisor, la franquicia o las reglas de riesgo. La orden debe marcarse como fallida o permitir al usuario reintentar el pago.
*   **`VOIDED`**: La transacción fue anulada.
*   **`ERROR`**: Se presentó un inconveniente técnico o validación anómala durante el procesamiento en la red bancaria.

### 1.4 Conciliación en Servidor: Consulta a la API de Transacciones

Para mitigar riesgos de suplantación en el endpoint del webhook o ataques donde un agente malicioso intente inyectar notificaciones simuladas, el backend del comercio debe complementar la recepción del webhook consultando de forma activa la API oficial de Wompi.

Al recibir la notificación con el identificador `data.transaction.id`, el servidor backend realiza una petición GET hacia el endpoint de transacciones:

*   En Sandbox: `https://sandbox.wompi.co/v1/transactions/<ID_TRANSACCION>`
*   En Producción: `https://production.wompi.co/v1/transactions/<ID_TRANSACCION>`

El comercio compara que los valores retornados por la API directa coincidan con los datos del webhook y con los registros internos de la base de datos:

*   El identificador único `id` de la transacción.
*   La referencia de pago interna (`reference`), confirmando que corresponda a una orden abierta y no pagada previamente.
*   El monto total en centavos (`amount_in_cents`), verificando que no haya sufrido alteraciones.
*   La moneda (`currency`), la cual debe ser estrictamente `COP`.
*   El estado definitivo (`status == 'APPROVED'`).

### 1.5 Protocolo de Confirmación HTTP e Idempotencia

El endpoint del webhook en el comercio debe responder de manera expedita con un código de estado `HTTP 200 OK` tan pronto procesa la notificación. Si el servidor de Wompi no recibe una confirmación exitosa en un periodo predeterminado, la pasarela ejecuta políticas automáticas de reintento de eventos para garantizar la entrega.

Por este motivo, el backend del comercio debe implementar una estrategia de **idempotencia**:

1. Registrar el `transaction.id` y el estado procesado en la base de datos de órdenes.
2. Si Wompi reenvía el mismo evento minutos más tarde debido a latencia en la red, el sistema debe comprobar si el identificador de transacción ya fue procesado.
3. Si la transacción ya se encuentra registrada como `APPROVED`, el sistema responde de inmediato con `HTTP 200 OK` sin duplicar el despacho de inventario, ni generar doble facturación.

---

## 2. Normas y Estándares Obligatorios de Seguridad de la Pasarela

El cumplimiento de los estándares de seguridad en Wompi previene el fraude, protege la confidencialidad de los datos bancarios de los pagadores y asegura la inalterabilidad de los fondos recaudados. Las siguientes normas deben ser implementadas sin excepción en toda integración.

### 2.1 Segregación de Ambientes y Custodia de Llaves de Autenticación

Wompi provee pares de llaves criptográficas específicas para vincular el comercio. La manipulación de estas llaves está sujeta a reglas estrictas de entorno y contexto de ejecución:

| Tipo de Llave | Prefijo Sandbox | Prefijo Producción | Contexto de Uso Permitido | Nivel de Exposición |
| :--- | :--- | :--- | :--- | :--- |
| **Llave Pública** | `pub_test_` | `pub_prod_` | Frontend (Widget, Web Checkout, tokenización de tarjetas vía API) | Pública (visible en código HTML y JavaScript del cliente) |
| **Llave Privada** | `prv_test_` | `prv_prod_` | Backend (Creación de links de pago vía API, conciliación y operaciones administrativas) | Estrictamente confidencial (solo servidor) |
| **Secreto de Integridad** | `test_integrity_` | `prod_integrity_` | Backend (Cálculo del hash SHA-256 para firmas de integridad) | Estrictamente confidencial (solo servidor) |

Reglas obligatorias de administración de credenciales:

*   **Aislamiento de entornos**: Las transacciones simuladas en desarrollo y pruebas deben ejecutarse exclusivamente con llaves `pub_test_` y `prv_test_`. Las llaves de producción (`pub_prod_` y `prv_prod_`) operan dinero real y solo deben activarse al salir al aire.
*   **Prohibición de exposición de la llave privada**: Jamás debe incluirse la llave privada en scripts del lado del cliente, repositorios públicos, aplicaciones móviles desprotegidas o código JavaScript de frontend.
*   **Separación del secreto de integridad**: El secreto de integridad es un valor totalmente independiente de la llave privada y de la llave pública. No debe confundirse ni intercambiarse con los demás tokens de acceso.

### 2.2 Generación Obligatoria de la Firma de Integridad (`signature:integrity`)

Para evitar ataques de manipulación de parámetros (donde un usuario malintencionado intente alterar el valor a pagar o la moneda en el navegador antes de someter el formulario), Wompi exige la creación de un hash criptográfico SHA-256.

La firma de integridad garantiza que los datos presentados a la pasarela coinciden con los autorizados por el comercio en su servidor.

#### Algoritmo de Concatenación

El hash se construye concatenando valores específicos en un orden estricto. La cadena a procesar varía según la presencia de la fecha de expiración:

**Caso A: Transacción estándar (sin fecha de expiración):**
$$\text{Cadena} = \text{Referencia} + \text{MontoEnCentavos} + \text{Moneda} + \text{SecretoIntegridad}$$

**Caso B: Transacción con fecha de expiración (`expiration-time`):**
$$\text{Cadena} = \text{Referencia} + \text{MontoEnCentavos} + \text{Moneda} + \text{FechaExpiracion} + \text{SecretoIntegridad}$$

#### Reglas de los Parámetros del Hash

*   **Referencia (`reference`)**: Código alfanumérico o numérico único de pago asignado a la transacción.
*   **Monto en centavos (`amount-in-cents`)**: El valor exacto a cobrar expresado en centavos. Si la orden tiene un costo de \$95.000 COP, el valor ingresado es `9500000`. Si es de \$24.900 COP, el valor es `2490000`.
*   **Moneda (`currency`)**: Debe ser obligatoriamente la cadena literal `COP`.
*   **Fecha de expiración (`expiration-time`)**: Formato estricto ISO 8601 con zona horaria UTC (ejemplo: `2023-06-09T20:28:50.000Z`).
*   **Secreto de integridad**: El valor obtenido en el Dashboard en la sección Desarrolladores > Secretos para integración técnica.

#### Implementación del Hash en el Servidor

El cálculo del hash debe realizarse invariablemente en el servidor backend para no exponer el secreto de integración. A continuación se presentan implementaciones oficiales validadas:

**Python 3:**
```python
import hashlib

cadena_concatenada = f"{referencia}{monto_en_centavos}{moneda}{secreto_integridad}"
hash_sha256 = hashlib.sha256(cadena_concatenada.encode('utf-8')).hexdigest()
```

**Node.js / JavaScript (Backend):**
```javascript
const crypto = require('crypto');

const cadenaConcatenada = `${referencia}${montoEnCentavos}${moneda}${secretoIntegridad}`;
const hashSha256 = crypto.createHash('sha256').update(cadenaConcatenada).digest('hex');
```

**PHP:**
```php
$cadenaConcatenada = $referencia . $montoEnCentavos . $moneda . $secretoIntegridad;
$hashSha256 = hash('sha256', $cadenaConcatenada);
```

**Ruby:**
```ruby
require 'digest'

cadena_concatenada = "#{referencia}#{monto_en_centavos}#{moneda}#{secreto_integridad}"
hash_sha256 = Digest::SHA2.hexdigest(cadena_concatenada)
```

El valor hexadecimal resultante se suministra a la pasarela en el atributo `data-signature:integrity` (en el Widget HTML) o en el campo oculto `signature:integrity` (en el formulario Web Checkout).

### 2.3 Desacoplamiento de la URL de Redirección y Prohibición de Consultas Frontend

La integración dispone de un parámetro opcional denominado `redirect-url` que define el sitio al que Wompi redirige el navegador del cliente tras completar el flujo de pago, adjuntando el identificador de la transacción como parámetro de consulta.

Directrices mandatorias de seguridad sobre la redirección:

*   **Uso estrictamente informativo**: La URL de respuesta en el frontend debe limitarse a mostrar un mensaje de agradecimiento o estado preliminar al comprador.
*   **No validación transaccional en cliente**: Está expresamente prohibido aprobar órdenes, descontar inventario o despachar productos basándose en la llamada o los parámetros recibidos en la URL de redirección. Un usuario puede modificar los parámetros de la URL, falsificar el identificador o simular el retorno al comercio.
*   **Consulta deshabilitada en frontend**: La documentación oficial de Wompi establece de manera explícita que la consulta de transacciones hacia la API pública desde el frontend ya no está soportada. Toda verificación del estado de un pago debe canalizarse mediante Webhooks en el servidor backend.

### 2.4 Cifrado Opcional JWE para Campos de Referencia en PSE

Para mitigar riesgos de fraude y cumplir con las regulaciones aplicables a empresas vinculadas a la categoría de Servicios Financieros en Colombia, el servicio PSE exige la transmisión de información contextual del pagador y del producto financiero:

*   `reference-one`: Dirección IP de origen de la petición (asignada por defecto si se omiten las referencias adicionales).
*   `reference-two`: Fecha de apertura del producto financiero en formato `yyyymmdd`.
*   `reference-three`: Número de documento del beneficiario del producto financiero.

Norma de seguridad: Si el comercio administra datos altamente sensibles en estos tres campos, Wompi permite cifrar los valores utilizando el estándar JWE (JSON Web Encryption) antes de transmitirlos. La pasarela detecta automáticamente si el contenido viaja en texto plano o cifrado mediante JWE.

### 2.5 Tokenización Segura de Tarjetas de Crédito y Alcance PCI-DSS

Cuando un comercio utiliza la API REST personalizada de Wompi para procesar cobros directos o pagos recurrentes, se debe garantizar que los números de tarjeta de crédito (PAN) y códigos de seguridad (CVC) no toquen ni se almacenen en los servidores del comercio.

El flujo seguro opera mediante tokenización en frontend:

1. El cliente digita los datos de la tarjeta en una interfaz controlada.
2. Desde el navegador o aplicación móvil se envía una petición POST al endpoint de tokenización de Wompi utilizando la Llave Pública de comercio (`pub_prod_...` o `pub_test_...`):
   * Endpoint: `https://production.wompi.co/v1/tokens/cards`
   * Cabecera: `Authorization: Bearer <LLAVE_PUBLICA>`
   * Cuerpo JSON: campos de número de tarjeta, código de seguridad, mes y año de expiración, y nombre del tarjetahabiente.
3. Wompi responde con un token seguro e intransferible con prefijo `tok_prod_` o `tok_test_`, su máscara de últimos 4 dígitos y fecha de vencimiento.
4. El frontend envía únicamente el identificador del token al servidor backend del comercio para procesar el débito, eliminando la necesidad de que el comercio almacene información sensible de tarjetas en sus bases de datos.

### 2.6 Obligatoriedad de Cifrado en Tránsito (HTTPS / SSL)

El sitio web y las APIs del comercio deben operar de forma irrestricta bajo protocolo seguro HTTPS con certificados TLS válidos. La omisión de certificados seguros expone a los compradores a alertas de navegación de seguridad en navegadores web (sitios marcados como "No seguro") e invalida la confidencialidad de los datos transmitidos entre el cliente, el comercio y la pasarela.

---

## 3. Matriz de Integridad y Parámetros Obligatorios

Para la inicialización de transacciones mediante el Widget o Web Checkout, el comercio debe conformar un conjunto estricto de parámetros obligatorios, complementado por parámetros opcionales para enriquecer el perfilamiento de riesgo y la experiencia del usuario.

### 3.1 Parámetros Obligatorios

| Parámetro | Tipo | Descripción y Restricciones |
| :--- | :--- | :--- |
| `public-key` | Cadena | Llave pública del comercio (`pub_prod_...` o `pub_test_...`). Identifica al comercio ante Wompi. |
| `currency` | Cadena | Moneda de cobro. La única moneda soportada actualmente es `COP` (Pesos colombianos). |
| `amount-in-cents` | Entero | Monto total de la transacción expresado en centavos (ej. 9500000 para \$95.000 COP). |
| `reference` | Cadena | Referencia única de pago (numérica o alfanumérica, permite guiones `-` o `_`). No reutilizable. |
| `signature:integrity` | Cadena | Hash SHA-256 en minúsculas generado en backend para certificar la integridad de los datos. |

### 3.2 Parámetros Opcionales y Manejo Impositivo

Los siguientes campos pueden anexarse para optimizar la trazabilidad de la orden:

*   `redirect-url`: URL de retorno tras finalizar el flujo de pago.
*   `expiration-time`: Timestamp ISO 8601 (UTC+0000) que define el tiempo límite para completar la transacción.
*   `customer-data`: Información prellenada del pagador, incluyendo correo electrónico, nombre completo, número de teléfono, prefijo telefónico, documento de identidad y tipo de documento (`CC`, `CE`, `NIT`, `PP`, `TI`, `DNI`, `RG`, `OTHER`).
*   `shipping-address`: Datos de despacho físico (`address-line-1`, `address-line-2`, código de país en ISO 3166-1 Alpha-2 de 2 letras mayúsculas como `CO`, ciudad, teléfono, departamento o región, nombre del receptor y código postal).
*   `tax-in-cents:vat` y `tax-in-cents:consumption`: Detalle tributario para IVA o Impuesto al Consumo en centavos.

> Regla de oro sobre impuestos en Wompi: Los impuestos enviados en el objeto de desglose tributario no se suman al monto total de la transacción. El valor en `amount-in-cents` ya debe contener el precio final con impuestos incluidos. Por ejemplo, en una transacción cuyo total es de \$119.000 COP con un IVA de \$19.000 COP, el valor de `amount-in-cents` debe ser `11900000` y el de IVA `1900000` (base de \$100.000 + IVA de \$19.000 = \$119.000). Wompi no sumará los \$19.000 al total, sino que compartirá esa información tributaria con el procesador de pagos.

---

## 4. Lista de Verificación de Seguridad para Paso a Producción

Antes de activar el procesamiento con dinero real en la pasarela Wompi, el equipo técnico debe verificar el cumplimiento del siguiente decálogo de seguridad:

1. **Entorno HTTPS activo**: Todos los dominios del comercio (frontend de tienda y endpoint de webhooks) cuentan con certificados TLS/SSL válidos y forzado de tráfico HTTPS.
2. **Generación de firma en backend**: El hash SHA-256 de integridad se construye exclusivamente en el servidor backend empleando el secreto de integración. Ningún secreto reside en el cliente.
3. **No reutilización de referencias**: El motor de pedidos genera referencias de pago únicas (`reference`) para cada intento de compra, impidiendo colisiones y sobreescrituras en base de datos.
4. **Desacoplamiento de la redirección**: La lógica de negocio no aprueba pedidos basándose en el parámetro `id` presente en la `redirect-url`.
5. **Webhook configurado y validado**: La URL de Eventos se encuentra registrada en el Dashboard de Wompi y el backend procesa el evento `transaction.updated`.
6. **Manejo de idempotencia**: El webhook verifica el estado actual de la orden antes de aplicar cambios, evitando duplicación ante reintentos de entrega de Wompi.
7. **Montos normalizados en centavos**: El sistema multiplica el valor en pesos por 100 y maneja los impuestos como parte integral del total, no como adición.
8. **Segregación de llaves**: Las llaves de prueba han sido reemplazadas por las llaves de producción exclusivamente en el entorno productivo.
9. **Tokenización de tarjetas**: Si se utiliza API directa, ningún dato de tarjeta sensible es recibido o guardado en el backend; se procesan a través de la tokenización oficial.
10. **Protección en PSE**: Se ha evaluado el uso de JWE para los campos de referencia si la actividad económica del comercio corresponde a Servicios Financieros.
