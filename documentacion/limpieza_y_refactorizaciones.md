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
