# 🚀 Guía de Despliegue de Backend Laravel en Hostinger (Administrador de Archivos)

Este proyecto Laravel 11 (`backend-laravel`) ya viene completamente configurado, con dependencias (`vendor`) instaladas y endpoints de prueba listos. La `APP_KEY` debe generarse directamente en el entorno de producción y nunca debe incluirse en el repositorio ni en el archivo ZIP.

---

## 📦 Archivo listo para subir

En la raíz del repositorio se generó el archivo:
👉 **`backend-laravel.zip`** (aprox. 16 MB)

Contiene todo el proyecto listo para funcionar directamente en Hostinger sin necesidad de ejecutar comandos por SSH o instalar Composer en el servidor.

---

## 🛠️ Paso a Paso para Probar en el Administrador de Archivos de Hostinger

### 1. Subir y extraer en Hostinger
1. Entra a tu panel de **Hostinger (hPanel)** y abre el **Administrador de Archivos (File Manager)**.
2. Sube y extrae el proyecto en una carpeta privada fuera de `public_html/`,
   por ejemplo `/home/u977254048/plaxtilineas-backend/`.
3. No extraigas el proyecto completo en `public_html/`, `www/` ni `htdocs/`.
4. Para este despliegue no es necesario crear un subdominio API. El dominio
   principal sirve Angular y el workflow publica el puente `/api` en
   `domains/plaxtilineas.com/public_html/api/`.

---

### 2. Configurar el archivo `.env`
1. Dentro de la carpeta extraída, crea el archivo `.env` a partir de `.env.example` y verifica que exista en
   `/home/u977254048/plaxtilineas-backend/.env`.
   - Si no lo ves (porque empieza con un punto), activa la opción de **"Mostrar archivos ocultos"** en la configuración del Administrador de Archivos.
   - No copies ni subas archivos `.env.production`. Ese archivo no forma parte del proyecto desplegable.
   - Genera una `APP_KEY` nueva directamente en el servidor, preferiblemente mediante SSH:
     ```bash
     cp .env.example .env
     php artisan key:generate --force
     ```
   - Si no tienes SSH, genera una clave segura con una instalación local confiable y pega únicamente la nueva `APP_KEY` en el `.env` del servidor. No la guardes en el repositorio ni en el ZIP.
2. Configura la conexión a la base de datos MySQL de Hostinger en ese `.env`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=auth-db1076.hstgr.io
   DB_PORT=3306
   DB_DATABASE=u977254048_plaxtilineasDB
   DB_USERNAME=u977254048_adminplaxti
   DB_PASSWORD=tu_contraseña_de_produccion
   ```
   Si estas variables faltan, Laravel usa por defecto `root` en `127.0.0.1` y
   los endpoints que consultan la base de datos responden 500.

---

### 3. Verificar Permisos de Carpetas (Crucial en Laravel)
Laravel necesita permisos de escritura en dos carpetas:
- `storage/` (y todas sus subcarpetas)
- `bootstrap/cache/`

En el Administrador de Archivos:
- Haz clic derecho en `storage` -> **Permisos (Permissions)** -> Asegúrate de que tenga **755** o **775** (lectura y escritura).
- Haz lo mismo con `bootstrap/cache` -> **755** o **775**.

---

### 4. Puente público `/api` (API gateway)

El frontend se publica en:

```
/home/u977254048/domains/plaxtilineas.com/public_html
```

El núcleo Laravel permanece fuera del document root:

```
/home/u977254048/plaxtilineas-backend
```

El workflow crea automáticamente
`/home/u977254048/domains/plaxtilineas.com/public_html/api/index.php` y su
`.htaccess`. Ese puente carga el `vendor/` y `bootstrap/app.php` del núcleo
privado, por lo que Angular debe usar `https://plaxtilineas.com/api/...`.
No se debe copiar el proyecto completo a `public_html`.

Configura el secreto de GitHub Actions así:

```text
HOSTINGER_BACKEND_PATH=/home/u977254048/plaxtilineas-backend
```

El workflow protege el `.env` y nunca lo sincroniza desde GitHub. Si falta,
el despliegue se detiene antes de publicar archivos incompletos.

