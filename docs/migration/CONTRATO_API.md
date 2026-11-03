# CONTRATO_API.md — Plaxtilineas (backend-php -> backend-laravel)

> Auditado directamente del codigo fuente en `backend-php/api/`.
> **Fuente de verdad** para la migracion a Laravel 11.
> Ultima revision: 2026-10-19

---

## Formato de respuesta

### Exito (`ResponseHandler::success`)
El PHP NO usa `{ success: true, data: {} }`. Devuelve el payload directamente.
```json
{ "mensaje": "Login exitoso", "token": "...", "usuario": { } }
{ "id": "abc123", "svg": "<svg>..." }
```

### Error (`ResponseHandler::error`)
```json
{ "error": "Mensaje de error" }
{ "error": "Mensaje", "detalle": "solo en development" }
```

---

## 2.1 Auth

### `GET /api/auth/captcha`
- Auth: No
- Respuesta 200: `{ "id": "hex32chars", "svg": "<svg>...</svg>" }`
- Validez: 5 minutos. Uso unico (se elimina al verificar). Case-insensitive.

### `POST /api/auth/login`
- Auth: No
- Body: `{ "correo": "email", "password": "plain" }`
- Respuesta 200:
```json
{
  "mensaje": "Login exitoso",
  "token": "header.payload.signature",
  "requiere_cambio_password": false,
  "usuario": {
    "id": 1, "correo": "user@example.com", "nombre": "Santiago",
    "telefono": "3001234567", "rol": "cliente", "requiere_cambio_password": false
  }
}
```
- Errores:
  - 401: `{ "error": "Usuario no encontrado" }`
  - 401: `{ "error": "Contrasena incorrecta" }`
  - 403: `{ "error": "Debes confirmar tu correo electronico antes de iniciar sesion..." }`
  - 400: `{ "error": "Correo y contrasena son obligatorios" }`
- Campo de login: `correo` (NO `email`)

### `POST /api/auth/register`
- Auth: No
- Body: `{ "nombre", "apellidos", "correo", "password", "captchaId", "captchaCode", "edad", "direccion", "ciudad", "telefono" }`
- Respuesta 201:
```json
{
  "mensaje": "Registro exitoso. Se ha enviado un codigo de confirmacion a tu correo.",
  "token": "...",
  "usuario": { "id": 5, "correo": "...", "nombre": "...", "telefono": "...", "rol": "cliente" },
  "pendiente_verificacion": true
}
```
- Errores: 400 captcha invalido, 409 email duplicado

### `GET /api/auth/verificar-email?token=CODIGO`
- Auth: No
- Respuesta 200:
```json
{
  "mensaje": "Correo verificado exitosamente. Tu cuenta ha sido activada.",
  "token": "...",
  "usuario": { "id": 1, "correo": "...", "nombre": "...", "telefono": "...", "rol": "cliente" }
}
```
- 400 si invalido o expirado

### `POST /api/auth/google`
- Auth: No
- Body: `{ "credential": "GOOGLE_ID_TOKEN" }`
- Respuesta 200: `{ "mensaje": "Login con Google exitoso", "token": "...", "usuario": {...} }`
- Verifica con googleapis.com/tokeninfo. Crea usuario si no existe.

### `POST /api/auth/recuperar-password`
- Auth: No
- Body: `{ "correo": "email", "captcha_id": "...", "captcha_code": "..." }`
- Respuesta 200: `{ "mensaje": "Hemos enviado una contrasena temporal a tu correo electronico..." }`
- 404 si email no existe (DIFERENCIA: PHP revela existencia del email)
- Genera password con prefijo `Plx-` + 5 chars

### `POST /api/auth/cambiar-password-temporal`
- Auth: Si (Bearer)
- Body: `{ "nueva_password": "8+chars" }`
- Respuesta 200: `{ "mensaje": "Tu contrasena ha sido actualizada exitosamente." }`

### `GET /api/auth/perfil`
- Auth: Si (Bearer)
- Respuesta 200 (objeto plano sin wrapper):
```json
{ "id": 1, "nombre": "...", "apellidos": "...", "correo": "...", "edad": 25,
  "direccion": "...", "ciudad": "...", "telefono": "...", "rol": "cliente" }
```

