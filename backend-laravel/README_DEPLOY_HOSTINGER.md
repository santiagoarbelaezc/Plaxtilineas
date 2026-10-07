# 🚀 Guía de Despliegue de Backend Laravel en Hostinger (Administrador de Archivos)

Este proyecto Laravel 11 (`backend-laravel`) ya viene completamente configurado, con dependencias (`vendor`) instaladas, clave de aplicación (`APP_KEY`) generada y endpoints de prueba listos.

---

## 📦 Archivo listo para subir

En la raíz del repositorio se generó el archivo:
👉 **`backend-laravel.zip`** (aprox. 16 MB)

Contiene todo el proyecto listo para funcionar directamente en Hostinger sin necesidad de ejecutar comandos por SSH o instalar Composer en el servidor.

---

## 🛠️ Paso a Paso para Probar en el Administrador de Archivos de Hostinger

### 1. Subir y Extraer en Hostinger
1. Entra a tu panel de **Hostinger (hPanel)** y abre el **Administrador de Archivos (File Manager)** de `plaxtilineas.com`.
2. Dirígete a la carpeta `public_html/` (o `domains/plaxtilineas.com/public_html/`).
3. Para hacer una **prueba segura** sin alterar el backend actual (`/api`):
   - Crea una nueva carpeta llamada `backend-laravel` (o `api-test`).
   - Entra a esa carpeta.
   - Sube el archivo `backend-laravel.zip`.
   - Haz clic derecho sobre el zip y selecciona **Extraer (Extract)** en el directorio actual.
   - (Opcional) Puedes borrar el archivo `.zip` una vez extraído para ahorrar espacio.

---

### 2. Configurar el archivo `.env`
1. Dentro de la carpeta extraída, verifica que exista el archivo `.env`.
   - Si no lo ves (porque empieza con un punto), activa la opción de **"Mostrar archivos ocultos"** en la configuración del Administrador de Archivos.
   - También dejamos una copia llamada `.env.production` que ya tiene una `APP_KEY` generada. Puedes renombrarla a `.env` si es necesario.
2. Si deseas probar de una vez la conexión a la base de datos MySQL de Hostinger, edita el `.env`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=nombre_de_tu_bd_en_hostinger
   DB_USERNAME=usuario_de_tu_bd_en_hostinger
   DB_PASSWORD=contraseña_de_tu_bd
   ```

---

### 3. Verificar Permisos de Carpetas (Crucial en Laravel)
Laravel necesita permisos de escritura en dos carpetas:
- `storage/` (y todas sus subcarpetas)
- `bootstrap/cache/`

En el Administrador de Archivos:
- Haz clic derecho en `storage` -> **Permisos (Permissions)** -> Asegúrate de que tenga **755** o **775** (lectura y escritura).
- Haz lo mismo con `bootstrap/cache` -> **755** o **775**.

---

### 4. Probar los Endpoints desde el Navegador o Postman

Una vez subido a `public_html/backend-laravel/`, abre en tu navegador:

#### 🧪 1. Prueba de Vida / Ping:
```
https://plaxtilineas.com/backend-laravel/api/test
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
https://plaxtilineas.com/backend-laravel/api/health
```
Te confirmará si `storage` y `bootstrap/cache` tienen permisos de escritura correctos (`"storage_writable": true`).

#### 🗄️ 3. Prueba de Conexión a Base de Datos MySQL:
```
https://plaxtilineas.com/backend-laravel/api/db-check
```
Te dirá si Laravel logró conectarse a tu MySQL de Hostinger con los datos del `.env`.

#### 🏠 4. Pantalla de Bienvenida JSON:
```
https://plaxtilineas.com/backend-laravel/
```
Muestra un índice con los enlaces directos a las pruebas.

---

## ⚡ Estructura y Seguridad (.htaccess)

El proyecto incluye dos niveles de `.htaccess`:
1. **`.htaccess` en la raíz (`backend-laravel/.htaccess`):** Redirige limpiamente todo el tráfico hacia la carpeta `public/` y **bloquea el acceso externo a archivos confidenciales** como `.env`, `artisan`, `composer.json`, carpetas `storage/`, `app/`, etc.
2. **`.htaccess` en `public/`:** Controla la reescritura hacia `index.php` para todas las rutas API.
