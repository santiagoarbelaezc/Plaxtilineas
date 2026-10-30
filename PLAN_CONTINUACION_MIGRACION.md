# Plan de continuación — Migración backend-php → backend-laravel

> **Para el siguiente modelo/agente.** Leer primero `PLAN_MIGRACION_LARAVEL_ANTIGRAVITY.md` (plan maestro)
> y este archivo (estado real + pendientes). Rama: `v2-laravel-nico`. Entorno: Windows + PowerShell.

## 0. Avisos operativos (lecciones aprendidas)

- **PowerShell no soporta `&&`**. Usar el parámetro `Cwd` o `;`.
- **Evitar here-strings gigantes en `run_command`** (falló al crear excepciones). Crear **un archivo por llamada** con `write_to_file`.
- `write_to_file`: **no** pasar `ArtifactMetadata` para archivos de código/docs del repo.
- `composer` y `artisan` son lentos (1-3 min): lanzarlos en background y esperar la notificación; no hacer polling.
- No tocar `backend-php/` ni el workflow de despliegue (regla 3 del plan maestro).
- Leer el PHP real antes de portar cada módulo (`backend-php/api/controllers/*`, `utils/*`).

## 1. Estado actual (verificado con `git status`)

### Hecho
| Ítem | Estado |
|---|---|
| Laravel 11.57 funcionando | OK |
| Pest 2.36 + pest-plugin-laravel 2.4 + Larastan 3.13 instalados | OK (Pest v5 requiere PHP 8.4, se usó v2) |
| `phpunit.xml` con SQLite en memoria + env fake | OK |
| `tests/Pest.php` (RefreshDatabase, `preventStrayRequests`, helpers) | Creado, **sin verificar** |
| `.github/workflows/laravel-ci.yml` | Creado, sin verificar |
| `docs/migration/`: CONTRATO_API, REGLAS_NEGOCIO, VARIABLES_ENTORNO, DIFERENCIAS, PREGUNTAS_ABIERTAS | Creados (borrador, ver 2.1) |
| `app/Support/ApiResponse.php` | Creado |
| `app/Exceptions/Domain/`: `DomainException`, `PedidoNoEncontradoException`, `StockInsuficienteException` | Creados |
| Estructura de carpetas vacías (Actions, Services, Contracts, DTOs, etc.) | Creada (git no versiona carpetas vacías) |

### Pendiente de Fase 1/2 (incompleto)
- Excepciones faltantes: `EstadoPedidoInvalida`, `FirmaWompiInvalida`, `CredencialesInvalidas`, `CaptchaInvalido`, `IpBaneada`, `ServicioExterno`, `PqrNoEncontrada`, `UsuarioNoEncontrado`, `AccesoNoPermitido` (el comando que las generaba falló).
- No se ha ejecutado nunca la suite de tests ni Pint ni Larastan.
- `tests/Pest.php` referencia `App\Models\Usuario` y su factory (aún no existen) y tiene una expectation `toBeUnauthorized` dudosa: **simplificarla o eliminarla**.

## 2. Correcciones necesarias a lo ya hecho

### 2.1 Documentos con datos sin verificar
`CONTRATO_API.md` y `REGLAS_NEGOCIO.md` se escribieron leyendo solo `AuthController`, `ResponseHandler`, `TokenHelper`, `EmailService`, `config.php` y `schema_completo.sql`. **El resto de controladores no se leyó**; varias secciones son supuestos (marcados "verificar"). Antes de cada fase, leer el controlador y corregir el doc:
`CarritoController`, `PedidoController`, `WompiController`, `ChatController`, `DashboardAssistantController`, `PqrsController`, `LeadsController`, `ComponentesController`, `StatsController`, `AdminUserController`, `ConfiguracionController`, `utils/ChatModerationService`, `utils/CloudinaryHelper`, `index.php` (rutas reales y middleware de auth), `middleware/*`, `routes/*`.

