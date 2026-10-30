# Plan de Implementación: Migración `backend-php` → `backend-laravel` (Plaxtilineas)

> **Destino:** Antigravity (agente). Ejecutar fase por fase, en orden, sin saltarse los *gates* de cada fase.
> **Rama de trabajo:** `v2-laravel-nico`
> **Objetivo:** Backend Laravel 11 nivel senior, con **paridad funcional** con `backend-php/api`, bien estructurado, con Models, Excepciones propias, buenas prácticas y **tests por cada endpoint**.

---

## 0. Reglas globales para el agente (copiar a `.agent/rules/` o `AGENTS.md` en la raíz del repo)

1. **Paridad antes que mejoras.** El frontend Angular ya consume `backend-php`. Las rutas, métodos HTTP, nombres de campos y el formato de respuesta JSON deben ser **idénticos** salvo que el plan indique lo contrario. Cualquier diferencia se documenta en `docs/migration/DIFERENCIAS.md`.
2. **Leer el código PHP real antes de portar cada módulo.** Los informes de estado son un resumen; la fuente de verdad es `backend-php/api/controllers/*`, `utils/*` y `database/schema_completo.sql`. Si el código contradice este plan, gana el código y se anota la diferencia.
3. **No tocar `backend-php/` ni el workflow de despliegue actual** hasta la Fase 9. Producción sigue en PHP.
4. **Controladores delgados.** Un controlador solo: recibe `FormRequest` → llama a un Action/Service → devuelve un `Resource`. Nada de SQL, lógica de negocio ni `if` de reglas en controladores.
5. **Cada endpoint se entrega con su test** en el mismo commit. Un endpoint sin test no se considera terminado.
6. **Commits pequeños y convencionales** (`feat(pedidos): ...`, `test(auth): ...`), un módulo por PR/rama lógica.
7. **Nada de secretos en el repo.** Todo por `.env` + `config/*.php` (nunca `env()` fuera de `config/`).
8. **Calidad automática obligatoria:** `pint` (estilo), `larastan` nivel 6+ y toda la suite verde antes de cerrar cada fase.
9. **Si hay ambigüedad**, el agente no inventa: lo registra en `docs/migration/PREGUNTAS_ABIERTAS.md` y continúa con la opción más conservadora (la que preserva el comportamiento PHP).

---

## 1. Decisiones de arquitectura

### 1.1 Stack
| Área | Decisión |
| :--- | :--- |
| Framework | Laravel 11, PHP `^8.2` |
| Auth | Sanctum (tokens personales) + `abilities` para roles |
| Tests | **Pest** + `pest-plugin-laravel` (alternativa aceptable: PHPUnit) |
| Análisis estático | Larastan (nivel 6, subir a 8 al final) |
| Estilo | Laravel Pint (preset `laravel`) |
| HTTP externos | `Http` facade (Gemini, Wompi, Cloudinary, Google OAuth, Catálogo) siempre detrás de una **interfaz** |
| Colas | Driver `database` + `schedule:run` por cron de Hostinger (no hay workers persistentes en hosting compartido) |
| Correo | `Mailable` + plantillas Blade (reemplaza `EmailService.php`) |

### 1.2 Estructura de carpetas objetivo
```
app/
├── Actions/                  # Casos de uso de una sola responsabilidad (invocables)
│   ├── Auth/ Pedidos/ Pqrs/ Carrito/ Chat/ ...
├── Services/                 # Lógica reutilizable / integraciones
│   ├── Wompi/  Gemini/  Cloudinary/  Catalogo/  Chat/ChatModerationService.php
├── Contracts/                # Interfaces (PaymentGateway, AiClient, ImageStorage, CatalogClient)
├── DTOs/                     # Objetos de datos inmutables (readonly)
├── Enums/                    # EstadoPedido, TipoPqr, EstadoPqr, EstadoLead, RolUsuario, RolChat
├── Exceptions/
│   ├── Domain/               # DomainException base + excepciones de negocio
│   └── Handler config en bootstrap/app.php (render JSON uniforme)
├── Http/
│   ├── Controllers/Api/
│   ├── Requests/             # FormRequest por endpoint
│   ├── Resources/            # API Resources (formato idéntico al PHP)
│   └── Middleware/           # EnsureUserIsAdmin, TrackVisit, etc.
├── Models/                   # Eloquent con casts, scopes, relaciones
├── Policies/                 # PedidoPolicy, PqrPolicy, UsuarioPolicy...
├── Events/ Listeners/ Mail/ Notifications/ Jobs/
├── Console/Commands/         # LimpiarCarritosExpirados, LiberarStockExpirado
└── Support/                  # ApiResponse, helpers
database/
├── migrations/               # Reflejan schema_completo.sql
├── factories/                # Una por modelo
└── seeders/
tests/
├── Feature/<Modulo>/         # Un archivo por controlador, un test por escenario
├── Unit/                     # Actions, Services, Enums, Helpers
└── Support/Fakes/            # Fakes de pasarela, IA, Cloudinary, Catálogo
```