### 5. Probar los Endpoints desde el Navegador o Postman

Una vez configurado el dominio principal, abre en tu navegador:

#### 🧪 1. Prueba de Vida / Ping:
```
https://plaxtilineas.com/api/test
```
**Respuesta esperada (JSON):**
```json
{
  "status": "success",
  "message": "¡API Laravel de Plaxtilineas funcionando correctamente! 🚀",
  "framework": "Laravel 11.57.0",
  "php_version": "8.2.x o 8.3.x",
  "environment": "production",
  "server_time": "2026-10-05T...",
  "client_ip": "..."
}
```

#### 🩺 2. Prueba de Salud y Permisos de Escritura:
```
https://plaxtilineas.com/api/health
```
Te confirmará si `storage` y `bootstrap/cache` tienen permisos de escritura correctos (`"storage_writable": true`).

#### 🗄️ 3. Prueba de Conexión a Base de Datos MySQL:
```
https://plaxtilineas.com/api/db-check
```
Te dirá si Laravel logró conectarse a tu MySQL de Hostinger con los datos del `.env`.

#### 🏠 4. Pantalla de Bienvenida JSON:
```
https://plaxtilineas.com/api/test
```
Muestra un índice con los enlaces directos a las pruebas.

---

## ⚡ Estructura y Seguridad (.htaccess)

El proyecto incluye dos niveles de `.htaccess`:
1. **`.htaccess` en la raíz (`backend-laravel/.htaccess`):** Redirige limpiamente todo el tráfico hacia la carpeta `public/` y **bloquea el acceso externo a archivos confidenciales** como `.env`, `artisan`, `composer.json`, carpetas `storage/`, `app/`, etc.
2. **`.htaccess` en `public/`:** Controla la reescritura hacia `index.php` para todas las rutas API.

## 🔁 Integración continua y despliegue

El workflow de GitHub Actions (`.github/workflows/deploy.yml`) despliega:

- **Angular** en `public_html/` (protegiendo y excluyendo `/api`).
- **El núcleo completo de Laravel** en una ruta privada fuera de `public_html` (`HOSTINGER_BACKEND_PATH`).
- **Puente público `/api`** en `public_html/api/` (`index.php` + `.htaccess`) que conecta `https://plaxtilineas.com/api/*` con el núcleo privado de Laravel (`vendor/autoload.php`, `bootstrap/app.php`, `storage/framework/maintenance.php`) sin exponer `.env`, `app/`, `config/` ni `storage/` dentro de `public_html`.
- Nunca se debe copiar el proyecto completo de Laravel dentro de `public_html`.

La carpeta configurada en `HOSTINGER_BACKEND_PATH` debe contener `artisan`,
`app/`, `bootstrap/`, `config/`, `vendor/` y `public/`. No debe ser
`public_html`, `www`, `htdocs` ni una subcarpeta de ninguna de ellas.

En los secretos del repositorio configura:

- `SSH_HOST`
- `SSH_PORT` (opcional; por defecto `65002`)
- `SSH_USER`
- `SSH_KEY` (preferido) o `SSH_PASSWORD`
- `SSH_KNOWN_HOSTS` (opcional; si no se define, el workflow obtiene y verifica la huella con `ssh-keyscan` usando `StrictHostKeyChecking=yes`)
- `HOSTINGER_BACKEND_PATH`: `/home/u977254048/plaxtilineas-backend`

El workflow nunca sube `.env` ni `.env.production`. Crea y configura `.env` directamente en el servidor antes del primer despliegue:

```bash
cd /home/u977254048/plaxtilineas-backend
cp .env.example .env
php artisan key:generate --force
```

### Orden recomendado para el primer despliegue manual:
1. Verificar que el workflow **Laravel CI** (Pint + PHPStan nivel 6 + Pest) y **Frontend CI** estén en verde.
2. En **GitHub Actions → Deploy Continuo a Hostinger → Run workflow**, seleccionar `deploy_target: ssh-check` para validar la conexión SSH con `known_hosts` y las rutas del servidor sin modificar archivos.
3. Una vez validada la prueba SSH, ejecutar nuevamente el workflow seleccionando `deploy_target: production` con el entorno `production` aprobado.
