# Guía de Despliegue en Producción — Plaxtilineas Backend (Laravel 11)

Esta guía detalla los pasos para desplegar el backend Laravel 11 en el entorno de producción (Hostinger / cPanel / Cloud VPS).

---

## 1. Requisitos del Servidor

- **PHP:** Versión `>= 8.2` (recomendado PHP 8.2 o 8.3).
- **Extensiones PHP Requeridas:**
  - `pdo_mysql`
  - `openssl`
  - `mbstring`
  - `tokenizer`
  - `xml`
  - `ctype`
  - `json`
  - `bcmath`
  - `curl`
  - `fileinfo`
- **Gestor de Dependencias:** Composer 2.x
- **Base de Datos:** MySQL 8.0+ o MariaDB 10.4+
- **Servidor Web:** Apache 2.4+ (con `mod_rewrite` habilitado) o Nginx 1.20+.

---

## 2. Estructura de Directorios (Aislamiento de Seguridad)

Para evitar la exposición de archivos de configuración y código fuente, el núcleo del backend **NUNCA** debe colocarse directamente dentro de la carpeta pública web.

### En Hostinger / cPanel:
- Ruta del proyecto: `/home/uXXXXXX/plaxtilineas-backend`
- Ruta del subdominio de API (ej. `api.plaxtilineas.com`):
  - Configurar el "Document Root" del subdominio apuntando a:
    `/home/uXXXXXX/plaxtilineas-backend/public`

Si el panel de hosting no permite cambiar el Document Root:
1. Colocar los archivos de `backend-laravel/public/` en la carpeta web asignada (ej. `public_html/api/`).
2. Mover el resto del backend a una carpeta hermana segura: `/home/uXXXXXX/plaxtilineas-backend/`.
3. Modificar `index.php` en la carpeta pública para apuntar a:
   ```php
   require __DIR__.'/../../plaxtilineas-backend/vendor/autoload.php';
   $app = require_once __DIR__.'/../../plaxtilineas-backend/bootstrap/app.php';
   ```

---

## 3. Configuración de Variables de Entorno (`.env`)

Copiar el archivo de plantilla y configurar los valores de producción:

```bash
cp .env.example .env
```

Parámetros críticos a verificar en `.env`:
```env
APP_NAME="Plaxtilineas Backend"
APP_ENV=production
APP_KEY=base64:... # Generado con php artisan key:generate
APP_DEBUG=false
APP_URL=https://api.plaxtilineas.com

# Base de datos MySQL Hostinger
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=uXXXXXX_plaxtilineas
DB_USERNAME=uXXXXXX_usuario
DB_PASSWORD="PasswordSeguro123!"

# Frontend CORS
FRONTEND_URL=https://plaxtilineas.com

# Pasarela Wompi (Producción)
WOMPI_PUBLIC_KEY=pub_prod_...
WOMPI_PRIVATE_KEY=prv_prod_...
WOMPI_INTEGRITY_KEY=prod_integrity_...
WOMPI_EVENTS_KEY=prod_events_...
WOMPI_BASE_URL=https://production.wompi.co/v1

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Groq AI
GROQ_API_KEY=gsk_...
GROQ_API_KEY_DASHBOARD=gsk_...
GROQ_MODEL=openai/gpt-oss-120b

# Correo SMTP Hostinger
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=notificaciones@plaxtilineas.com
MAIL_PASSWORD="PasswordEmail123!"
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS="notificaciones@plaxtilineas.com"
MAIL_FROM_NAME="Plaxtilineas SAS"

# Reglas de Negocio
ADMIN_EMAIL=admin@plaxtilineas.com
COSTO_ENVIO_COP=10000.0
IVA_PORCENTAJE=0.0
```

---

## 4. Secuencia de Instalación y Despliegue

Ejecutar en la raíz de `backend-laravel`:

```bash
# 1. Instalar dependencias sin paquetes de desarrollo y con autoloader optimizado
composer install --no-dev --optimize-autoloader

# 2. Generar clave criptográfica de la aplicación (si no está definida)
php artisan key:generate --force

# 3. Ejecutar migraciones de base de datos en producción
php artisan migrate --force

# 4. Sembrar datos iniciales del sistema (Administrador inicial y catálogo)
php artisan db:seed --force

# 5. Optimizar y compilar cachés de producción
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

> **Nota:** Si en algún momento se actualiza el archivo `.env`, se deben refrescar los cachés ejecutando `php artisan config:cache`.

---

## 5. Permisos de Archivos y Carpetas

El usuario del servidor web (`www-data`, `nobody` o el usuario cPanel) debe tener permisos de escritura sobre:
```bash
chmod -R 775 storage bootstrap/cache
```

---

## 6. Configuración de Tareas Programadas (Cron Jobs)

Laravel cuenta con tareas automáticas programadas, incluyendo la limpieza de carritos expirados y la liberación de reservas de stock (`carrito:limpiar-expirados`).

Configurar en el gestor de Cron de Hostinger / cPanel:
```bash
* * * * * cd /home/uXXXXXX/plaxtilineas-backend && php artisan schedule:run >> /dev/null 2>&1
```

O si se desea ejecutar el comando directamente cada 15 minutos:
```bash
*/15 * * * * cd /home/uXXXXXX/plaxtilineas-backend && php artisan carrito:limpiar-expirados >> /dev/null 2>&1
```

---

## 7. Verificación Post-Despliegue

1. **Health Check:**
   Realizar una petición GET a `https://api.plaxtilineas.com/api/configuraciones`. Debe responder con status `200 OK` y el JSON de configuraciones públicas.
2. **Logs del Sistema:**
   Verificar que no existan errores en `storage/logs/laravel.log`.
3. **CORS:**
   Probar una solicitud desde el dominio del frontend (`https://plaxtilineas.com`) verificando que los headers `Access-Control-Allow-Origin` respondan adecuadamente.