### 2.2 Hallazgos que contradicen el plan maestro (ya confirmados en el PHP)
1. **Formato de respuesta**: el PHP devuelve el payload directo y errores como `{"error": "..."}`. **No** usa `{success, data}`. Las §1.3 y §1.4 del plan maestro deben leerse con este formato (ya implementado en `ApiResponse`).
2. **Login usa `correo`**, no `email`; tabla `usuarios`. Hay que adaptar Sanctum/Auth (modelo `Usuario` con `$table='usuarios'`, `username` = `correo`, hash en columna `password`).
3. **Tabla `usuarios` y `productos` NO están en `schema_completo.sql`**, pero hay FKs hacia ellas. Columnas extra de `usuarios` conocidas: `apellidos, edad, direccion, ciudad, telefono, rol, google_id, email_verificado, token_verificacion, token_expira_en, requiere_cambio_password`. Hay que obtener el esquema real (dump de producción / `run_migration.php` / otros SQL) antes de la migración de `usuarios`.
4. **El PHP sí enumera correos** en recuperar-password (404). Decisión pendiente (PA-001); por defecto, replicar PHP (regla 1: paridad).
5. **Verificación de email por código de 6 dígitos** (`GET /api/auth/verificar-email`) y **flujo de contraseña temporal**: endpoints que el plan maestro no listaba. Agregarlos a la matriz de tests.
6. El **login no usa captcha** en el PHP (solo register y recuperar-password usan captcha). El plan maestro lo pedía en login: seguir el PHP.
7. Sin rate limit en PHP; añadirlo en Laravel es mejora permitida pero documentar en DIFERENCIAS.
8. Existe un **middleware de auth** (`AuthMiddleware::authenticate`) y rutas en `index.php`/`routes/`: leerlos para la matriz definitiva de rutas.
9. `Composer audit` reporta 4 advisories en 1 paquete: revisar con `composer audit`.

## 3. Pasos siguientes (orden estricto, un GATE por fase)

### Paso A — Cerrar Fase 1 (GATE 1)
1. Revisar y arreglar `tests/Pest.php` (quitar dependencias a modelos inexistentes por ahora o crear primero el modelo).
2. Ejecutar `php artisan test` (o `vendor/bin/pest`) en `backend-laravel` → debe pasar `ApiTest` (4 tests existentes). Nota: `ApiTest` usa `Tests\TestCase`; con `Pest.php` en `Feature` aplicando `RefreshDatabase`, comprobar que `/api/db-check` sigue pasando con SQLite.
3. `vendor/bin/pint --test` y `vendor/bin/phpstan analyse` (crear `phpstan.neon` con `includes: vendor/larastan/larastan/extension.neon`, `level: 6`, `paths: [app]`). Corregir hallazgos.
4. Validar el workflow CI (rutas, `working-directory`, que `.env.example` tenga lo necesario, `APP_KEY` para tests ya está en `phpunit.xml`).
5. Completar los 5 docs de `docs/migration/` leyendo todos los controladores (2.1). Rellenar DIFERENCIAS y PREGUNTAS_ABIERTAS.
6. Commit: `chore(migracion): fase 1 - base de tests, CI y documentacion de contrato`. **Detenerse y pedir aprobación del usuario.**