### 1.3 Contrato de respuesta (compatibilidad con el frontend)
`ResponseHandler.php` define `success` / `error`. Antes de escribir código, el agente debe **extraer el formato exacto** (claves, códigos HTTP, mensajes) y centralizarlo en `App\Support\ApiResponse`. Propuesta base (ajustar al formato real):

```json
// éxito
{ "success": true, "message": "...", "data": { } }
// error
{ "success": false, "message": "...", "errors": { "campo": ["..."] }, "code": "PEDIDO_NO_ENCONTRADO" }
```

### 1.4 Manejo de excepciones
- Jerarquía propia en `app/Exceptions/Domain/`:
  - `DomainException` (abstracta: `httpStatus()`, `errorCode()`, `context()`)
  - `PedidoNoEncontradoException` (404), `StockInsuficienteException` (409), `EstadoPedidoInvalidoException` (422), `FirmaWompiInvalidaException` (401/400), `CredencialesInvalidasException` (401), `CaptchaInvalidoException` (422), `IpBaneadaException` (429/403), `ServicioExternoException` (502), `PqrNoEncontradaException` (404), etc.
- En `bootstrap/app.php` registrar un `withExceptions()` que:
  - Devuelve **siempre JSON** para `api/*` (`shouldRenderJsonWhen`).
  - Mapea `ValidationException`, `AuthenticationException`, `AuthorizationException`, `ModelNotFoundException`, `ThrottleRequestsException`, `DomainException` y `Throwable` al contrato de §1.3.
  - Oculta trazas en producción y registra con contexto (`Log::error` con `request_id`).
- Prohibido `try/catch` genéricos que "traguen" errores en controladores.

### 1.5 Autenticación: punto crítico
- Los tokens actuales son HMAC propios (`TokenHelper.php`); **no son compatibles** con Sanctum. Consecuencia: al hacer el cambio de producción, **todas las sesiones activas se invalidan** y los usuarios deben iniciar sesión de nuevo. Documentarlo y avisar al equipo.
- Las contraseñas usan `password_verify` (Bcrypt) → **compatibles** con `Hash::check` de Laravel. No se requiere reset masivo.
- La tabla de usuarios se llama `usuarios`: el modelo usa `protected $table = 'usuarios'` (no renombrar tablas existentes).
- Roles: mapear el campo de rol actual a `RolUsuario` (enum) y proteger rutas admin con middleware `EnsureUserIsAdmin` + Policies.
- Login con Google: validar el `id_token` con la librería oficial de Google o con `Http` contra el endpoint de verificación, detrás de una interfaz (`GoogleIdentityVerifier`) para poder fakearla.

### 1.6 Base de datos
- Las migraciones deben reproducir `schema_completo.sql` **tal cual** (nombres de tablas y columnas, índices, FKs, enums) para que el frontend y los datos de producción sigan funcionando.
- Orden de trabajo: crear migraciones → levantar BD local limpia con `migrate` → comparar contra el dump de producción (`mysqldump --no-data`) y resolver diferencias.
- **Producción:** no ejecutar `migrate` contra la BD real hasta la Fase 9. Primero un dump restaurado en un entorno de staging.
- Agregar una migración de "baseline" segura (`Schema::hasTable`) solo si se decide reutilizar la BD de producción existente.
- Mantener tablas Laravel (`personal_access_tokens`, `jobs`, `cache`, `failed_jobs`) además de las del negocio.

