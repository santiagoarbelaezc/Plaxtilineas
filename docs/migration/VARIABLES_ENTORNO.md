# VARIABLES_ENTORNO.md — Plaxtilineas

> Mapeo y referencia completa de variables de entorno para Laravel 11 (`backend-laravel/.env`).
> Reemplaza la configuración anterior basada en `backend-php/api/config/config.php`.

---

## 1. Base de Datos Principal

> **Desarrollo local / Tests:** Se utiliza SQLite (`DB_CONNECTION=sqlite`). Para tests se utiliza `:memory:`. Para desarrollo local se utiliza `database/database.sqlite`.
> **Producción:** MySQL (Hostinger) con conexión PDO directa configurada en `.env`.

| Variable Laravel | Default / Ejemplo | Descripción |
|---|---|---|
| `DB_CONNECTION` | `sqlite` (local) / `mysql` (prod) | Driver de base de datos |
| `DB_HOST` | `127.0.0.1` | Host MySQL en el servidor |
| `DB_PORT` | `3306` | Puerto de conexión MySQL |
| `DB_DATABASE` | `plaxtilineas` | Nombre de la base de datos |
| `DB_USERNAME` | `u123456_user` | Usuario de MySQL |
| `DB_PASSWORD` | `...` | Contraseña de MySQL |

---

## 2. Seguridad y Autenticación (Sanctum)

| Variable Laravel | Default / Ejemplo | Descripción |
|---|---|---|
| `APP_KEY` | `base64:...` | Clave criptográfica única generada con `php artisan key:generate` |
| `BCRYPT_ROUNDS` | `12` | Factor de costo para hash de contraseñas |
| `SANCTUM_TOKEN_EXPIRATION` | `null` (o minutos) | Expiración de Personal Access Tokens (si aplica) |

---

## 3. Pasarela de Pagos Wompi

| Variable Laravel | Default / Ejemplo | Descripción |
|---|---|---|
| `WOMPI_PUBLIC_KEY` | `pub_prod_...` | Llave pública utilizada por el frontend y widget Wompi |
| `WOMPI_PRIVATE_KEY` | `prv_prod_...` | Llave privada para consultas de transacciones y estados |
| `WOMPI_INTEGRITY_KEY` | `prod_integrity_...` | Llave para calcular el hash de integridad (SHA-256) |
| `WOMPI_EVENTS_KEY` | `prod_events_...` | Llave para validar la firma de eventos en webhooks |
| `WOMPI_BASE_URL` | `https://production.wompi.co/v1` | URL base del API de Wompi (`sandbox.wompi.co` para pruebas) |

---

## 4. Almacenamiento Multimedia (Cloudinary)

| Variable Laravel | Default / Ejemplo | Descripción |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | `...` | Nombre de la nube de Cloudinary |
| `CLOUDINARY_API_KEY` | `...` | API Key pública para carga de imágenes (PQRS, banners) |
| `CLOUDINARY_API_SECRET` | `...` | API Secret para generación de firmas SHA-1 de subida |

---

## 5. Inteligencia Artificial (Groq API)

Utilizado por el Asistente Mateo (Chat de soporte al cliente) y el Asistente del Dashboard administrativo:

| Variable Laravel | Default / Ejemplo | Descripción |
|---|---|---|
| `GROQ_API_KEY` | `gsk_...` | API Key de Groq para el Asistente Mateo |
| `GROQ_API_KEY_DASHBOARD`| `gsk_...` | API Key alternativa o compartida para analítica del Dashboard |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Modelo LLM configurado en Groq (`llama-3.3-70b-versatile`, etc.) |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` | Endpoint compatible OpenAI de Groq |

---

## 6. Autenticación Social (Google OAuth)

| Variable Laravel | Default / Ejemplo | Descripción |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `...apps.googleusercontent.com` | Client ID de Google para validar los `id_token` enviados desde Angular |

---

## 7. Correo Electrónico SMTP

| Variable Laravel | Default / Ejemplo | Descripción |
|---|---|---|
| `MAIL_MAILER` | `smtp` | Driver de correo (Hostinger / Gmail) |
| `MAIL_HOST` | `smtp.hostinger.com` | Servidor SMTP |
| `MAIL_PORT` | `465` (o `587`) | Puerto de envío SMTP |
| `MAIL_USERNAME` | `notificaciones@plaxtilineas.com` | Usuario o buzón de correo remitente |
| `MAIL_PASSWORD` | `...` | Contraseña del buzón de correo |
| `MAIL_ENCRYPTION` | `ssl` (o `tls`) | Protocolo de cifrado |
| `MAIL_FROM_ADDRESS` | `notificaciones@plaxtilineas.com`| Dirección visible del remitente |
| `MAIL_FROM_NAME` | `Plaxtilineas SAS` | Nombre visible del remitente |

---

## 8. Frontend y CORS

| Variable Laravel | Default / Ejemplo | Descripción |
|---|---|---|
| `FRONTEND_URL` | `https://plaxtilineas.com` | Origen permitido para solicitudes CORS desde el frontend Angular |

---

## 9. Reglas de Negocio y Valores por Defecto

| Variable Laravel | Default / Ejemplo | Descripción |
|---|---|---|
| `ADMIN_EMAIL` | `admin@plaxtilineas.com` | Correo receptor de alertas de pedidos y PQRS |
| `COSTO_ENVIO_COP` | `10000.0` | Costo de envío estándar en pesos colombianos |
| `IVA_PORCENTAJE` | `0.0` | Porcentaje de IVA (actualmente incluido en precio de catálogo) |
