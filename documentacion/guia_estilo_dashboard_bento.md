# Sistema de Diseño Visual — Dashboard Bento Grid & Dark Minimal

Este reporte técnico documenta en detalle el sistema de diseño visual implementado en el Dashboard de **Plaxtilineas**. Diseñado bajo la corriente estética **Dark Minimal + Bento Grid** (inspirada en interfaces de alto rendimiento como *Linear*, *Vercel* y los portales para desarrolladores de *Apple*), este sistema prioriza la jerarquía tipográfica, el contraste neto y la modularidad basada en cuadrículas asimétricas.

---

## 1. Filosofía de Diseño y Principios Rectores

1. **Contraste de Shell Bicolor (Dark Shell + Light Canvas)**:
   - La navegación perimetral (Sidebar) es ultra oscura (`#0a0a0a`), fijando el anclaje visual y eliminando distracciones.
   - El lienzo de trabajo (`Canvas`) es claro y suave (`#f4f5f7`), reduciendo la fatiga visual en sesiones prolongadas de administración.
   - Las tarjetas de datos (`Cards`) son de fondo blanco puro (`#ffffff`) con bordes quirúrgicos de `1.5px` (`#e4e4e7`) y elevaciones sutiles.
2. **Modularidad Bento Grid**:
   - Agrupación de datos en bloques de tamaños variados con radios generosos (`16px` a `18px`).
   - Coexistencia de tarjetas claras para métricas y tarjetas oscuras (*Hero Cards*) para módulos destacados o de bienvenida.
3. **Micro-interacciones y Feedback en Tiempo Real**:
   - Elevación suave en hover (`translateY(-2px)` con sombras difusas).
   - Indicadores de estado activos mediante puntos pulsantes animados (*pulsing status dots*).
   - Transiciones consistentes con curva de aceleración estándar (`cubic-bezier(0.4, 0, 0.2, 1)`).

---

## 2. Tokens de Diseño (CSS Variables)

Copia y pega este bloque de tokens en la raíz `:root` o componente contenedor de tu nuevo proyecto:

```css
:root {
  /* ── Superficies y Fondos ── */
  --dash-dark-surface: #0a0a0a;         /* Sidebar, Hero Cards */
  --dash-dark-surface-2: #141416;       /* Hover en sidebar, tags oscuros */
  --dash-bg-canvas: #f4f5f7;            /* Fondo general de la aplicación */
  --dash-card-bg: #ffffff;              /* Fondo de tarjetas y tablas */

  /* ── Bordes y Separadores ── */
  --dash-dark-border: #1a1a1a;          /* Bordes en superficies oscuras */
  --dash-dark-border-subtle: #27272a;   /* Bordes activos en sidebar */
  --dash-card-border: #e4e4e7;          /* Borde estándar de 1.5px para tarjetas */
  --dash-card-border-alt: #e2e8f0;      /* Separadores internos sutiles */

  /* ── Tipografía y Textos ── */
  --dash-text-dark: #09090b;            /* Títulos, números y texto principal */
  --dash-text-muted: #71717a;           /* Subtítulos, labels y metadatos */
  --dash-text-light: #ffffff;           /* Textos en superficies oscuras */
  --dash-text-subtle: #a1a1aa;          /* Texto secundario en tema oscuro */

  /* ── Colores de Acento y Estados ── */
  --dash-accent-dark: #09090b;          /* Acento principal / Negro de alto impacto */
  --dash-accent-red: #dc2626;           /* Alertas, métricas críticas, badges */
  --dash-accent-red-glow: rgba(220, 38, 38, 0.45);
  --dash-accent-green: #16a34a;         /* Estados exitosos, en línea */
  --dash-accent-green-bg: #dcfce7;
  --dash-accent-amber: #f59e0b;         /* Alertas y advertencias */
  --dash-accent-amber-bg: #fef3c7;

  /* ── Dimensiones y Geometría ── */
  --sidebar-w: 240px;                   /* Ancho expandido */
  --sidebar-w-collapsed: 64px;          /* Ancho colapsado */
  --header-h: 74px;                     /* Altura sticky del header */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 18px;
  --radius-full: 9999px;

  /* ── Animaciones y Curvas ── */
  --transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

---

## 3. Tipografía e Iconografía

### Tipografía Principal: `Inter Tight`
* **Google Fonts Link**:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  ```
* **Jerarquía de Pesos y Tamaños**:
  * **Números KPI**: `font-size: 2.2rem; font-weight: 900; letter-spacing: -0.04em;`
  * **Títulos de Sección / Hero**: `font-size: 2.3rem; font-weight: 800; letter-spacing: -0.04em;`
  * **Títulos de Tarjetas**: `font-size: 1.05rem; font-weight: 800; letter-spacing: -0.02em;`
  * **Labels y Categorías**: `font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;`
  * **Cuerpo de texto**: `font-size: 0.85rem - 0.92rem; font-weight: 500;`