### `PUT /api/auth/actualizar`
- Auth: Si (Bearer)
- Body: `{ "nombre", "apellidos", "edad", "direccion", "ciudad", "telefono" }`
- Respuesta 200: `{ "mensaje": "Perfil actualizado exitosamente", "usuario": {...} }`
- Validaciones: todos obligatorios, edad 0-120, tel 7-15 digitos

### `DELETE /api/auth/cuenta`
- Auth: Si (Bearer)
- Respuesta 200: `{ "mensaje": "Cuenta eliminada exitosamente" }`

---

## 2.2 Carrito

### `POST /api/carrito/sync`
- Auth: Si
- Body: `{ "items": [{ "producto_id": 1, "variante_id": null, "cantidad": 2, "precio_unitario": 15000 }] }`
- Respuesta 200: `{ "mensaje": "Carrito sincronizado exitosamente", "items": [...] }`
- Logica: DELETE + INSERT (reemplazo total)

---

## 2.3 Pedidos

### `POST /api/pedidos/draft`
- Auth: Si
- Costo envio: $10,000 COP fijo
- IVA: 0% (incluido en precio del catalogo)

### `GET /api/pedidos/estado?referencia=PLX-xxx` - Auth mixto
### `GET /api/pedidos/mis-pedidos` - Auth: Si
### `GET /api/pedidos/admin/todos` - Auth: Admin
### `PUT /api/pedidos/admin/actualizar-estado/:id` - Auth: Admin
### `PUT /api/pedidos/cancelar/:id` - Auth: Si

---

## 2.4 Wompi

### `POST /api/wompi/datos-pago` - Auth: Si
- Firma SHA-256: `referencia + monto_centavos + moneda + WOMPI_INTEGRITY_KEY`

### `POST /api/wompi/webhook` - Auth: Publica + firma
### `GET|POST /api/wompi/mock-approve` - Solo entorno local

---

## 2.5 Chat

### `POST /api/chat` - Auth: Sesion/IP
### `GET /api/chat/historial` - Auth: Sesion
### `DELETE /api/chat/limpiar` - Auth: Sesion
### `POST /api/dashboard-assistant` - Auth: Admin

---

## 2.6 PQRS

### `POST /api/pqrs` - Auth: No
- Tipos: `peticion | queja | reclamo | sugerencia`
### `GET /api/pqrs/consulta/:id` - Auth: No
### `GET /api/pqrs` - Auth: Admin
### `GET /api/pqrs/estadisticas` - Auth: Admin
### `POST /api/pqrs/:id/respuestas` - Auth: Admin

---

## 2.7 Leads

### `POST /api/leads` - Auth: No
### `GET /api/leads` - Auth: Admin
### `GET /api/leads/stats` - Auth: Admin

---

## 2.8 Componentes

### `GET /api/componentes` - Auth: No (solo activos)
### `POST /api/componentes` - Auth: Admin
### `PUT /api/componentes/:id` - Auth: Admin
### `DELETE /api/componentes/:id` - Auth: Admin
### `PUT /api/componentes/reordenar` - Auth: Admin
### `POST /api/componentes/upload` - Auth: Admin (Cloudinary)

---

## 2.9 Stats, Admin, Config

### `POST /api/stats/track` - Auth: No (throttle)
### `GET /api/stats/dashboard` - Auth: Admin
### `GET /api/admin/usuarios-detalle` - Auth: Admin
### `DELETE /api/admin/usuarios/:id` - Auth: Admin
### `GET /api/configuraciones` - Auth: Mixto
### `PUT /api/configuraciones` - Auth: Admin

---

## Tabla `usuarios` — campos

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INT PK | |
| `nombre` | VARCHAR(150) | |
| `apellidos` | VARCHAR(150) | |
| `correo` | VARCHAR(150) UNIQUE | Campo login (NO `email`) |
| `password` | VARCHAR bcrypt | Compatible con Hash::check |
| `rol` | ENUM(cliente, admin) | |
| `google_id` | VARCHAR | NULL si registro normal |
| `email_verificado` | TINYINT(1) | 0=no verificado |
| `token_verificacion` | VARCHAR | Codigo 6 digitos |
| `token_expira_en` | DATETIME | +24h desde registro |
| `requiere_cambio_password` | TINYINT(1) | 1=forzar cambio |
| `telefono` | VARCHAR(50) | |
| `edad` | INT | |
| `direccion` | TEXT | |
| `ciudad` | VARCHAR(100) | |

> Tabla: **`usuarios`** (NO `users`). Modelo Laravel: `protected $table = 'usuarios'`