### 1.7 Tareas programadas (reemplazan lógica "en cada request")
| PHP actual | Laravel |
| :--- | :--- |
| `limpiarCarritosExpirados()` en cada petición a `index.php` | Comando `carritos:limpiar-expirados` en `schedule` (cada hora) |
| Liberación de `stock_reservas` | Comando `stock:liberar-expirado` (cada 5–10 min) |
| Limpieza de captchas vencidos | Comando `captchas:purgar` |
Cron en Hostinger: `* * * * * php /ruta/artisan schedule:run >> /dev/null 2>&1`

---

## 2. Inventario de endpoints y matriz de tests

> **Regla:** cada fila exige un archivo de test Feature. Como mínimo se cubre: ✅ caso feliz, 🔒 sin token (401), 🚫 sin permiso/rol (403) cuando aplique, ❌ validación (422), 🔎 recurso inexistente (404) cuando aplique, y los casos de borde listados.

### 2.1 Auth — `AuthController` → `Auth/*Controller` + Actions
| Endpoint | Auth | Tests mínimos (además de los generales) |
| :--- | :---: | :--- |
| `GET /api/auth/captcha` | No | Devuelve SVG + id; persiste en `captchas` con expiración |
| `POST /api/auth/login` | No | Credenciales correctas/incorrectas; captcha inválido/expirado/reusado; usuario inexistente (mismo mensaje que clave errónea); *rate limit* |
| `POST /api/auth/register` | No | Email duplicado; contraseña débil; captcha; crea usuario con hash |
| `POST /api/auth/google` | No | Token válido (verifier fake) crea/vincula usuario; token inválido → 401 |
| `POST /api/auth/recuperar-password` | No | Email existente e inexistente (misma respuesta, sin enumeración); envía Mailable (`Mail::fake`) |
| `POST /api/auth/cambiar-password-temporal` | No | Token válido/expirado/manipulado; invalida el token tras uso |
| `GET /api/auth/perfil` | Sí | Devuelve solo datos propios; sin campos sensibles |
| `PUT /api/auth/actualizar` | Sí | Actualiza campos permitidos; ignora campos protegidos (rol, email si aplica) |
| `DELETE /api/auth/cuenta` | Sí | Elimina cuenta propia y revoca tokens; comportamiento con pedidos existentes |

### 2.2 Carrito
| Endpoint | Auth | Tests |
| :--- | :---: | :--- |
| `POST /api/carrito/sync` | Sí | Carrito vacío→lleno; reemplazo/merge según PHP; cantidades inválidas (0, negativas); producto inexistente en catálogo; aislamiento entre usuarios |
| Comando `carritos:limpiar-expirados` | — | Test Unit/Feature: borra >24h, conserva recientes |

### 2.3 Pedidos / Checkout
| Endpoint | Auth | Tests |
| :--- | :---: | :--- |
| `POST /api/pedidos/draft` | Sí | Calcula subtotal + IVA + envío (**$10.000 COP**) exactos; crea `pedido_items`; reserva `stock_reservas`; referencia Wompi única; stock insuficiente → 409; precios tomados del catálogo y no del cliente; transacción atómica (rollback si falla algo); idempotencia/reintento |
| `GET /api/pedidos/estado` | Sí/Pública (verificar en PHP) | Referencia válida/ inválida; estados; no filtra pedidos de otros usuarios |
| `GET /api/pedidos/mis-pedidos` | Sí | Solo pedidos propios; orden; paginación si existe |
| `GET /api/pedidos/admin/todos` | Admin | 403 para usuario normal; filtros |
| `PUT /api/pedidos/admin/actualizar-estado/:id` | Admin | Transiciones válidas/ inválidas (`EstadoPedidoInvalidoException`); 404; dispara evento/correo |
| `PUT /api/pedidos/cancelar/:id` | Sí | Solo dueño o admin; libera stock; no cancelar si ya `entregado`; idempotente |