### Paso B — Fase 2: fundamentos transversales
1. Crear las 9 excepciones restantes (un archivo por llamada).
2. `bootstrap/app.php`: `withExceptions()` → JSON uniforme con formato `{"error": ...}` para `api/*` (Validation 422, Authentication 401, Authorization 403, ModelNotFound 404, Throttle 429, `DomainException` con su `httpStatus()`, `Throwable` 500 sin trazas en producción, log con `request_id`).
3. Enums (`app/Enums`): `EstadoPedido` (draft, pendiente_pago, pagado, pendiente, confirmado, en_preparacion, en_camino, entregado, cancelado + `puedePasarA()`; transiciones reales leídas de `PedidoController`), `RolUsuario` (cliente, admin), `RolChat` (user, assistant), `EstadoLead` (nuevo, contactado, convertido, descartado), `TipoPqr`/`EstadoPqr` (leer `PqrsController`).
4. `config/cors.php` con los orígenes del PHP (`plaxtilineas.com`, `www.`, `localhost:4200`, `127.0.0.1:4200`, `FRONTEND_URL`), `supports_credentials=true`, headers `Content-Type, Authorization`.
5. Middleware `EnsureUserIsAdmin` (alias `admin`), `request_id`; rate limiters nombrados.
6. `config/business.php` (`costo_envio=10000`, `iva=0`), `config/services.php` (wompi, cloudinary, gemini, google, catalogo).
7. Tests Feature/Unit de lo anterior. **GATE 2** → commit → aprobación.

### Paso C — Fase 3: esquema, modelos, factories
1. Obtener esquema real de `usuarios`, `productos` y tablas PQRS/leads/pqr_respuestas (buscar en `backend-php/api/database/run_migration.php`, `index.php`, controladores; si no existe, pedir `mysqldump --no-data` al usuario — **pregunta bloqueante**).
2. Una migración por tabla de `schema_completo.sql` + `usuarios`, `productos` (si son locales) + PQRS. Reflejar índices/FKs; en SQLite de tests los ENUM se emulan con string (Laravel lo maneja).
3. Modelos con `$table`, `$fillable`, `casts()`, relaciones, scopes, factories (`Usuario::factory()->admin()/cliente()`), seeders mínimos.
4. Tests Unit de modelos. **GATE 3**.

### Paso D — Fases 4 a 9
Seguir §3 del plan maestro (Auth → Carrito/Catálogo → Pedidos/Wompi → Chat/PQRS/Leads → Componentes/Stats/Config → Hardening/Despliegue), con estas adaptaciones:
- **Auth (F4)**: endpoints reales = captcha, login, register, verificar-email, google, recuperar-password, cambiar-password-temporal, perfil, actualizar, cuenta. Contraseñas bcrypt compatibles. Email vía `Mailable` (plantillas del `EmailService.php`: confirmación PQR, respuesta PQR, password temporal, verificación, confirmación pedido, estado pedido, pago confirmado).
- **Tokens**: Sanctum invalida sesiones PHP (D-002). Decidir con el usuario si se hace guard de transición.
- **Wompi (F6)**: leer `WompiController` completo para fórmulas reales de firma (las de REGLAS_NEGOCIO son provisionales).
- Nada de despliegue/`deploy.yml` hasta F9 y sin aprobación explícita.

## 4. Preguntas para el usuario (resolver pronto)
1. ¿Hay un dump de producción (`--no-data`) o SQL de `usuarios`/`productos`/PQRS? Es bloqueante para la Fase 3.
2. ¿Replicar el 404 de recuperar-password o pasar a no-enumeración? (PA-001)
3. ¿Se acepta que todas las sesiones se invaliden al cambiar a Sanctum, o se construye un guard de transición para tokens HMAC?
4. ¿El catálogo (`productos`) vive en la BD local o en la BD externa `HOSTINGER_DB_*`? (afecta Fase 5)

## 5. Prompt de arranque sugerido para el siguiente modelo

> Lee `PLAN_MIGRACION_LARAVEL_ANTIGRAVITY.md` y `PLAN_CONTINUACION_MIGRACION.md`. Estás en la rama `v2-laravel-nico`, carpeta `backend-laravel`. Ejecuta el **Paso A** (cerrar Fase 1) y detente en el GATE 1 mostrando: resultado de `pest`, `pint --test`, `phpstan`, y los docs corregidos. Respeta los avisos operativos de §0 y no avances sin mi aprobación. Antes de documentar o portar cualquier módulo, lee el PHP real correspondiente.
