# Seguridad de Cuenta, Cambio de Contraseña OTP y Mejoras de Interfaz

Este documento detalla las adiciones y mejoras técnicas implementadas en **Backend (Laravel)** y **Frontend (Angular)** correspondientes a los commits `e6bcbfd` (backend) y `2f19329` (frontend) de Plaxtilineas.

---

## 1. Cambio de Contraseña con Verificación OTP y Límite cada 15 Días

### 1.1 Modelo de Datos y Migración
La migración `backend-laravel/database/migrations/2026_11_24_000001_add_password_cambios_historial_to_usuarios_table.php` agrega una columna persistente en la tabla `usuarios`:

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `password_cambios_historial` | `JSON NULLABLE` | Arreglo de marcas de tiempo ISO-8601 (UTC) de los cambios de contraseña exitosos dentro de la ventana móvil de 15 días. |

En `App\Models\Usuario`:
- Se registró `password_cambios_historial` en `$fillable`, `$hidden` (para no exponerlo en respuestas genéricas de usuario) y `casts()` como `'array'`.

### 1.2 Endpoints del Backend (`/api/auth/password/*`)
Todas las rutas están protegidas con `auth:sanctum` (y las operaciones de escritura/validación con `throttle:auth`):

| Método | Ruta | Controlador | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/password/estado` | `AuthController@estadoLimitePassword` | Retorna el estado actual de la cuota (`usados`, `maximo: 2`, `restantes`, `ventana_dias: 15`, `permitido`, `proximo_disponible_en`, `dias_restantes`). |
| `POST` | `/api/auth/password/solicitar-codigo` | `AuthController@solicitarCodigoPassword` | Verifica la cuota de 15 días, aplica un cooldown de 60 s, genera un código OTP numérico de 6 dígitos, lo guarda encriptado (`Hash::make`) en `Cache` con TTL de 10 minutos y lo envía por correo con `CodigoCambioPasswordMailable`. |
| `POST` | `/api/auth/password/validar-codigo` | `AuthController@validarCodigoPassword` | Valida el código de 6 dígitos contra el hash en caché antes de habilitar los campos de nueva contraseña en el frontend (máximo 5 intentos fallidos). |
| `POST` | `/api/auth/password/actualizar` | `AuthController@actualizarPasswordConCodigo` | Revalida cuota y OTP mediante `ActualizarPasswordConCodigoRequest`, impide reutilizar la contraseña actual, actualiza el hash, limpia `requiere_cambio_password`, registra el timestamp en `password_cambios_historial` y retorna el nuevo saldo disponible. |

### 1.3 Políticas de Seguridad Aplicadas
- **Contraseña segura** (`ActualizarPasswordConCodigoRequest`):
  - Mínimo 8 caracteres.
  - Al menos una letra mayúscula (`A-Z`) y una minúscula (`a-z`).
  - Al menos un dígito (`0-9`) y un carácter especial (`!@#$%...`).
  - Confirmación obligatoria (`nueva_password_confirmation`) y distinta a la contraseña actual.
- **Límite de frecuencia (ventana móvil)**:
  - Máximo **2 cambios de contraseña cada 15 días** por cuenta.
  - Al alcanzar el límite, los 3 endpoints de acción responden `429 Too Many Requests` indicando los días restantes hasta la próxima fecha disponible (calculada a partir del cambio más antiguo dentro de la ventana + 15 días).
- **Correo transaccional**:
  - `App\Mail\CodigoCambioPasswordMailable`: plantilla HTML corporativa Plaxtilineas (`#379045`) con el código de 6 dígitos en tipografía monoespaciada y aviso de vigencia de 10 minutos.

### 1.4 Flujo Frontend en 3 Pasos (`ConfiguracionComponent`)
Archivos: `frontend/src/app/services/auth.service.ts` y `frontend/src/app/pages/configuracion/configuracion.component.{ts,html,css}`.

1. **Estado inicial y cuota**: Al cargar el componente (`ngOnInit`), consulta `GET /api/auth/password/estado` y muestra un indicador en vivo (*"Te quedan X de 2 cambios disponibles cada 15 días"*). Si la cuota está agotada (`0 de 2`), muestra una alerta con la fecha exacta del próximo cambio y deshabilita el botón de envío.
2. **Paso 1 — Solicitar código**: El usuario pulsa **Enviar código a mi correo**.
3. **Paso 2 — Validar código**: Solo se habilita el campo numérico de 6 dígitos, el botón **Reenviar código** (con cuenta regresiva de 60 s) y **Validar código**. Los campos de contraseña permanecen ocultos/bloqueados hasta recibir confirmación positiva del backend.
4. **Paso 3 — Establecer nueva contraseña**: Tras validar el código, se habilitan los campos **Nueva contraseña** y **Confirmar nueva contraseña** (con botones de mostrar/ocultar), un checklist interactivo en tiempo real de los 6 requisitos mínimos y el botón **Actualizar contraseña**, cerrando el flujo con un modal nativo de confirmación.

---

## 2. Rediseño de Seguridad y Cuenta (Zona de Peligro) y Perfil

- **Alineación al Manual de Marca Plaxtilineas**: Superficies `#ffffff` / `#f8f9fa`, bordes `1.5px solid #e4e4e7`, botones principales `#09090b` con acento verde corporativo `#379045` y tipografía `Montserrat` + `Mulish`.
- **Zona de Peligro**: Tarjeta limpia con borde izquierdo `#dc2626`, franja `#fef2f2`, botón outline-a-sólido y modal nativo de confirmación de eliminación de cuenta.
- **Proporción de columnas en `/perfil`** (`perfil.component.css`): Ajuste de distribución para ampliar la sección izquierda de contenido (`Datos personales`, `Mis Pedidos`, `Seguridad`) y estilizar la barra lateral derecha.

---

## 3. Alineación de Modales en el Detalle de Producto

Archivos: `frontend/src/app/features/products/description-producto/description-producto-select/description-producto-select.{html,css}`.

Se corrigieron los problemas de superposición con el navbar y desalineación en los modales de **Entrega**, **Tienda**, **Descripción** e **Información Legal**:
- **Capa y centrado**: Elevación del `z-index` de `.descripcion-modal-backdrop` de `9999` a `2000000` (por encima del navbar fijo) y reemplazo de `100vw/100vh` por `inset: 0` con `max-height: calc(100dvh - 48px)`.
- **Eliminación de saltos de línea fantasma**: Se retiró `white-space: pre-line` del contenedor genérico `.descripcion-modal-text`, restringiéndolo únicamente a `.is-preline` en el modal de descripción de texto plano.
- **Arquitectura en 3 zonas (`header` / `body` / `footer`)**: El botón de cierre (`×`) vive alineado en el encabezado del modal (sin superponerse al contenido al hacer scroll), el cuerpo desplaza de forma independiente y el botón de acción queda fijo en el pie.

---

## 4. Configuración de Retorno de Pasarela Wompi

Archivos: `backend-laravel/.env.example`, `backend-laravel/config/wompi.php`, `backend-laravel/config/services.php` y `backend-laravel/app/Services/Catalogo/CatalogoApiService.php`.

- Se estandarizó la URL de retorno por defecto de Wompi hacia `https://plaxtilineas.com/pago-exitoso` en las configuraciones del backend.