### 2.4 Wompi
| Endpoint | Auth | Tests |
| :--- | :---: | :--- |
| `POST /api/wompi/datos-pago` | Sí | Firma de integridad SHA-256 correcta (vector conocido); monto en centavos; pedido ajeno → 403/404 |
| `POST /api/wompi/webhook` | Pública + firma | Firma válida → pedido `pagado` + correo de confirmación; firma inválida → rechazo sin cambios; evento duplicado (**idempotencia**); estados `DECLINED/VOIDED/ERROR`; referencia desconocida; monto no coincide |
| `GET\|POST /api/wompi/mock-approve` | Solo `local` | Funciona en `local`; **404/403 en `production`** |

### 2.5 Chat (Mateo) y Asistente del Dashboard
| Endpoint | Auth | Tests |
| :--- | :---: | :--- |
| `POST /api/chat` | Sesión/IP | Respuesta normal (Gemini fake con `Http::fake`); persiste `chat_historial`; mensaje con prompt injection → bloqueado y registrado en `chat_moderation_log`; reincidencia → IP en `chat_session_bans`; IP baneada → rechazada; error de Gemini → `ServicioExternoException` (502) |
| `GET /api/chat/historial` | Sesión | Solo la sesión propia; orden cronológico |
| `DELETE /api/chat/limpiar` | Sesión | Borra solo la sesión propia |
| `POST /api/dashboard-assistant` | Admin | 403 a no admin; contexto de métricas; IA fake |
| `ChatModerationService` (Unit) | — | Dataset de frases: groserías, jailbreaks conocidos, falsos positivos (texto legítimo NO bloqueado) |

### 2.6 PQRS
| Endpoint | Auth | Tests |
| :--- | :---: | :--- |
| `POST /api/pqrs` | No | Genera código único; validación por tipo; correo al cliente (`Mail::fake`); anti-spam/throttle |
| `GET /api/pqrs/consulta/:id` | No | Consulta por código; 404; no expone datos internos |
| `GET /api/pqrs` | Admin | Filtros por tipo/estado; 403 |
| `GET /api/pqrs/estadisticas` | Admin | Conteos correctos por tipo y estado |
| `POST /api/pqrs/:id/respuestas` | Admin | Guarda respuesta, cambia estado, envía correo; 404 |

### 2.7 Leads
| Endpoint | Auth | Tests |
| :--- | :---: | :--- |
| `POST /api/leads` | No | Validación de email/nombre; duplicados; throttle |
| `GET /api/leads` | Admin | 403; filtros/paginación |
| `GET /api/leads/stats` | Admin | Métricas de conversión correctas con factories |

### 2.8 Componentes (mini-CMS)
| Endpoint | Auth | Tests |
| :--- | :---: | :--- |
| `GET /api/componentes` | No | Solo activos y ordenados |
| `POST /api/componentes` | Admin | Crea; `clave` única; 422/403 |
| `PUT /api/componentes/:id` | Admin | Actualiza; 404 |
| `DELETE /api/componentes/:id` | Admin | Elimina; 404 |
| `PUT /api/componentes/reordenar` | Admin | Reordena en transacción; IDs inválidos |
| `POST /api/componentes/upload` | Admin | Cloudinary fake; tipo/tamaño de archivo inválido; error remoto → 502 |

### 2.9 Estadísticas, Admin usuarios y Configuración
| Endpoint | Auth | Tests |
| :--- | :---: | :--- |
| `POST /api/stats/track` | No | Registra visita; no falla si datos incompletos; throttle |
| `GET /api/stats/dashboard` | Admin | Agregados correctos por rango de fechas |
| `GET /api/admin/usuarios-detalle` | Admin | Volumen de compras y carritos activos correctos |
| `DELETE /api/admin/usuarios/:id` | Admin | No puede eliminarse a sí mismo (si aplica); 404; efecto sobre pedidos |
| `GET /api/configuraciones` | Pública/Admin (verificar) | Qué claves son públicas |
| `PUT /api/configuraciones` | Admin | Actualiza; valida tipos |

> Si al leer el PHP aparecen endpoints no listados aquí (los informes son un resumen), se agregan a esta matriz y se les aplica la misma regla.

---

## 3. Plan por fases

Cada fase termina con un **GATE**: todo lo indicado debe cumplirse antes de pasar a la siguiente.

