# VARIABLES_ENTORNO.md — Plaxtilineas

> Todas las variables que lee `backend-php/api/config/config.php`.
> Mapeo a las variables de `.env` de Laravel en `backend-laravel/`.

---

## Base de Datos Principal (negocio)

> **Desarrollo local / Tests:** Se utiliza SQLite (`DB_CONNECTION=sqlite`). Para tests se utiliza `:memory:`. Para desarrollo local se utiliza `database/database.sqlite`. No se requiere conexión a MySQL remoto durante el desarrollo.
> **Producción:** MySQL (Hostinger) configurado en Fase 9.

| PHP (`config.php`) | Laravel (`.env`) | Descripcion |
|---|---|---|
| `DB_CONNECTION` | `DB_CONNECTION` | Driver (`sqlite` en local, `mysql` en prod) |
| `DB_HOST` | `DB_HOST` | Host MySQL |
| `DB_PORT` | `DB_PORT` | Puerto (default: 3306) |
| `DB_USER` | `DB_USERNAME` | Usuario MySQL |
| `DB_PASSWORD` | `DB_PASSWORD` | Password MySQL |
| `DB_NAME` | `DB_DATABASE` | Nombre de la BD |

## Base de Datos Catalogo Externo

| PHP | Laravel (`config/services.php`) | Descripcion |
|---|---|---|
| `HOSTINGER_DB_HOST` | `services.catalogo.host` | Host catalogo |
| `HOSTINGER_DB_PORT` | `services.catalogo.port` | Puerto catalogo |
| `HOSTINGER_DB_USER` | `services.catalogo.username` | Usuario catalogo |
| `HOSTINGER_DB_PASSWORD` | `services.catalogo.password` | Password catalogo |
| `HOSTINGER_DB_NAME` | `services.catalogo.database` | BD catalogo |

## Seguridad / Tokens

| PHP | Laravel | Descripcion |
|---|---|---|
| `TOKEN_SECRET` | (no aplica, Sanctum usa APP_KEY) | HMAC secret — reemplazado por Sanctum |
| `TOKEN_EXPIRATION` | `SANCTUM_TOKEN_EXPIRATION` | Segundos de vida del token |

## Cloudinary

| PHP | Laravel (`config/services.php`) | Descripcion |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | `CLOUDINARY_CLOUD_NAME` | Nombre del cloud |
| `CLOUDINARY_API_KEY` | `CLOUDINARY_API_KEY` | API Key publica |
| `CLOUDINARY_API_SECRET` | `CLOUDINARY_API_SECRET` | API Secret (firma SHA-1) |

## Email SMTP

| PHP | Laravel | Descripcion |
|---|---|---|
| `SMTP_HOST` | `MAIL_HOST` | Host SMTP (default: smtp.gmail.com) |
| `SMTP_PORT` | `MAIL_PORT` | Puerto (default: 587) |
| `SMTP_USER` | `MAIL_USERNAME` | Usuario SMTP |
| `SMTP_PASS` | `MAIL_PASSWORD` | Password SMTP |
| `EMAIL_FROM_NAME` | `MAIL_FROM_NAME` | Nombre remitente (default: Plaxtilineas SAS) |
| `SUPPORT_EMAIL` | `SUPPORT_EMAIL` | Email de soporte (en config/mail.php) |

## Empresa

| PHP | Laravel (`config/app.php` o custom) | Descripcion |
|---|---|---|
| `COMPANY_NAME` | `COMPANY_NAME` | Nombre empresa (default: Plaxtilineas SAS) |
| `COMPANY_PHONE_1` | `COMPANY_PHONE_1` | Telefono 1 |
| `COMPANY_PHONE_2` | `COMPANY_PHONE_2` | Telefono 2 |
| `COMPANY_ADDRESS` | `COMPANY_ADDRESS` | Direccion |

## App

| PHP | Laravel | Descripcion |
|---|---|---|
| `APP_ENV` | `APP_ENV` | Entorno: development/production |
| `FRONTEND_URL` | `FRONTEND_URL` | URL del frontend Angular |
| `UPLOAD_MAX_SIZE` | (en config) | Tamano max upload: 5242880 (5MB) |

## Wompi

| PHP | Laravel (`config/services.php`) | Descripcion |
|---|---|---|
| `WOMPI_PUBLIC_KEY` | `WOMPI_PUBLIC_KEY` | Llave publica Wompi |
| `WOMPI_PRIVATE_KEY` | `WOMPI_PRIVATE_KEY` | Llave privada Wompi |
| `WOMPI_INTEGRITY_KEY` | `WOMPI_INTEGRITY_KEY` | Llave de integridad (firma de transaccion) |
| `WOMPI_EVENTS_KEY` | `WOMPI_EVENTS_KEY` | Llave de eventos (firma de webhook) |

## Negocio / Precios (constantes, no variables)

| Constante PHP | Valor | Descripcion |
|---|---|---|
| `COSTO_ENVIO_COP` | `10000` | Costo de envio fijo en COP |
| `IVA_PORCENTAJE` | `0.0` | IVA (incluido en precio del producto) |

Estas se configuran en `config/business.php`:
```php
return [
    'costo_envio' => env('COSTO_ENVIO_COP', 10000),
    'iva_porcentaje' => env('IVA_PORCENTAJE', 0.0),
];
```

## Google OAuth

| PHP | Laravel (`config/services.php`) | Descripcion |
|---|---|---|
| (endpoint hardcoded) | `GOOGLE_CLIENT_ID` | Client ID para verificar id_token |

---

## Template `.env` para Laravel

```env
APP_NAME="Plaxtilineas"
APP_ENV=local
APP_KEY=base64:...
APP_DEBUG=true
APP_URL=http://localhost:8000

# Base de datos principal
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=plaxtilineas
DB_USERNAME=root
DB_PASSWORD=

# Base de datos catalogo externo
CATALOGO_DB_HOST=
CATALOGO_DB_PORT=3306
CATALOGO_DB_DATABASE=
CATALOGO_DB_USERNAME=
CATALOGO_DB_PASSWORD=

# Frontend CORS
FRONTEND_URL=http://localhost:4200

# Correo SMTP
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@plaxtilineas.com
MAIL_FROM_NAME="Plaxtilineas SAS"

# Wompi
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_INTEGRITY_KEY=
WOMPI_EVENTS_KEY=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=

# Empresa
COMPANY_NAME="Plaxtilineas SAS"
COMPANY_PHONE_1=
COMPANY_PHONE_2=
COMPANY_ADDRESS=

# Negocio
COSTO_ENVIO_COP=10000
IVA_PORCENTAJE=0.0

# Gemini AI (Chat)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

# Soporte
SUPPORT_EMAIL=
```
