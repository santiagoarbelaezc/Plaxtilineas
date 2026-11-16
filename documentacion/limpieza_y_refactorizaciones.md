# Registro de Limpieza Técnica, Refactorizaciones y Optimización

Este documento recopila las intervenciones técnicas de refactorización, depuración y eliminación de deuda técnica realizadas en los repositorios de **Frontend (Angular)** y **Backend (Laravel)** de Plaxtilineas.

---

## 1. Objetivos de las Refactorizaciones

Las tareas de optimización se enfocaron en cuatro pilares fundamentales:
1. **Calidad de Código y Estándares**: Adhesión a PSR-12 y Laravel Pint para PHP, y tipado estricto en TypeScript/PHP con PHPStan/Larastan.
2. **Experiencia de Usuario (UX) y Simplicidad Visual**: Eliminación de elementos obsoletos y sobrecargados en la interfaz para favorecer una navegación clara.
3. **Estabilidad y Resiliencia del Backend**: Corrección de advertencias de nullsafety, prevención de errores 500 y 504 en consultas pesadas de auditoría.
4. **Mantenibilidad a Largo Plazo**: Eliminación de código muerto (*Dead Code*), estilos CSS huérfanos e inyecciones de dependencias innecesarias.

---

## 2. Frontend: Limpieza de Pasarela Wompi en el Dashboard Administrativo

### Contexto y Necesidad:
Originalmente, el dashboard administrativo contaba con controles interactivos para activar/desactivar la pasarela de pagos Wompi tanto en la barra superior (*sticky header*) como en la sección 4 de la vista de inicio del dashboard. Dado que la pasarela ahora opera de forma permanente (24/7 en producción), dichos controles eran redundantes y generaban confusión operativa.

### Archivos Modificados y Refactorizaciones:
- **`frontend/src/app/components/dashboard/dashboard-view/dashboard-view.component.html`**:
  - Removido el pill `.header-wompi-pill` del header.
  - Removida la tarjeta y sección completa `.wompi-full-card` del cuerpo del dashboard.
- **`frontend/src/app/components/dashboard/dashboard-view/dashboard-view.component.ts`**:
  - Eliminadas las propiedades de estado `wompiEnabled` y `mostrarDetallesWompi`.
  - Retirada la inyección del servicio `ConfiguracionService` que solo se empleaba para este toggle.
  - Eliminados los métodos `toggleWompi()`, `setWompiMode()` y `aplicarCambioWompi()`.
- **`frontend/src/app/components/dashboard/dashboard-view/dashboard-view.component.css`**:
  - Eliminación de todas las reglas de estilo asociadas a Wompi (`.wompi-pill`, `.wompi-status`, `.wompi-controls`, animaciones pulse).
  - Corrección de sintaxis CSS eliminando comentarios duplicados que causaban warnings en el compilador de Angular.

---

## 3. Frontend: Rediseño Visual de la Sección "¿Dónde Encontrarnos?" (`long-map`)

### Contexto y Ajuste Comercial:
La sección de ubicación y sede física en la página de inicio requería una simplificación visual profunda para eliminar sobrecarga cognitiva y reflejar los nuevos horarios de atención en la sede Armenia.

### Intervenciones Técnicas:
- **`frontend/src/app/features/dynamic/long-map/long-map.component.html`**:
  - Retiro de tarjetas secundarias de baja relevancia (*03 Muestrarios* y *04 Despachos*).
  - Eliminación completa de la enumeración numérica (`01` y `02`).
  - Actualización precisa del horario:
    - *Lunes a Viernes*: `8:00 AM – 12:00 PM y 2:00 PM – 6:00 PM`
    - *Sábados*: `8:00 AM – 4:00 PM` con insignia `.badge-continua` (*Jornada continua*).
  - Estructuración en dos bloques jerárquicos con iconos SVG en línea (Dirección física y Horario de Atención).
- **`frontend/src/app/features/dynamic/long-map/long-map.component.css`**:
  - Implementación del contenedor `.location-cards-stack` con tarjetas estilo glassmorphism minimalista.
  - Media queries optimizados para visualización móvil (`@media (max-width: 640px)`) con apilamiento vertical y prevención de secuestro de scroll por el iframe del mapa.

---

## 4. Backend: Estandarización de Estilos de Código con Laravel Pint

En el flujo de integración continua (`laravel-ci.yml`), el análisis de estilo ejecutado por `vendor/bin/pint --test` arrojó 8 incidencias de estilo sobre 221 archivos PHP analizados.