### Fase 1 — Línea base y contrato (sin escribir lógica)
**Tareas**
1. `composer install`, `.env` local, `key:generate`, verificar `/api/test`, `/api/health`, `/api/db-check`.
2. Instalar dev-deps: `pestphp/pest`, `pest-plugin-laravel`, `larastan/larastan`, `laravel/pint`.
3. Configurar SQLite en memoria para tests (`phpunit.xml`) y, para pruebas sensibles a MySQL, un perfil opcional con MySQL.
4. **Auditoría del PHP** → generar en `docs/migration/`:
   - `CONTRATO_API.md`: por endpoint → método, ruta, headers, body, respuesta de éxito y de error (con ejemplos reales sacados del código).
   - `REGLAS_NEGOCIO.md`: IVA, envío, transiciones de estado, expiración de reservas/carritos/captchas, reglas de moderación.
   - `VARIABLES_ENTORNO.md`: todas las variables que lee `config.php` (Wompi, Gemini, Cloudinary, SMTP, Google, catálogo, JWT).
   - `DIFERENCIAS.md` y `PREGUNTAS_ABIERTAS.md` (vacíos al inicio).
5. Pipeline de CI para el nuevo backend: `.github/workflows/laravel-ci.yml` (pint --test, larastan, pest). **No** despliega.

**GATE 1:** CI verde con un test de humo; documentos de contrato revisados por el equipo.

### Fase 2 — Fundamentos transversales
1. `ApiResponse`, `DomainException` + jerarquía, renderizado global de excepciones (§1.4).
2. Enums (`EstadoPedido`, `TipoPqr`, `EstadoPqr`, `EstadoLead`, `RolUsuario`, `RolChat`) con métodos de transición (`EstadoPedido::puedePasarA()`).
3. CORS (`config/cors.php`) con orígenes desde `.env` (frontend de producción y local), reemplazando `setCorsHeaders`.
4. Rate limiters nombrados en `AppServiceProvider` (`login`, `register`, `chat`, `pqrs`, `leads`, `track`).
5. Middleware `EnsureUserIsAdmin`, `request_id` para logging, canal de logs diario.
6. Tests: renderizado de cada tipo de excepción, CORS preflight, throttle, middleware admin.

**GATE 2:** Toda excepción en `api/*` devuelve JSON uniforme (probado).

### Fase 3 — Esquema de datos, Models, Factories
1. Una migración por tabla (12 tablas de `schema_completo.sql`), con FKs e índices equivalentes.
2. Modelos: `Usuario`, `Pedido`, `PedidoItem`, `StockReserva`, `Carrito`, `Captcha`, `ChatHistorial`, `ChatModerationLog`, `ChatSessionBan`, `Componente`, `Lead`, `Pqr` (+ respuestas), `EstadisticaVisita`, `Configuracion`.
   - `$fillable` explícito, `casts()` (enums, decimales, fechas, JSON), relaciones tipadas, scopes (`activos`, `expirados`, `delUsuario`), `HasFactory`.
   - Dinero: columnas decimales con cast a `decimal:2`; cálculos con enteros (centavos) o `brick/math`, nunca `float`.
3. Factories + seeders mínimos (admin de desarrollo, configuraciones, componentes demo).
4. Tests Unit de modelos: relaciones, scopes, casts, factories válidas.
5. Verificar paridad: `mysqldump --no-data` de producción vs. BD generada por migraciones → informe de diferencias.

**GATE 3:** `migrate:fresh --seed` funciona en MySQL; informe de paridad de esquema sin diferencias sin justificar.

### Fase 4 — Autenticación y usuarios
Portar §2.1 + `AdminUserController`. Piezas: `LoginAction`, `RegisterAction`, `GoogleLoginAction`, `SolicitarRecuperacionAction`, `CambiarPasswordTemporalAction`, `CaptchaService`, `GoogleIdentityVerifier` (interfaz + impl + fake), `UsuarioResource`, `UsuarioPolicy`, Mailables de recuperación.
**GATE 4:** todos los tests de §2.1 y de usuarios admin en verde; sin enumeración de usuarios; rate limit activo.

### Fase 5 — Carrito y catálogo externo
1. `CatalogClient` (interfaz) + `HttpCatalogClient` (`Http::baseUrl(config('services.catalogo.url'))`, timeout, `retry`, caché corta) + `FakeCatalogClient` para tests.
2. `SincronizarCarritoAction`, comando de limpieza + `schedule`.
**GATE 5:** tests §2.2 verdes; caída del catálogo produce `ServicioExternoException` controlada.