### Iconografía: `Material Symbols Rounded`
* **Iconos redondeados con peso 600**:
  ```html
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,600,0..1,0" />
  ```
* Se renderizan dentro de cajas redondeadas cuadradas de `32x32px` a `38x38px` con bordes sutiles y fondos de contraste.

---

## 4. Arquitectura del Layout (Shell de 2 Columnas)

El layout se compone de una barra lateral colapsable, un encabezado flotante (*sticky*) y un área central de contenido (*Canvas*):

```
┌──────────────┬─────────────────────────────────────────────────────────────┐
│              │ HEADER STICKY (74px, Fondo Blanco, Borde 1.5px)             │
│   SIDEBAR    ├─────────────────────────────────────────────────────────────┤
│   OSCURO     │ CANVAS PRINCIPAL (Fondo #f4f5f7, max-width: 1440px)        │
│  (#0a0a0a)   │                                                             │
│              │ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                     │
│  Colapsable  │ │ KPI 1 │ │ KPI 2 │ │ KPI 3 │ │ KPI 4 │ (4 Col Grid)         │
│  240px/64px  │ └───────┘ └───────┘ └───────┘ └───────┘                     │
│              │                                                             │
│              │ ┌─────────────────────────────────┐ ┌─────────────────────┐ │
│              │ │   BENTO HERO OSCURO (1fr)       │ │ PANEL LATERAL (360px│ │
│              │ │   (Bienvenida / Módulo Clave)   │ │ (Acceso Rápido)     │ │
│              │ └─────────────────────────────────┘ └─────────────────────┘ │
│              │                                                             │
│              │ ┌─────────────────────────────────────────────────────────┐ │
│              │ │ TABLAS Y PANELES BLANCOS (Bordes 1.5px, Radios 16-18px) │ │
│              │ └─────────────────────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 5. Componentes Clave y Snippets HTML/CSS

### A. Tarjetas KPI de Métricas (Stat Cards)
Tarjetas blancas con borde izquierdo grueso de `4px` para color temático y micro-caja de icono.

```html
<div class="stat-card stat-accent-red">
  <div class="stat-card-top">
    <span class="stat-card-label">PEDIDOS PENDIENTES</span>
    <div class="stat-card-icon-box stat-icon-red">
      <span class="material-symbols-rounded">shopping_bag</span>
    </div>
  </div>
  <div class="stat-number">24</div>
  <div class="stat-card-footer">
    <span class="stat-footer-text">Requieren despacho hoy</span>
    <span class="stat-footer-arrow">→</span>
  </div>
</div>
```

```css
.stat-card {
  background: #ffffff;
  border: 1.5px solid var(--dash-card-border);
  border-left: 4px solid #09090b; /* Por defecto negro, configurable */
  border-radius: var(--radius-lg);
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 130px;
  transition: all 0.2s ease;
  cursor: pointer;
}
.stat-card:hover {
  box-shadow: 0 8px 24px rgba(9, 9, 11, 0.06);
  transform: translateY(-2px);
}
.stat-card.stat-accent-red {
  border-left-color: var(--dash-accent-red);
}
.stat-card-icon-box {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: #f4f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dash-text-dark);
}
.stat-card-icon-box.stat-icon-red {
  background: rgba(220, 38, 38, 0.1);
  color: var(--dash-accent-red);
}
.stat-number {
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--dash-text-dark);
  margin: 10px 0 6px 0;
  line-height: 1;
}
```

---

### B. Bento Hero Card (Oscuro con Texto Degradado)
Módulo protagónico con fondo negro puro, badges translúcidos, tipografía con máscara de gradiente y botones de alto contraste.

```html
<div class="bento-welcome">
  <div class="bento-welcome-content">
    <span class="bento-badge">
      <span class="status-dot"></span> EN VIVO
    </span>
    <h2 class="bento-title">
      Panel de Control <span class="bento-title-accent">Operativo</span>
    </h2>
    <p class="bento-desc">
      Supervisa el inventario, atiende solicitudes en tiempo real y gestiona transacciones con sincronización continua.
    </p>
    <button class="btn-primary-white">Explorar Módulo</button>
  </div>