### Correcciones Aplicadas:
- **`app/Http/Controllers/Api/AdminAuditoriaController.php`**: Corrección de posicionamiento de llaves (`braces_position`) y formato de líneas simples.
- **`app/Http/Controllers/Api/AdminUserController.php`**: Separación de atributos de clase y constructores (`class_attributes_separation`).
- **`app/Http/Controllers/Api/ConfiguracionController.php`**: Separación de atributos y orden de métodos.
- **`app/Models/AdminAuditoriaLog.php`**: Inserción de salto de línea final estándar (`single_blank_line_at_eof`).
- **`app/Models/AdminSesion.php`**: Espaciado en operadores unarios y operadores lógicos de negación (`unary_operator_spaces`, `not_operator_with_successor_space`).
- **`app/Services/AdminAuditService.php`**: Formateo de operadores de negación y coerción de tipos.
- **`database/migrations/2026_11_10_000001_create_admin_auditoria_tables.php`**: Estandarización de indentación y saltos de línea.
- **`tests/Feature/Admin/AdminAuditoriaTest.php`**: Salto de línea único final (`single_blank_line_at_eof`).

Tras la aplicación de `vendor/bin/pint`, el pipeline de CI pasó a estado 100% verde (Pass).

---

## 5. Backend: Resolución de Tipado Estricto y Nullsafety con Larastan (PHP 8.5)

El análisis estático con Larastan / PHPStan nivel 5 identificó discrepancias en el manejo de tipos e invocaciones de funciones redundantes en el módulo de autenticación y auditoría.

### Errores Diagnosticados y Solucionados:
1. **`app/Http/Controllers/Api/AuthController.php#L431`**:
   - *Diagnóstico*: Llamada a `method_exists()` sobre `Laravel\Sanctum\PersonalAccessToken` para comprobar `'delete'`, la cual siempre evaluaba a `true`.
   - *Corrección*: Invocación directa del método `$token->delete()`, eliminando comprobaciones reflejadas innecesarias.
2. **`app/Http/Controllers/Api/AdminAuditoriaController.php` (Líneas 91, 92, 104, 147, 148, 203, 204, 207, 208)**:
   - *Diagnóstico*: Uso incorrecto de accesos nulosafes (`?->`) en el lado izquierdo del operador null-coalescing (`??`) para propiedades no nulas garantizadas en el modelo `Usuario` (`$user->nombre`, `$user->correo`).
   - *Diagnóstico en Fechas*: Invocación nulosafe `?->toIso8601String()` sobre instancias no-nulas de `Illuminate\Support\Carbon`.
   - *Corrección*: Sustitución de `?->` por el operador de acceso estándar `->`, resolviendo las 10 anotaciones de Larastan y blindando el código contra warnings de PHP 8.5.

---

## 6. Backend: Auditoría Forense, Eliminación de Usuarios y Resiliencia 500/504

### Problemas Detectados en Producción:
- **Ausencia de Registro al Eliminar Usuarios**: Al eliminar un usuario desde el panel administrativo, la operación no se persistía en `admin_auditoria_logs` debido a que el controlador no invocaba explícitamente el servicio de auditoría antes del borrado.
- **Tiempos de Sesión Desincronizados**: Las conexiones y desconexiones no calculaban adecuadamente la duración total acumulada por falta de cierre de sesión explícito.
- **Errores HTTP 500 y 504 Gateway Timeout**: Consultas no paginadas adecuadamente o con subconsultas pesadas bloqueaban el hilo PHP en servidores con recursos ajustados.

### Soluciones Implementadas:
1. **Hook de Auditoría en `AdminUserController`**:
   - Captura de snapshot con el perfil completo del usuario a eliminar antes de ejecutar el borrado en base de datos.
   - Registro en `AdminAuditService::registrarAccion()` con acción `USUARIO_ELIMINADO` e IP del administrador que ejecutó la acción.
2. **Ciclo de Vida de Sesiones (`AdminSesion`)**:
   - Vinculación del middleware `EnsureUserIsAdmin` como heartbeat continuo para actualizar `ultima_actividad`.
   - Cierre automático de sesiones huérfanas mediante comandos de mantenimiento.
3. **Optimización de Queries y Paginación**:
   - Eager loading de relaciones para evitar problemas de N+1 queries.
   - Paginación obligatoria por bloques (`limit=20` por defecto) en el endpoint `/api/admin/auditoria`, mitigando timeouts y errores 500.