### Fase 6 — Pedidos y Wompi (núcleo crítico)
1. `CrearPedidoDraftAction` dentro de `DB::transaction` con `lockForUpdate` en reservas para evitar sobreventa; precios siempre desde el catálogo.
2. `CalcularTotalesService` (IVA, envío $10.000) con tests de tabla de valores.
3. `PaymentGateway` (interfaz) → `WompiGateway` (firma de integridad, verificación de firma del evento, comparación de montos con `hash_equals`) + `FakeGateway`.
4. `ProcesarWebhookWompiAction` **idempotente** (clave: `wompi_transaction_id`); eventos `PedidoPagado` → listeners (correo de confirmación, consolidar stock).
5. `CancelarPedidoAction`, `ActualizarEstadoPedidoAction` (usa `EstadoPedido::puedePasarA`), comando `stock:liberar-expirado`.
6. `mock-approve` registrado **solo** `if (app()->environment('local'))`.
**GATE 6:** tests §2.3 y §2.4 verdes, incluyendo concurrencia básica (dos drafts compitiendo por el último stock) y webhook duplicado.

### Fase 7 — Chat/IA, PQRS, Leads
1. `AiClient` (interfaz) → `GeminiClient` + fake; `ChatModerationService` portado con su dataset de pruebas; baneo de IP.
2. Dashboard assistant (solo admin, contexto acotado: no enviar datos personales innecesarios a la IA).
3. PQRS: generador de código único, Mailables, estadísticas con queries agregadas.
4. Leads: captación + stats.
**GATE 7:** tests §2.5, §2.6, §2.7 verdes; ninguna llamada real a Gemini en tests (`Http::preventStrayRequests()`).

### Fase 8 — Componentes, Stats, Configuración, Cloudinary
1. `ImageStorage` (interfaz) → `CloudinaryStorage` (firma SHA-1 vía `Http`) + fake; validación de mimetype/tamaño.
2. CRUD y reordenamiento transaccional de componentes; tracking de visitas; configuraciones.
**GATE 8:** tests §2.8 y §2.9 verdes.

### Fase 9 — Endurecimiento, validación con frontend y salida a producción
1. **Calidad:** cobertura ≥ 85 % global y ≥ 95 % en `Actions/Pedidos`, `Services/Wompi`, `Actions/Auth`; Larastan nivel 8; `composer audit` limpio.
2. **Contract tests:** script que compara respuestas PHP vs. Laravel para los mismos requests en staging (campos, tipos, códigos HTTP). Diferencias → `DIFERENCIAS.md`.
3. **Pruebas end-to-end manuales con el frontend Angular** apuntando a staging: registro, login, carrito, checkout con Wompi sandbox, webhook, PQRS, chat, panel admin.
4. **Seguridad:** `APP_DEBUG=false`, `APP_ENV=production`, CORS restringido, headers de seguridad, `.htaccess` ya existente, revisión de `mock-approve`, logs sin datos sensibles.
5. **Despliegue** (staging primero, luego producción):
   - Backup completo de BD y de `public_html/api/`.
   - Subdominio/carpeta de staging con Laravel y BD restaurada desde dump.
   - Actualizar `.github/workflows/deploy.yml`: `composer install --no-dev --optimize-autoloader`, `php artisan config:cache route:cache event:cache`, `migrate --force`, rsync hacia el destino (excluyendo `.env`, `storage/` persistente, `uploads/`).
   - Configurar cron de `schedule:run` en Hostinger.
   - Cambio de producción en ventana de bajo tráfico; **plan de rollback**: mantener `backend-php` desplegado en otra ruta y poder revertir el apuntador en minutos.
   - Reconfigurar la URL del webhook en el panel de Wompi y probar con una transacción real de bajo monto.
6. Retirar `backend-php` solo tras 2 semanas estables.

**GATE 9 (Definition of Done global):** ver §5.

---

## 4. Estándares de calidad por endpoint (checklist de PR)

