# Manual de Uso: Módulo de Auditoría y Trazabilidad

Guía paso a paso para que el administrador de Plaxtilineas consulte el historial de actividad, tiempos de conexión y trazabilidad de operaciones en el panel de control.

---

## 1. Acceso a la Sección de Auditoría

1. Inicia sesión con tus credenciales de administrador en la ruta `/login`.
2. Una vez dentro del panel administrativo (`/admin`), dirígete al menú lateral izquierdo (Sidebar).
3. Haz clic en la opción **Auditoría** (o accede directamente a la URL `/admin/auditoria`).

---

## 2. Lectura de las Tarjetas de Métricas (KPIs)

En la parte superior de la pantalla encontrarás 4 tarjetas diseñadas de forma limpia:

1. **Sesión Actual**:
   - Muestra el tiempo en vivo que llevas logueado desde tu último ingreso (ej. `12m 45s`).
   - El indicador verde animado confirma que la sesión se encuentra activa en el servidor.
2. **Operaciones Registradas**:
   - Muestra el número total de acciones registradas en el sistema y cuántas se han realizado el día de hoy.
3. **Registros Eliminados**:
   - Conteo de bajas críticas efectuadas en la base de datos (cuentas de usuarios, pedidos cancelados/eliminados o tickets de PQRS eliminados).
4. **Total de Sesiones**:
   - Número histórico de veces que los administradores han iniciado sesión en el sistema.

---

## 3. Navegación entre Vistas

Puedes alternar entre dos pestañas principales mediante los botones del encabezado Bento:

### A. Vista "Operaciones" (Registro Cronológico)
* **Tabla de Eventos**: Cada fila detalla la hora exacta (`HH:mm:ss`), la fecha, el administrador responsable, el módulo (`USUARIOS`, `PEDIDOS`, `PQRS`, `AUTH`, etc.), el tipo de acción y la descripción legible de lo ocurrido.
* **Tiempo Logueado**: Muestra cuánto tiempo llevaba conectado el administrador en el instante que realizó dicha operación.
* **Botón "Detalles"**:
  - Al hacer clic en el botón **Detalles** de cualquier fila, se desplegará el panel técnico inferior.
  - Verás los metadatos completos (ID de registro, IP de origen, recurso afectado) y el bloque de **Datos Anteriores vs. Datos Nuevos**, permitiéndote auditar qué información existía antes de ser modificada o eliminada.

### B. Vista "Sesiones & Tiempo" (Historial de Conexiones)
* Muestra el listado de todas las sesiones de administradores.
* Por cada sesión se registra:
  - ID de sesión.
  - Estado: **En línea** (sesión activa actual) o **Finalizada**.
  - Hora de ingreso y hora de salida / última actividad.
  - Tiempo total que permaneció conectado el administrador (ej. `1h 25m 14s`).
  - Total de operaciones realizadas en dicha conexión.
* **Botón "Resumen"**: Despliega una línea de tiempo rápida con las acciones ocurridas específicamente en esa sesión.
* **Botón con icono de Ojo**: Filtra de forma inmediata la tabla principal para ver únicamente las operaciones de esa sesión.

---

## 4. Uso de Filtros y Búsqueda

* **Buscador en Tiempo Real**: Escribe cualquier término (ej. nombre de un cliente, número de ticket `PQR-XXXX`, código de pedido `PX-XXXX` o correo electrónico) y presiona Enter para filtrar instantáneamente.
* **Selector de Módulo**: Filtra por categorías específicas (`Usuarios`, `Pedidos`, `PQRS`, `Accesos`, `Personalización Web` o `Configuración`).
* **Chips Rápidos**: Haz clic en los botones superiores redondeados (*Usuarios Eliminados*, *Pedidos*, *Respuestas & PQRS*, *Entradas & Salidas*) para alternar rápidamente entre los tipos de eventos más frecuentes.
* **Filtro por Fecha**: Selecciona una fecha en el campo calendario para auditar eventos a partir de un día específico.
* **Limpiar Filtros**: Al hacer clic en el botón de cerrar en la barra de búsqueda o en el chip de sesión, volverás a ver el registro completo.
