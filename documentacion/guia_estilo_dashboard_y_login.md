# Guía de Estilo y Sistema de Diseño — Dashboard Admin & Login (Plaxtilineas)

Este documento recopila los **tokens de diseño, paleta cromática, tipografía, arquitectura de layout, estilos de componentes, animaciones y activos gráficos** utilizados en el **Dashboard Administrativo** y en el **Módulo de Login/Registro** de Plaxtilineas, listo para replicar exactamente en otro proyecto.

---

## 1. Activos Gráficos (Logos Oficiales)

Los logos han sido descargados y organizados en la carpeta `documentacion/logos/`:

| Archivo | Uso Principal | Origen en el Proyecto |
| :--- | :--- | :--- |
| [logo-banner-plaxtilineas.png](file:///c:/Users/Santiago/OneDrive/Escritorio/Repositorios/Plaxtilineas/documentacion/logos/logo-banner-plaxtilineas.png) | **Logo principal para banners** (fondo claro `#ffffff` / `#f4f5f7`, como `historia-banner`) | `https://res.cloudinary.com/dsv1gdgya/image/upload/v1766281904/Logo_fovu78c_djnblz.png` |
| [logo-blanco-invertido.png](file:///c:/Users/Santiago/OneDrive/Escritorio/Repositorios/Plaxtilineas/documentacion/logos/logo-blanco-invertido.png) | **Logo en blanco invertido** para fondos oscuros (`#09090b`) o degradado verde (Sidebar Admin, Hero Login, Overlay de éxito) | `https://res.cloudinary.com/dsv1gdgya/image/upload/v1770388940/logo-invert_ghucfi.png` |
| [isotipo-plaxtilineas.png](file:///c:/Users/Santiago/OneDrive/Escritorio/Repositorios/Plaxtilineas/documentacion/logos/isotipo-plaxtilineas.png) | **Isotipo geométrico** para sidebar colapsado (`22x22px`) y marca de agua (*watermark*) en tarjetas hero | `https://res.cloudinary.com/dsv1gdgya/image/upload/v1795130400/logo-solo_r6tfo7.png` |

> **Nota para marca de agua (Watermark):** En los paneles con degradado verde (`bento-welcome`), el isotipo se posiciona absoluto en la esquina inferior derecha con `opacity: 0.18`, `mix-blend-mode: multiply` y `filter: grayscale(1) brightness(0.32)`.

---

## 2. Sistema de Diseño Base (Tokens Compartidos)

### 2.1 Tipografía e Iconografía
- **Fuente Primaria (Titulares, botones, labels UI, badges, números):** `'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (`--font-primary` / `--font-heading`).
- **Fuente Secundaria (Cuerpo de texto, inputs, descripciones):** `'Mulish', sans-serif` (`--font-secondary`).
- **Iconografía:** Google **Material Symbols Rounded** (`font-weight: 600`, tamaño base `20px`).

### 2.2 Paleta de Marca y Superficies

```css
:root {
  /* Verde Corporativo */
  --brand-green: #379045;
  --brand-green-dark: #2c7337;
  --brand-green-light: #eaf4ec;
  --brand-green-bright: #4ade80;
  --brand-green-soft-text: #86efac;
  --brand-green-mint: #bbf7d0;

  /* Superficies Oscuras (Dark Minimal) */
  --dark-surface: #09090b;
  --dark-surface-2: #141416;
  --dark-input: #121215;
  --dark-tab-bg: #131316;
  --dark-border: #1e1e22;
  --dark-border-subtle: #27272a;
  --dark-border-hover: #3f3f46;

  /* Superficies Claras (Canvas Dashboard) */
  --bg-canvas: #f4f5f7;
  --card-bg: #ffffff;
  --card-border: #e4e4e7;
  --card-border-alt: #e2e8f0;
  --text-dark: #09090b;
  --text-muted: #5e5e5e;

  /* Estados Semánticos */
  --accent-red: #dc2626;
  --danger-soft: #f87171;
  --warning: #f59e0b;
  --success: #10b981;

  /* Curva de Animación Principal */
  --ease-editorial: cubic-bezier(0.22, 1, 0.36, 1);
}
```

### 2.3 Degradado Institucional Hero (Usado en Login Izquierdo y Bento Hero del Admin)

```css
/* Panel Izquierdo Login */
background: linear-gradient(
  104deg,
  #379045 0%,
  #2f7d3b 30%,
  #22582b 58%,
  #162e1a 82%,
  #111513 100%
);

/* Bento Welcome Card (Dashboard Admin) */
background: linear-gradient(
  108deg,
  #379045 0%,
  #2b6e35 30%,
  #1e4724 58%,
  #152819 82%,
  #101311 100%
);
```

---

## 3. Estilo del Dashboard del Administrador

Fuente: [dashboard-view.component.html](file:///c:/Users/Santiago/OneDrive/Escritorio/Repositorios/Plaxtilineas/frontend/src/app/components/dashboard/dashboard-view/dashboard-view.component.html) y [dashboard-view.component.css](file:///c:/Users/Santiago/OneDrive/Escritorio/Repositorios/Plaxtilineas/frontend/src/app/components/dashboard/dashboard-view/dashboard-view.component.css).

### 3.1 Concepto Visual
Arquitectura híbrida **Dark Minimal + Bento Grid sobre Canvas Claro**:
- **Sidebar fijo oscuro (`#09090b`)** que contrasta con un **área de trabajo limpia (`#f4f5f7`)** y **tarjetas blancas (`#ffffff`)** con borde izquierdo de acento verde (`4px solid #379045`).

### 3.2 Estructura del Layout (Shell de 2 Columnas)
- **Sidebar (`.dash-sidebar`):**
  - Ancho expandido: `248px` (`--sidebar-w`). Colapsado: `68px` (`--sidebar-w-collapsed`).
  - Fondo `#09090b`, borde derecho `1px solid #1e1e22`, `padding: 20px 14px`.
  - **Botón colapsar (`.sidebar-toggle`):** círculo `28x28px`, fondo `#18181b`, borde `1.5px solid #2e2e33`, posicionado `top: 22px; right: -14px`.
  - **Cabecera de marca (`.sidebar-brand`):** logo blanco invertido (`height: 40px`) + píldora `ADMIN` (`#86efac` sobre `rgba(55, 144, 69, 0.16)`, borde `rgba(74, 222, 128, 0.3)`). Cuando colapsa muestra caja `38x38px` (`#141416`) con el isotipo.
  - **Ítems de navegación (`.nav-link`):** `border-radius: 12px`, `padding: 10px 14px`, texto `#a1a1aa` (`0.88rem`, `font-weight: 600`).
    - Hover: fondo `#141416`, texto `#ffffff`.
    - Activo: fondo `rgba(55, 144, 69, 0.16)`, borde `1px solid rgba(55, 144, 69, 0.42)`, icono `#4ade80`, sombra `0 4px 14px rgba(0, 0, 0, 0.35)`.
- **Header Sticky (`.dash-header`):**
  - Altura fija `74px`, fondo `#ffffff`, borde inferior `1.5px solid #e4e4e7`, `padding: 0 32px`, `z-index: 100`.
  - Título en `Montserrat 800` (`1.3rem`, `letter-spacing: -0.025em`) y subtítulo en `#5e5e5e` (`0.84rem`).
  - Acciones a la derecha: botones píldora (`border-radius: 12px`, `1.5px solid #e4e4e7`) y botón destacado IA (`.header-mateo-btn`) en `#379045` con sombra `0 6px 16px -6px rgba(55, 144, 69, 0.55)`.
- **Canvas Principal (`.dash-canvas`):**
  - Fondo `#f4f5f7`, `padding: 32px`, contenedor interno `.dash-home-wrapper` con `max-width: 1440px` y `gap: 28px`.

### 3.3 Bloques del Dashboard Home
1. **Stat Cards (`.stat-cards-row`):**
   - Grid `repeat(4, 1fr)`, `gap: 20px` (responsive: `2` columnas en `<= 1200px`, `1` en `<= 768px`).
   - Tarjeta (`.stat-card`): fondo `#ffffff`, borde `1.5px solid #e4e4e7`, acento izquierdo `4px solid #379045`, `border-radius: 16px`, `padding: 22px 24px`, `min-height: 136px`.
   - Hover: `translateY(-3px)` + sombra `0 14px 30px -12px rgba(9, 9, 11, 0.1), 0 4px 12px -4px rgba(55, 144, 69, 0.12)`.
   - Label superior en `Montserrat 800`, `0.72rem`, uppercase, `letter-spacing: 0.08em`.
   - Cifra principal (`.stat-number`): `Montserrat 800`, `2.35rem`, `letter-spacing: -0.035em`.
   - Caja de icono: `36x36px`, `border-radius: 10px`, fondo `#eaf4ec`, icono `#379045`.
2. **Bento Grid Principal (`.bento-grid`):**
   - Grid `1fr 360px`, `gap: 24px` (colapsa a `1fr` en `<= 1200px`).
   - **Izquierda (`.bento-welcome`):** degradado verde-carbón, `border-radius: 18px`, `padding: 32px 38px`, resplandor radial verde inferior izquierdo + isotipo watermark inferior derecho. Badge superior semitransparente (`rgba(10, 14, 11, 0.34)`) con punto verde pulsante (`#4ade80`), título blanco con acento `#bbf7d0` y CTA blanco (`.btn-primary-white`, texto `#1c4424`).
   - **Derecha (`.panel-white-card`):** tarjeta blanca `border-radius: 18px`, lista de accesos rápidos (`.quick-nav-item`) con fondo `#f9fafb`, borde `1.5px solid #e4e4e7`, `border-radius: 12px` y hover verde claro (`#eaf4ec`) con desplazamiento `translateX(3px)`.
3. **Buscador / Centro de Comando y Tablas (`.ai-command-center`, `.data-table`):**
   - Input sobre fondo `#f4f5f7`, borde `1.5px solid #e4e4e7`, `border-radius: 10px`. Focus: fondo `#ffffff`, borde `#379045` y anillo `0 0 0 3px rgba(55, 144, 69, 0.18)`.
   - Botón primario (`.btn-primary-black` estilizado en verde marca `#379045`): `Montserrat 700`, `0.84rem`, uppercase, `letter-spacing: 0.08em`, `border-radius: 8px`.
   - Chips de sugerencia: `border-radius: 8px`, `#f4f5f7`, hover sólido `#379045` con texto blanco.
   - Tabla: cabecera `#fcfcfd`, `0.7rem` uppercase `800`, filas con borde inferior `#f4f5f7`, badges semánticos (`danger`: `#fee2e2`/`#991b1b`, `warning`: `#fef3c7`/`#92400e`, `success`: `#dcfce7`/`#166534`).

### 3.4 Responsividad Dashboard
- `<= 1200px`: Stat cards pasan a 2 columnas; Bento Grid pasa a 1 columna.
- `<= 768px`: Sidebar se transforma en drawer lateral deslizable (`width: 260px`) con backdrop `rgba(0, 0, 0, 0.6)` y `backdrop-filter: blur(2px)`; aparece botón hamburguesa en el header; stat cards a 1 columna.

---

## 4. Estilo del Login y Registro

Fuente: [login-form.component.html](file:///c:/Users/Santiago/OneDrive/Escritorio/Repositorios/Plaxtilineas/frontend/src/app/shared/ui/login-form/login-form.component.html) y [login-form.component.css](file:///c:/Users/Santiago/OneDrive/Escritorio/Repositorios/Plaxtilineas/frontend/src/app/shared/ui/login-form/login-form.component.css).

### 4.1 Concepto Visual
**Full-Screen Split-Screen Dark Minimal (`100dvh`)**:
- **Columna Izquierda (Identidad Editorial):** Degradado institucional verde a carbón, fija sin scroll, con isotipo en marca de agua, resplandor radial, botones de navegación inferior en estilo glass oscuro y CTA blanco.
- **Columna Derecha (Formulario Dark Minimal):** Negro profundo `#09090b` con sutil halo radial verde superior (`radial-gradient(ellipse 85% 45% at 50% 0%, rgba(55, 144, 69, 0.11) 0%, transparent 68%)`), scroll independiente y controles de alto contraste.

### 4.2 Proporciones y Transición Dinámica de Grid
- **Modo Login:** `grid-template-columns: 54% 46%`. Contenedor de formulario `max-width: 500px`.
- **Modo Registro (`.register-mode`):** `grid-template-columns: 48% 52%`, expandiendo el formulario a `max-width: 620px` con un grid de 2 columnas (`.register-grid-form`, `gap: 14px 16px`).
- **Transición fluida:** `transition: grid-template-columns 0.58s cubic-bezier(0.22, 1, 0.36, 1)` y animaciones de entrada direccionales (`panelSlideFromLeft`, `panelSlideFromRight`, `headingReveal`).

### 4.3 Componentes Clave del Login
1. **Panel Izquierdo (`.login-left-panel.bento-welcome`):**
   - Header superior con logo blanco invertido (`height: 52px`) y botón "Regresar" translúcido (`rgba(10, 14, 11, 0.34)`, borde `rgba(255, 255, 255, 0.22)`, `border-radius: 6px`).
   - Titular `Montserrat 800` (`clamp(2.15rem, 3.3vw, 3.45rem)`, `line-height: 1.08`, `letter-spacing: -0.025em`).
   - Píldoras inferiores (`.bento-action-pill`) con `border-radius: 8px` y footer de ubicación con punto pulsante verde (`#4ade80`).
2. **Tabs Segmentadas con Indicador Deslizante (`.segmented-tab-container`):**
   - Contenedor `max-width: 390px`, fondo `#131316`, borde `1.5px solid #27272a`, `border-radius: 12px`, `padding: 5px`.
   - Indicador activo (`.segmented-tab-indicator`): fondo blanco `#ffffff`, `border-radius: 8px`, sombra `0 4px 14px rgba(0, 0, 0, 0.4)`, se desliza con `translateX(100%)` usando `0.42s cubic-bezier(0.22, 1, 0.36, 1)`.
   - Texto inactivo `#a1a1aa`, texto activo `#09090b`.
3. **Inputs Dark Minimal (`.input-minimal`):**
   - Fondo `#121215`, borde `1.5px solid #2c2c32`, `border-radius: 10px`, `padding: 15px 18px`, texto `#ffffff`, placeholder `#6b6b76`.
   - Focus: fondo `#18181c`, borde `#379045`, anillo `0 0 0 3px rgba(55, 144, 69, 0.24)`.
   - Labels en `Montserrat 700`, `0.8rem`, uppercase, `letter-spacing: 0.08em`, color `#d4d4d8`.
4. **Botón Principal de Acción (`.btn-primary-black`):**
   - Verde marca `#379045`, texto blanco, `Montserrat 700`, `0.96rem`, uppercase, `letter-spacing: 0.08em`, `border-radius: 8px`, `padding: 16px 28px`, sombra `0 10px 24px -8px rgba(55, 144, 69, 0.45)`.
   - Hover: `#2c7337`, `translateY(-2px)`.
5. **Dropdowns Oscuros con Buscador y Checkboxes Custom:**
   - Menús desplegables en `#141416` con borde `1.5px solid #27272a` y sombra `0 18px 40px rgba(0, 0, 0, 0.65)`. Opción seleccionada en `#379045`.
   - Checkboxes `18x18px`, `border-radius: 4px`, borde `#3f3f46`, fondo `#141416`; al marcarse pasan a `#379045`.
   - Chips de requisitos de contraseña en `#141416` con borde `#27272a`; icono `#4ade80` y texto blanco cuando cumplen (`.met`).
6. **Pantalla de Éxito Inmersiva (`.success-fullscreen-overlay`):**
   - Overlay completo con animación SVG de check (`drawAuthCircle` + `drawAuthCheck`), logo blanco invertido, barra de progreso animada (`linear-gradient(90deg, #379045 0%, #4ade80 100%)`) y tarjeta con `backdrop-filter: blur(14px)`.

### 4.4 Responsividad Login
- `<= 1120px`: Split pasa a `50% 50%` (o `44% 56%` en registro).
- `<= 960px`: Cambia a columna única (`1fr`), altura `auto` con scroll natural de página, panel izquierdo arriba y formulario debajo.
- `<= 640px`: Formulario de registro y grillas de requisitos pasan a `1fr`.

---

## 5. Checklist Rápido para Replicar en Otro Proyecto

1. **Cargar Google Fonts:** `Montserrat` (weights `600, 700, 800`), `Mulish` (`400, 500, 600, 700`) y `Material Symbols Rounded`.
2. **Copiar los 3 logos** desde `documentacion/logos/` según el fondo donde se usen (`logo-banner-plaxtilineas.png` para fondos claros/banners; `logo-blanco-invertido.png` para dark/verde; `isotipo-plaxtilineas.png` para watermark y sidebar colapsado).
3. **Definir las variables CSS** de la Sección 2.2 en el `:root` global del proyecto destino.
4. **Aplicar la regla de contraste:**
   - **Paneles de datos/operación (Dashboard):** Canvas `#f4f5f7` + Tarjetas `#ffffff` con borde `1.5px solid #e4e4e7` + Sidebar `#09090b`.
   - **Paneles de marca/acceso (Login y Bento Hero):** Degradado `#379045 → #111513` con isotipo en watermark + Formulario `#09090b`.