</div>
```

```css
.bento-welcome {
  background: var(--dash-dark-surface);
  border-radius: var(--radius-xl);
  padding: 36px 40px;
  border: 1.5px solid var(--dash-dark-border);
  color: #ffffff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
.bento-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  font-size: 0.74rem;
  font-weight: 700;
  color: #e4e4e7;
}
.bento-title {
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.15;
  margin: 14px 0 8px 0;
}
.bento-title-accent {
  background: linear-gradient(135deg, #ffffff 30%, #a1a1aa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.btn-primary-white {
  background: #ffffff;
  color: #09090b;
  padding: 10px 22px;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-primary-white:hover {
  background: #f4f4f5;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(255, 255, 255, 0.2);
}
```

---

### C. Punto de Estado Animado (Status Dot)
Indicador circular con animación de respiración / pulso para reflejar conexiones o servicios activos.

```css
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dash-accent-green);
  box-shadow: 0 0 8px rgba(22, 163, 74, 0.5);
  animation: pulse-dot 2s infinite ease-in-out;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}
```

---

### D. Input Minimalista y Botón Negro de Acción
Buscador o campo de comando integrado con iconos flotantes y botón CTA negro azabache.

```html
<div class="ai-minimal-form">
  <div class="input-minimal-wrapper">
    <span class="material-symbols-rounded input-icon">search</span>
    <input type="text" class="input-minimal" placeholder="Escribe un comando o busca un registro..." />
  </div>
  <button class="btn-primary-black">Ejecutar</button>
</div>
```

```css
.input-minimal-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}
.input-minimal-wrapper .input-icon {
  position: absolute;
  left: 14px;
  color: #71717a;
  font-size: 20px;
  pointer-events: none;
}
.input-minimal {
  width: 100%;
  padding: 12px 16px 12px 44px;
  background: #f9f9f9;
  border: 1px solid #eeeeee;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;
  font-family: inherit;
  color: var(--dash-text-dark);
}
.input-minimal:focus {
  background: #ffffff;
  border-color: #000000;
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.05);
}
.btn-primary-black {
  background: #000000;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-primary-black:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}
```

---

### E. Tabla de Datos Limpia con Badges Semánticos
Tablas de datos tabulares con encabezados microscópicos en mayúscula y filas con bordes ultra-tenues.

```html
<table class="data-table">
  <thead>
    <tr>
      <th>PRODUCTO / ELEMENTO</th>
      <th>CATEGORÍA</th>
      <th>ESTADO</th>
      <th>VALOR</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Espuma Flexible D26</strong></td>
      <td>Peletería</td>
      <td><span class="status-badge success">Disponible</span></td>
      <td>$145.000</td>
    </tr>
    <tr>
      <td><strong>Malla Polisombra 80%</strong></td>
      <td>Agroindustrial</td>
      <td><span class="status-badge warning">Bajo Stock</span></td>
      <td>$82.500</td>
    </tr>
  </tbody>
</table>
```

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.85rem;
}
.data-table th {
  background: #fcfcfd;
  padding: 12px 16px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--dash-text-muted);
  border-bottom: 1px solid var(--dash-card-border);
}
.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f4f5f7;
  color: var(--dash-text-dark);
}
.status-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
}
.status-badge.success { background: #dcfce7; color: #166534; }
.status-badge.warning { background: #fef3c7; color: #92400e; }
.status-badge.danger  { background: #fee2e2; color: #991b1b; }
```

---

## 6. Pautas de Responsividad

| Breakpoint | Comportamiento del Dashboard |
| :--- | :--- |
| **`> 1200px` (Desktop Amplio)** | Stat Cards en 4 columnas, Bento Grid en `1fr 360px`, Sidebar fijo con toggle flotante. |
| **`768px - 1200px` (Tablets / Laptops)** | Stat Cards en 2 columnas (`repeat(2, 1fr)`), Bento Grid apilado verticalmente en 1 sola columna. |
| **`< 768px` (Móviles)** | Sidebar se oculta (`transform: translateX(-100%)`) y se activa vía menú Drawer con botón hamburguesa. Encabezado en una línea compacta y tarjetas con padding reducido a 16px. |

---

## 7. Checklist para Implementarlo en Otro Proyecto

1. [ ] Importar la tipografía **`Inter Tight`** (pesos 500 a 900) y la librería **`Material Symbols Rounded`**.
2. [ ] Copiar las variables CSS del bloque `:root` de este reporte.
3. [ ] Establecer el fondo del `body` en `#f4f5f7` y un contenedor shell con `display: flex`.
4. [ ] Implementar el Sidebar con fondo `#0a0a0a` y ancho de `240px` colapsable a `64px`.
5. [ ] Configurar el header en `position: sticky; top: 0; background: #ffffff; border-bottom: 1.5px solid #e4e4e7; height: 74px;`.
6. [ ] Aplicar bordes `1.5px solid #e4e4e7` y radios de `16px` a todas las tarjetas de contenido.
