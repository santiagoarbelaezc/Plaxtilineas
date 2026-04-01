# 📊 Guía de SEO para Plaxtilineas

## ✅ Cambios ya realizados

1. **Meta tags mejorados** en `frontend/src/index.html` y `frontend/public/index.html`
   - Título con keywords: "Plaxtilineas - Plásticos, Peletería y Empaques en Armenia, Quindío"
   - Description optimizada con "peletería" incluido
   - Keywords específicas incluyendo "peletería armenia"
   - Open Graph y Twitter Cards configurados

2. **Structured Data (JSON-LD)**
   - LocalBusiness schema con ubicación en Armenia, Quindío
   - BreadcrumbList para mejor navegación

3. **Archivos de configuración creados**
   - `robots.txt` - Para que Google index correctamente
   - `sitemap.xml` - URLs principales
   - `sitemap-productos.xml` - Para productos
   - `.htaccess` mejorado - HTTPS enforcer, redirecciones SEO

## 🚀 Próximos pasos CRÍTICOS

### 1. **Google Search Console (OBLIGATORIO)**
   ```
   1. Ir a: https://search.google.com/search-console/about
   2. Agregar propiedad: https://plaxtilineas.com
   3. Verificar propiedad (via DNS TXT record)
   4. Enviar XML sitemaps:
      - https://plaxtilineas.com/sitemap.xml
      - https://plaxtilineas.com/sitemap-productos.xml
   5. Monitorear en "Performance" para ver búsquedas
   ```

### 2. **Verificación de Google**
   - Copiar el meta tag de Google Search Console al `<head>` del index.html:
   ```html
   <meta name="google-site-verification" content="TU_CODIGO_AQUI">
   ```

### 3. **Google Business Profile (Local)**
   ```
   1. Ir a: https://business.google.com
   2. Crear perfil para "Plaxtilineas Armstrong"
   3. Ubicación: Armenia, Quindío, Colombia
   4. Categorías: Distribuidor de Plásticos
   5. Añadir foto, horario, teléfono, sitio web
   ```

### 4. **Compilar y Desplegar**
   ```bash
   # En la carpeta frontend
   ng build --configuration production
   
   # Desplegar a Firebase Hosting
   firebase deploy --only hosting
   ```

### 5. **Validar Sitemap**
   Visita estas URLs:
   - https://plaxtilineas.com/robots.txt
   - https://plaxtilineas.com/sitemap.xml
   - https://plaxtilineas.com/sitemap-productos.xml

### 6. **Configurar Firebase SEO**
   En `firebase.json` ya está configurado:
   ```json
   "rewrites": [
     { "source": "**", "destination": "/index.html" }
   ]
   ```

## 📱 Optimizaciones recomendadas para cada producto

### En el componente de descripción de producto:
```typescript
// Usar dynamic title y meta tags por producto
import { Meta, Title } from '@angular/platform-browser';

// En ngOnInit al cargar producto:
this.titleService.setTitle(`${producto.nombre} - Plaxtilineas`);
this.metaService.updateTag({
  name: 'description',
  content: `${producto.nombre} - ${producto.descripcion}. Compra en Plaxtilineas, distribuidor en Armenia.`
});
```

## 🔍 Testing de SEO

### Test local:
```bash
# Ver si el sitemap es accesible
curl https://plaxtilineas.com/sitemap.xml

# Ver robots.txt
curl https://plaxtilineas.com/robots.txt
```

### Google Test Tools:
- Mobile-Friendly Test: https://search.google.com/test/mobile-friendly
- Rich Results Test: https://search.google.com/test/rich-results
- Page Speed Insights: https://pagespeed.web.dev

## ⚠️ Errores comunes que impiden indexación

❌ Robots.txt bloqueando Google
❌ Meta robots="noindex"
❌ Sitemap mal formado (XML)
❌ HTTPS no configurado
❌ Falta verificación de dominio
❌ Pobre Mobile Experience
❌ Contenido dinámico no renderizado (SSR needed)

## 💡 Mejoras futuras (Nivel Avanzado)

1. **Server-Side Rendering (SSR)**
   ```bash
   ng add @nguniversal/express-engine
   # Mejora dramáticamente el SEO de SPAs
   ```

2. **Sitemap dinámico (Node.js)**
   - Crear endpoint `/sitemap.xml` que genere dinámicamente todos los productos

3. **Meta tags dinámicos por ruta**
   - Implementar servicio para actualizar meta tags según la página actual

4. **Image Optimization**
   - Usar WebP con fallback
   - Lazy loading en imágenes

5. **Google Analytics 4**
   ```html
   <!-- Añadir GA4 script en index.html -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
   ```

## 📈 Métricas a monitorear

- **Google Search Console**: Impresiones, Clicks, CTR, Posición promedio
- **Google Analytics**: Usuarios, Sesiones, Bounce Rate
- **Page Speed**: Core Web Vitals (LCP, FID, CLS)

---

**Última actualización**: 27/Mar/2026