- [ ] Ruta en `routes/api.php` con nombre, agrupada por middleware (`auth:sanctum`, `admin`, `throttle:*`).
- [ ] `FormRequest` con `rules()`, `messages()` en español y `authorize()` real.
- [ ] Controlador ≤ ~15 líneas por método; inyección por constructor.
- [ ] Lógica en `Action`/`Service` con tipos estrictos (`declare(strict_types=1)`), retornos tipados, sin `array` ambiguos (usar DTOs).
- [ ] Respuesta vía `Resource` con el formato exacto del contrato.
- [ ] Errores de negocio lanzados como excepciones de dominio (nunca `return false`/códigos mágicos).
- [ ] Consultas sin N+1 (`with()`), índices revisados, paginación donde el PHP la tenga.
- [ ] Operaciones multi-tabla dentro de `DB::transaction`.
- [ ] Integraciones externas por interfaz + fake; timeouts y reintentos definidos.
- [ ] Autorización con Policy/Gate (no `if ($user->rol === ...)` suelto).
- [ ] Test Feature con los escenarios de la matriz §2 + Unit del Action/Service.
- [ ] `pint`, `larastan` y `pest` en verde.

### Convenciones de tests
- Nombre: `it('rechaza el login con captcha expirado')` (descriptivo, en español, consistente).
- Patrón AAA (Arrange-Act-Assert), `RefreshDatabase`, factories (nunca fixtures SQL).
- `Http::fake()` + `Http::preventStrayRequests()` globales en `tests/Pest.php`; `Mail::fake()`, `Event::fake()`, `Queue::fake()` donde corresponda.
- `Sanctum::actingAs($user, ['*'])` para autenticar; helper `actingAsAdmin()`.
- Vectores conocidos para firmas (Wompi/Cloudinary) en tests unitarios, no recalcular con el mismo código bajo prueba.
- Prohibido: tests que dependan del orden, del reloj real (usar `Carbon::setTestNow`) o de red.

---

## 5. Definition of Done (migración completa)

1. Todos los endpoints de §2 (y los adicionales descubiertos) implementados y con tests Feature en verde.
2. `docs/migration/DIFERENCIAS.md` revisado y aprobado; frontend Angular funciona sin cambios (o con cambios mínimos documentados).
3. Cobertura y análisis estático según Fase 9; CI obligatorio en PRs.
4. Webhook de Wompi validado con transacción real en producción.
5. Comandos programados corriendo por cron.
6. `README` actualizado: instalación, variables de entorno, comandos de test (`composer test`), despliegue y rollback.
7. Documentación de API (OpenAPI/Scribe) generada desde las rutas.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
| :--- | :--- |
| Invalidación de sesiones por cambio Sanctum vs. HMAC | Comunicar el cambio; ventana de bajo tráfico; (opcional) aceptar temporalmente tokens HMAC antiguos con un guard de transición |
| Diferencias sutiles de formato JSON rompen el frontend | Contract tests PHP vs. Laravel (Fase 9) y `CONTRATO_API.md` |
| Pérdida/duplicado de pagos por webhook | Idempotencia, verificación de firma y de monto, logs de auditoría |
| Sobreventa de stock | Transacciones + `lockForUpdate` + test de concurrencia |
| Hosting compartido sin workers | Colas `database` + `schedule:run`; evitar jobs largos |
| Esquema de producción distinto al de `schema_completo.sql` | Comparar con `mysqldump --no-data` real en Fase 3 |
| Llaves de Wompi/Gemini/Cloudinary expuestas | Solo `.env`, nunca en logs; rotar si hubo exposición |

---

## 7. Prompt de arranque sugerido para Antigravity

> Lee `PLAN_MIGRACION_LARAVEL_ANTIGRAVITY.md` completo. Ejecuta **solo la Fase 1** y detente en el GATE 1 mostrándome los documentos generados en `docs/migration/` y el resultado del CI. No avances a la siguiente fase sin mi aprobación explícita. Antes de portar cualquier módulo, lee el código PHP correspondiente en `backend-php/api/` y respeta las Reglas globales (§0). Cada endpoint se entrega con sus tests.

Para las fases siguientes, usar: *"Aprobada la Fase N. Ejecuta la Fase N+1 siguiendo §3 y §4; al terminar, reporta tests, cobertura y diferencias detectadas."*
